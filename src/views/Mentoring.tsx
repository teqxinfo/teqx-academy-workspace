import React, { useEffect, useState } from 'react';
import { useApp } from '../App';
import { repo, fmtDate, label } from '../lib/data';

export function Mentoring() {
    const { founders } = useApp();
    const [rows, setRows] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [detail, setDetail] = useState<any | null>(null);
    const [err, setErr] = useState('');

    useEffect(() => { repo.mMeetings.list().then(setRows).catch(e => setErr(e.message)); }, []);
    useEffect(() => { if (detail) repo.mNotes.list(detail.id).then(setNotes).catch(() => setNotes([])); }, [detail?.id]);

    const nameOf = (id: string) => founders.find(f => f.id === id)?.full_name || '-';
    const fmtDT = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    const toggleNote = async (n: any) => { await repo.mNotes.update(n.id, { status: n.status === 'done' ? 'pending' : 'done' }); setNotes(await repo.mNotes.list(detail.id)); };

    return <>
        <div className="topbar"><div><h1>Mentoring Meetings</h1><p>Meetings with your business mentor - notes, decisions and your action items</p></div></div>
        {err && <div className="err">{err}</div>}
        <div className="card">
            {rows.length ? <table><thead><tr><th>Code</th><th>Meeting</th><th>When</th><th>Mode</th><th>Status</th></tr></thead><tbody>
                {rows.map(m => <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(detail?.id === m.id ? null : m)}>
                    <td className="mut">{m.meeting_code}</td><td>{m.title}</td>
                    <td>{fmtDT(m.scheduled_at)}</td><td>{label(m.mode)}</td>
                    <td><span className={`pill p-${m.status === 'completed' ? 'completed' : m.status === 'cancelled' ? 'on_hold' : 'to_do'}`}>{label(m.status)}</span></td>
                </tr>)}
            </tbody></table> : <div className="empty">No mentoring meetings scheduled yet.</div>}
        </div>
        {detail && <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 14, marginBottom: 4 }}>{detail.meeting_code} - {detail.title}</h3>
            <div className="mut small" style={{ marginBottom: 8 }}>{fmtDT(detail.scheduled_at)} - {label(detail.mode)}{detail.participants?.length ? ` - with ${detail.participants.map(nameOf).join(', ')}` : ''}{detail.next_review_date ? ` - next review ${fmtDate(detail.next_review_date)}` : ''}</div>
            {detail.agenda && <p className="small" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}><b>Agenda:</b> {detail.agenda}</p>}
            {detail.discussion_notes && <p className="small" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}><b>Discussion:</b> {detail.discussion_notes}</p>}
            <h4 style={{ fontSize: 13, margin: '12px 0 6px' }}>Notes & Action Items</h4>
            {notes.length ? notes.map(n => <div key={n.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 12, alignItems: 'flex-start' }}>
                {n.note_type === 'action_item' && <input type="checkbox" style={{ width: 'auto', marginTop: 3 }} checked={n.status === 'done'} onChange={() => toggleNote(n)} />}
                <div style={{ flex: 1 }}>
                    <span className={`pill p-${n.note_type === 'action_item' ? 'in_progress' : 'draft'}`} style={{ marginRight: 6 }}>{label(n.note_type)}</span>
                    <span style={{ textDecoration: n.status === 'done' ? 'line-through' : 'none' }}>{n.body}</span>
                    <div className="mut small">{n.assigned_to ? `${nameOf(n.assigned_to)} - ` : ''}{n.deadline ? `due ${fmtDate(n.deadline)} - ` : ''}{n.mentor_id ? 'Mentor' : nameOf(n.founder_id)}</div>
                </div>
            </div>) : <div className="mut small">No notes recorded.</div>}
        </div>}
    </>;
}
