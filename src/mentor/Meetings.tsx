import React, { useEffect, useState } from 'react';
import { useMentor } from './MentorShell';
import { repo, logMentorActivity, fmtDate, label } from '../lib/data';

const NOTE_TYPES = ['note', 'observation', 'decision', 'action_item'];
const empty = { title: '', scheduled_at: '', mode: 'online', agenda: '', next_review_date: '', participants: [] as string[] };

export function MentorMeetings() {
    const { me, founders } = useMentor();
    const [rows, setRows] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [form, setForm] = useState<any>({ ...empty });
    const [showForm, setShowForm] = useState(false);
    const [detail, setDetail] = useState<any | null>(null);
    const [note, setNote] = useState({ note_type: 'note', body: '', assigned_to: '', deadline: '' });
    const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

    const load = () => repo.mMeetings.list().then(setRows).catch(e => setErr(e.message));
    useEffect(() => { load(); }, []);
    useEffect(() => { if (detail) { setNote({ note_type: 'note', body: '', assigned_to: '', deadline: '' }); repo.mNotes.list(detail.id).then(setNotes).catch(() => setNotes([])); } }, [detail?.id]);

    const nameOf = (id: string) => founders.find(f => f.id === id)?.full_name || '-';
    const fmtDT = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

    const create = async () => {
        setMsg(''); setErr('');
        if (!form.title.trim() || !form.scheduled_at) return setErr('Title and date/time are required');
        try {
            await repo.mMeetings.create({ title: form.title.trim(), scheduled_at: new Date(form.scheduled_at).toISOString(), mode: form.mode, agenda: form.agenda || null, participants: form.participants, next_review_date: form.next_review_date || null, created_by_mentor: me.id });
            await logMentorActivity(me.id, 'meeting_scheduled', 'mentoring_meeting', undefined, `Mentoring meeting scheduled: ${form.title.trim()}`);
            setForm({ ...empty }); setShowForm(false); setMsg('Meeting scheduled - founders can see it now'); await load();
        } catch (e: any) { setErr(e.message); }
    };
    const addNote = async () => {
        if (!note.body.trim() || !detail) return;
        setErr('');
        try {
            await repo.mNotes.add({ meeting_id: detail.id, mentor_id: me.id, note_type: note.note_type, body: note.body.trim(), assigned_to: note.note_type === 'action_item' && note.assigned_to ? note.assigned_to : null, deadline: note.note_type === 'action_item' && note.deadline ? note.deadline : null });
            setNote({ ...note, body: '' }); setNotes(await repo.mNotes.list(detail.id));
        } catch (e: any) { setErr(e.message); }
    };
    const toggleNote = async (n: any) => { await repo.mNotes.update(n.id, { status: n.status === 'done' ? 'pending' : 'done' }); setNotes(await repo.mNotes.list(detail.id)); };
    const removeNote = async (id: string) => { await repo.mNotes.remove(id); setNotes(await repo.mNotes.list(detail.id)); };
    const setStatus = async (m: any, status: string) => { await repo.mMeetings.update(m.id, { status }); setDetail({ ...m, status }); await load(); };
    const saveNotes = async (m: any, discussion_notes: string) => { await repo.mMeetings.update(m.id, { discussion_notes }); setMsg('Discussion notes saved'); };
    const remove = async (id: string) => { await repo.mMeetings.remove(id); setDetail(null); await load(); };

    return <>
        <div className="topbar"><div><h1>Mentoring Meetings</h1><p>Schedule review meetings, keep notes and action items</p></div>
            <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Schedule Meeting'}</button></div>
        {msg && <div className="ok">{msg}</div>}{err && <div className="err">{err}</div>}
        {showForm && <div className="card" style={{ marginBottom: 12 }}>
            <div className="grid cards2">
                <label>Title<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
                <label>Date & time<input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} /></label>
                <label>Mode<select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}><option value="online">Online</option><option value="in_person">In person</option><option value="phone">Phone</option></select></label>
                <label>Next review date<input type="date" value={form.next_review_date} onChange={e => setForm({ ...form, next_review_date: e.target.value })} /></label>
            </div>
            <label>Agenda<textarea rows={2} value={form.agenda} onChange={e => setForm({ ...form, agenda: e.target.value })} /></label>
            <div className="small" style={{ margin: '6px 0' }}>Participants:</div>
            <div className="row" style={{ gap: 14 }}>
                {founders.map(f => <label key={f.id} className="row" style={{ gap: 6 }}><input type="checkbox" style={{ width: 'auto' }} checked={form.participants.includes(f.id)} onChange={e => setForm({ ...form, participants: e.target.checked ? [...form.participants, f.id] : form.participants.filter((x: string) => x !== f.id) })} />{f.full_name}</label>)}
            </div>
            <button className="btn" style={{ marginTop: 8 }} onClick={create}>Schedule</button>
        </div>}
        <div className="card">
            {rows.length ? <table><thead><tr><th>Code</th><th>Meeting</th><th>When</th><th>Mode</th><th>Status</th><th></th></tr></thead><tbody>
                {rows.map(m => <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(detail?.id === m.id ? null : m)}>
                    <td className="mut">{m.meeting_code}</td><td>{m.title}</td>
                    <td>{fmtDT(m.scheduled_at)}</td><td>{label(m.mode)}</td>
                    <td><span className={`pill p-${m.status === 'completed' ? 'completed' : m.status === 'cancelled' ? 'on_hold' : 'to_do'}`}>{label(m.status)}</span></td>
                    <td onClick={e => e.stopPropagation()}><button className="btn ghost sm danger" onClick={() => remove(m.id)}>Delete</button></td>
                </tr>)}
            </tbody></table> : <div className="empty">No mentoring meetings yet - schedule the first review.</div>}
        </div>
        {detail && <div className="card" style={{ marginTop: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 14 }}>{detail.meeting_code} - {detail.title}</h3>
                <div className="row" style={{ gap: 6 }}>
                    {detail.status === 'scheduled' && <><button className="btn ghost sm" onClick={() => setStatus(detail, 'completed')}>Mark completed</button>
                        <button className="btn ghost sm" onClick={() => setStatus(detail, 'cancelled')}>Cancel meeting</button></>}
                </div>
            </div>
            <div className="mut small" style={{ marginBottom: 8 }}>{fmtDT(detail.scheduled_at)} - {label(detail.mode)}{detail.participants?.length ? ` - with ${detail.participants.map(nameOf).join(', ')}` : ''}{detail.next_review_date ? ` - next review ${fmtDate(detail.next_review_date)}` : ''}</div>
            {detail.agenda && <p className="small" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}><b>Agenda:</b> {detail.agenda}</p>}
            <label>Discussion notes<textarea rows={3} defaultValue={detail.discussion_notes || ''} onBlur={e => saveNotes(detail, e.target.value)} placeholder="Key points discussed..." /></label>
            <h4 style={{ fontSize: 13, margin: '12px 0 6px' }}>Notes & Action Items</h4>
            {notes.length ? notes.map(n => <div key={n.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 12, alignItems: 'flex-start' }}>
                {n.note_type === 'action_item' && <input type="checkbox" style={{ width: 'auto', marginTop: 3 }} checked={n.status === 'done'} onChange={() => toggleNote(n)} />}
                <div style={{ flex: 1 }}>
                    <span className={`pill p-${n.note_type === 'action_item' ? 'in_progress' : 'draft'}`} style={{ marginRight: 6 }}>{label(n.note_type)}</span>
                    <span style={{ textDecoration: n.status === 'done' ? 'line-through' : 'none' }}>{n.body}</span>
                    <div className="mut small">{n.assigned_to ? `${nameOf(n.assigned_to)} - ` : ''}{n.deadline ? `due ${fmtDate(n.deadline)} - ` : ''}{n.mentor_id ? 'Mentor' : nameOf(n.founder_id)}</div>
                </div>
                <button className="btn ghost sm danger" onClick={() => removeNote(n.id)}>Delete</button>
            </div>) : <div className="mut small" style={{ marginBottom: 6 }}>No notes yet.</div>}
            <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <select value={note.note_type} onChange={e => setNote({ ...note, note_type: e.target.value })} style={{ maxWidth: 140 }}>{NOTE_TYPES.map(t => <option key={t} value={t}>{label(t)}</option>)}</select>
                <input value={note.body} onChange={e => setNote({ ...note, body: e.target.value })} placeholder="Add a note or action item..." style={{ flex: 1, minWidth: 200 }} />
                {note.note_type === 'action_item' && <>
                    <select value={note.assigned_to} onChange={e => setNote({ ...note, assigned_to: e.target.value })} style={{ maxWidth: 140 }}><option value="">Assignee</option>{founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}</select>
                    <input type="date" value={note.deadline} onChange={e => setNote({ ...note, deadline: e.target.value })} style={{ maxWidth: 150 }} />
                </>}
                <button className="btn sm" onClick={addNote}>Add</button>
            </div>
        </div>}
    </>;
}
