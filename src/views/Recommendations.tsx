import React, { useEffect, useState } from 'react';
import { useApp } from '../App';
import { repo, logActivity, fmtDate, label } from '../lib/data';

const FOUNDER_STATUSES = ['accepted', 'in_progress', 'implemented', 'rejected'];

export function Recommendations() {
    const { me, founders } = useApp();
    const [rows, setRows] = useState<any[]>([]);
    const [responses, setResponses] = useState<any[]>([]);
    const [detail, setDetail] = useState<any | null>(null);
    const [reply, setReply] = useState('');
    const [statusChange, setStatusChange] = useState('');
    const [err, setErr] = useState('');

    const load = () => repo.recommendations.list().then(setRows).catch(e => setErr(e.message));
    useEffect(() => { load(); }, []);
    useEffect(() => { if (detail) { setReply(''); setStatusChange(''); repo.recResponses.list(detail.id).then(setResponses).catch(() => setResponses([])); } }, [detail?.id]);

    const nameOf = (id: string) => founders.find(f => f.id === id)?.full_name || '-';

    const respond = async () => {
        if ((!reply.trim() && !statusChange) || !detail) return;
        setErr('');
        try {
            if (statusChange) await repo.recommendations.update(detail.id, { status: statusChange });
            if (reply.trim() || statusChange) await repo.recResponses.add({ recommendation_id: detail.id, founder_id: me.id, body: reply.trim() || `Status set to ${label(statusChange)}`, status_change: statusChange || null });
            await logActivity(me.id, 'recommendation', detail.id, 'responded', `${me.full_name} responded to recommendation ${detail.rec_code}`);
            setReply(''); setStatusChange('');
            setResponses(await repo.recResponses.list(detail.id));
            await load();
            if (statusChange) setDetail({ ...detail, status: statusChange });
        } catch (e: any) { setErr(e.message); }
    };

    return <>
        <div className="topbar"><div><h1>Mentor Recommendations</h1><p>Recommendations from your business mentor - respond and set status</p></div></div>
        {err && <div className="err">{err}</div>}
        <div className="card">
            {rows.length ? <table><thead><tr><th>Code</th><th>Recommendation</th><th>Priority</th><th>Assigned</th><th>Status</th><th>Date</th></tr></thead><tbody>
                {rows.map(r => <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(detail?.id === r.id ? null : r)}>
                    <td className="mut">{r.rec_code}</td><td>{r.title}</td>
                    <td><span className={`pill pr-${r.priority}`}>{label(r.priority)}</span></td>
                    <td>{r.assigned_founder ? nameOf(r.assigned_founder) : 'All'}</td>
                    <td><span className={`pill p-${r.status}`}>{label(r.status)}</span></td>
                    <td className="mut">{fmtDate(r.created_at)}</td>
                </tr>)}
            </tbody></table> : <div className="empty">No recommendations from your mentor yet.</div>}
        </div>
        {detail && <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 14, marginBottom: 4 }}>{detail.rec_code} - {detail.title}</h3>
            <div className="mut small" style={{ marginBottom: 8 }}>{label(detail.status)}{detail.department ? ` - ${detail.department}` : ''}</div>
            {detail.description && <p className="small" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{detail.description}</p>}
            {detail.supporting_docs && <div className="small mut" style={{ marginBottom: 8 }}>Supporting: {detail.supporting_docs}</div>}
            <h4 style={{ fontSize: 13, marginBottom: 6 }}>Discussion</h4>
            {responses.length ? responses.map(rp => <div key={rp.id} className="small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <div>{rp.body}</div>
                <div className="mut small">{rp.mentor_id ? 'Mentor' : nameOf(rp.founder_id)}{rp.status_change ? ` - set status to ${label(rp.status_change)}` : ''} - {fmtDate(rp.created_at)}</div>
            </div>) : <div className="mut small" style={{ marginBottom: 6 }}>No responses yet.</div>}
            <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Respond to the mentor..." style={{ flex: 1, minWidth: 200 }} />
                <select value={statusChange} onChange={e => setStatusChange(e.target.value)} style={{ maxWidth: 170 }}>
                    <option value="">Keep status</option>
                    {FOUNDER_STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
                </select>
                <button className="btn sm" onClick={respond}>Send</button>
            </div>
        </div>}
    </>;
}
