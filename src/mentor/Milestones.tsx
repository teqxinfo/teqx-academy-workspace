import React, { useEffect, useState } from 'react';
import { useMentor } from './MentorShell';
import { repo, logMentorActivity, fmtDate, label } from '../lib/data';
import { CommentPanel } from './Comments';

const STATUSES = ['not_started', 'in_progress', 'completed', 'delayed', 'on_hold'];

export function MentorMilestones() {
    const { me, founders } = useMentor();
    const [rows, setRows] = useState<any[]>([]);
    const [updates, setUpdates] = useState<any[]>([]);
    const [detail, setDetail] = useState<any | null>(null);
    const [note, setNote] = useState('');
    const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

    const load = () => repo.milestones.list().then(setRows).catch(e => setErr(e.message));
    useEffect(() => { load(); }, []);
    useEffect(() => { if (detail) { setNote(''); repo.mUpdates.list(detail.id).then(setUpdates).catch(() => setUpdates([])); } }, [detail?.id]);

    const nameOf = (id: string) => founders.find(f => f.id === id)?.full_name || '-';
    const done = rows.filter(r => r.status === 'completed').length;
    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + (r.progress_pct || 0), 0) / rows.length) : 0;

    const patch = async (m: any, p: any) => {
        setMsg(''); setErr('');
        try {
            await repo.milestones.update(m.id, p);
            if (p.status !== undefined || p.progress_pct !== undefined) {
                await repo.mUpdates.add({ milestone_id: m.id, mentor_id: me.id, status_from: m.status, status_to: p.status ?? m.status, progress_from: m.progress_pct, progress_to: p.progress_pct ?? m.progress_pct, note: note.trim() || null });
            }
            await logMentorActivity(me.id, 'milestone_updated', 'milestone', m.id, `Milestone ${m.milestone_code}: ${label(p.status ?? m.status)} ${p.progress_pct ?? m.progress_pct}%`);
            setNote(''); setMsg(`${m.milestone_code} updated`);
            await load();
            if (detail?.id === m.id) { setDetail({ ...detail, ...p }); setUpdates(await repo.mUpdates.list(m.id)); }
        } catch (e: any) { setErr(e.message); }
    };

    return <>
        <div className="topbar"><div><h1>Roadmap & Milestones</h1><p>{done}/{rows.length} milestones completed - overall {avg}%</p></div></div>
        {msg && <div className="ok">{msg}</div>}{err && <div className="err">{err}</div>}
        <div className="card" style={{ marginBottom: 12 }}>
            <div className="bar" style={{ height: 10 }}><i style={{ width: `${avg}%` }} /></div>
        </div>
        <div className="card">
            <table><thead><tr><th>Code</th><th>Milestone</th><th>Owner</th><th>Target</th><th>Progress</th><th>Status</th></tr></thead><tbody>
                {rows.map(m => <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(detail?.id === m.id ? null : m)}>
                    <td className="mut">{m.milestone_code}</td><td>{m.name}</td>
                    <td>{m.responsible_founder ? nameOf(m.responsible_founder) : '-'}</td>
                    <td className="mut">{fmtDate(m.target_date)}</td>
                    <td style={{ minWidth: 120 }}><div className="small">{m.progress_pct}%<div className="bar"><i style={{ width: `${m.progress_pct}%` }} /></div></div></td>
                    <td><span className={`pill p-${m.status}`}>{label(m.status)}</span></td>
                </tr>)}
            </tbody></table>
        </div>
        {detail && <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>{detail.milestone_code} - {detail.name}</h3>
            <div className="grid cards2">
                <label>Status<select value={detail.status} onChange={e => patch(detail, { status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
                <label>Progress ({detail.progress_pct}%)<input type="range" min={0} max={100} step={5} value={detail.progress_pct} onChange={e => patch(detail, { progress_pct: Number(e.target.value) })} /></label>
                <label>Responsible founder<select value={detail.responsible_founder || ''} onChange={e => patch(detail, { responsible_founder: e.target.value || null })}><option value="">-</option>{founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}</select></label>
                <label>Target date<input type="date" value={detail.target_date || ''} onChange={e => patch(detail, { target_date: e.target.value || null })} /></label>
            </div>
            <label>Update note (saved with the next status/progress change)<input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note for the history" /></label>
            <h4 style={{ fontSize: 13, margin: '12px 0 6px' }}>Update History</h4>
            {updates.length ? updates.map(u => <div key={u.id} className="small" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{u.status_from && u.status_to && u.status_from !== u.status_to ? `${label(u.status_from)} → ${label(u.status_to)}, ` : ''}{u.progress_from ?? 0}% → {u.progress_to ?? 0}%</span>
                {u.note && <div className="mut">{u.note}</div>}
                <div className="mut small">{u.mentor_id ? 'Mentor' : nameOf(u.founder_id)} - {fmtDate(u.created_at)}</div>
            </div>) : <div className="mut small">No updates yet.</div>}
            <CommentPanel entityType="milestone" entityId={detail.id} />
        </div>}
    </>;
}
