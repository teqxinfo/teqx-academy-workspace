import React, { useEffect, useState } from 'react';
import { useMentor } from './MentorShell';
import { repo, fmtDate, label } from '../lib/data';
import { CommentPanel } from './Comments';

const STATUSES = ['all', 'backlog', 'to_do', 'in_progress', 'under_review', 'completed', 'on_hold'];

export function TaskMonitoring() {
    const { founders } = useMentor();
    const [tasks, setTasks] = useState<any[]>([]);
    const [updates, setUpdates] = useState<any[]>([]);
    const [status, setStatus] = useState('all');
    const [founder, setFounder] = useState('all');
    const [detail, setDetail] = useState<any | null>(null);
    const [err, setErr] = useState('');

    useEffect(() => { repo.tasks.list().then(setTasks).catch(e => setErr(e.message)); }, []);
    useEffect(() => { if (detail) repo.taskUpdates.list(detail.id).then(setUpdates).catch(() => setUpdates([])); }, [detail?.id]);

    const nameOf = (id: string) => founders.find(f => f.id === id)?.full_name || '-';
    const shown = tasks.filter(t => (status === 'all' || t.status === status) && (founder === 'all' || t.assigned_to === founder));

    return <>
        <div className="topbar"><div><h1>Task Monitoring</h1><p>Read-only task oversight - click a row for history and comments</p></div></div>
        {err && <div className="err">{err}</div>}
        <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
            <div className="chips" style={{ margin: 0 }}>
                {STATUSES.map(s => <button key={s} className={`chip${status === s ? ' on' : ''}`} onClick={() => setStatus(s)}>{s === 'all' ? 'All' : label(s)}</button>)}
            </div>
            <select value={founder} onChange={e => setFounder(e.target.value)} style={{ maxWidth: 180 }}>
                <option value="all">All founders</option>
                {founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
        </div>
        <div className="card">
            {shown.length ? <table><thead><tr><th>Code</th><th>Task</th><th>Owner</th><th>Priority</th><th>Status</th><th>Progress</th><th>Deadline</th></tr></thead><tbody>
                {shown.map(t => <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(detail?.id === t.id ? null : t)}>
                    <td className="mut">{t.task_code}</td><td>{t.title}</td><td>{nameOf(t.assigned_to)}</td>
                    <td><span className={`pill pr-${t.priority}`}>{label(t.priority || 'medium')}</span></td>
                    <td><span className={`pill p-${t.status}`}>{label(t.status)}</span></td>
                    <td>{t.progress_pct ?? 0}%</td>
                    <td style={{ color: t.deadline && t.status !== 'completed' && new Date(t.deadline) < new Date() ? 'var(--red)' : 'var(--txt)' }}>{fmtDate(t.deadline)}</td>
                </tr>)}
            </tbody></table> : <div className="empty">No tasks match this filter.</div>}
        </div>
        {detail && <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>{detail.task_code} - {detail.title}</h3>
            {detail.description && <p className="mut small" style={{ marginBottom: 8 }}>{detail.description}</p>}
            <h4 style={{ fontSize: 13, marginBottom: 6 }}>Update History</h4>
            {updates.length ? updates.map(u => <div key={u.id} className="small" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                {u.status_from && u.status_to ? <span>{label(u.status_from)} → {label(u.status_to)} ({u.progress_from ?? 0}% → {u.progress_to ?? 0}%)</span> : <span>{u.note}</span>}
                {u.note && u.status_from ? <div className="mut">{u.note}</div> : null}
                <div className="mut small">{nameOf(u.founder_id)} - {new Date(u.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>
            </div>) : <div className="mut small">No updates recorded.</div>}
            <CommentPanel entityType="task" entityId={detail.id} />
        </div>}
    </>;
}
