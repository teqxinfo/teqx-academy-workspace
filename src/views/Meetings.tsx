import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import { repo, logActivity, fmtDate, label } from '../lib/data';

const TABS = ['Meetings', 'Decision Register'];
const fmtDT = (d?: string) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

function MeetingForm({ form, setForm, founders }: any) {
    const toggleP = (id: string) => {
        const cur: string[] = form.participants || [];
        setForm({ ...form, participants: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] });
    };
    return <>
        <label>Meeting title</label><input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
        <div className="field-row">
            <div><label>Date</label><input type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><label>Time</label><input type="time" value={form.time || ''} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
        </div>
        <label>Mode</label><select value={form.mode || 'online'} onChange={e => setForm({ ...form, mode: e.target.value })}><option value="online">Online</option><option value="in_person">In person</option><option value="phone">Phone</option></select>
        <label>Participants</label>
        <div className="row">{founders.map((f: any) => <button key={f.id} type="button" className={`chip${(form.participants || []).includes(f.id) ? ' on' : ''}`} onClick={() => toggleP(f.id)}>{f.full_name}</button>)}</div>
        <label>Agenda</label><textarea value={form.agenda || ''} onChange={e => setForm({ ...form, agenda: e.target.value })} />
        <label>Status</label><select value={form.status || 'scheduled'} onChange={e => setForm({ ...form, status: e.target.value })}><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
    </>;
}

export function Meetings() {
    const { me, founders } = useApp();
    const [tab, setTab] = useState('Meetings');
    const [rows, setRows] = useState<any[]>([]);
    const [decisions, setDecisions] = useState<any[]>([]);
    const [acks, setAcks] = useState<any[]>([]);
    const [form, setForm] = useState<any>(null);
    const [detail, setDetail] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({ action: '', assigned_to: '', deadline: '' });
    const [notes, setNotes] = useState('');
    const [dForm, setDForm] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const nameOf = (id?: string) => founders.find(f => f.id === id)?.full_name || '-';

    const load = async () => {
        try { setRows(await repo.meetings.list()); } catch (e: any) { setErr(e.message); }
        try { setDecisions(await repo.decisions.list()); } catch {}
        try { setAcks(await repo.acks.list()); } catch {}
    };
    useEffect(() => { load(); }, []);

    const upcoming = useMemo(() => rows.filter(r => r.status === 'scheduled' && new Date(r.scheduled_at) >= new Date(Date.now() - 86400000)), [rows]);
    const past = useMemo(() => rows.filter(r => !upcoming.includes(r)), [rows, upcoming]);

    const openForm = (r?: any) => {
        if (r) {
            const dt = new Date(r.scheduled_at);
            setForm({ ...r, date: dt.toISOString().slice(0, 10), time: dt.toTimeString().slice(0, 5) });
        } else setForm({ title: '', date: '', time: '', mode: 'online', participants: founders.map((f: any) => f.id), agenda: '', status: 'scheduled' });
    };
    const saveMeeting = async () => {
        if (!form.title || !form.date) { setErr('Title and date are required.'); return; }
        setBusy(true); setErr('');
        try {
            const scheduled_at = new Date(`${form.date}T${form.time || '10:00'}`).toISOString();
            const row: any = { title: form.title, scheduled_at, mode: form.mode, agenda: form.agenda || null, participants: form.participants || [], status: form.status };
            if (form.id) { await repo.meetings.update(form.id, row); await logActivity(me.id, 'meeting', form.id, 'update', `updated meeting ${form.meeting_code}`); }
            else { const r = await repo.meetings.create({ ...row, created_by: me.id }); await logActivity(me.id, 'meeting', r.id, 'create', `scheduled meeting: ${row.title}`); }
            setForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const removeMeeting = async (r: any) => {
        if (!confirm(`Delete meeting "${r.title}"?`)) return;
        await repo.meetings.remove(r.id); await logActivity(me.id, 'meeting', r.id, 'delete', `deleted meeting ${r.meeting_code}`); setDetail(null); await load();
    };

    const openDetail = async (r: any) => {
        setDetail(r); setNotes(r.discussion_notes || '');
        try { setItems(await repo.actionItems.list(r.id)); } catch { setItems([]); }
    };
    const saveNotes = async () => {
        setBusy(true);
        try { await repo.meetings.update(detail.id, { discussion_notes: notes }); await load(); } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const addItem = async () => {
        if (!newItem.action.trim()) return;
        setBusy(true);
        try {
            await repo.actionItems.add({ meeting_id: detail.id, action: newItem.action.trim(), assigned_to: newItem.assigned_to || null, deadline: newItem.deadline || null, created_by: me.id });
            setNewItem({ action: '', assigned_to: '', deadline: '' }); setItems(await repo.actionItems.list(detail.id));
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const toggleItem = async (it: any) => {
        await repo.actionItems.update(it.id, { status: it.status === 'done' ? 'pending' : 'done' }); setItems(await repo.actionItems.list(detail.id));
    };

    const saveDecision = async () => {
        if (!dForm.title) { setErr('Decision title is required.'); return; }
        setBusy(true); setErr('');
        try {
            const row: any = { title: dForm.title, details: dForm.details || null, decision_date: dForm.decision_date || new Date().toISOString().slice(0, 10), status: dForm.status || 'proposed', responsible_person: dForm.responsible_person || null, meeting_id: dForm.meeting_id || null };
            if (dForm.id) { await repo.decisions.update(dForm.id, row); await logActivity(me.id, 'decision', dForm.id, 'update', `updated decision ${dForm.decision_code}`); }
            else { const r = await repo.decisions.create({ ...row, proposed_by: me.id }); await logActivity(me.id, 'decision', r.id, 'create', `new decision: ${row.title}`); }
            setDForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const toggleAck = async (d: any) => {
        const mine = acks.find(a => a.decision_id === d.id && a.founder_id === me.id);
        if (mine) await repo.acks.remove(d.id, me.id); else await repo.acks.add(d.id, me.id);
        setAcks(await repo.acks.list());
    };

    const meetingCard = (r: any) => <div key={r.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openDetail(r)}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
            <div><b>{r.title}</b> <span className="mut small">{r.meeting_code}</span></div>
            <span className={`pill p-${r.status === 'completed' ? 'completed' : r.status === 'cancelled' ? 'on_hold' : 'in_progress'}`}>{label(r.status)}</span>
        </div>
        <div className="mut small" style={{ marginTop: 4 }}>{fmtDT(r.scheduled_at)} - {label(r.mode)} - {(r.participants || []).map(nameOf).join(', ') || 'All founders'}</div>
        {r.agenda && <div className="small" style={{ marginTop: 6 }}>{r.agenda.slice(0, 120)}{r.agenda.length > 120 ? '...' : ''}</div>}
    </div>;

    return <>
        <div className="topbar"><div><h1>Founder Meetings</h1><p>Meetings, action items and the shared decision register</p></div>
            {tab === 'Meetings' ? <button className="btn" onClick={() => openForm()}>+ Schedule Meeting</button> : <button className="btn" onClick={() => setDForm({ status: 'proposed', decision_date: new Date().toISOString().slice(0, 10) })}>+ Record Decision</button>}</div>
        {err && <div className="err">{err}</div>}
        <div className="chips">{TABS.map(t => <button key={t} className={`chip${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>{t}</button>)}</div>

        {tab === 'Meetings' && <>
            <h3 style={{ fontSize: 14, margin: '4px 0 10px' }}>Upcoming</h3>
            {!upcoming.length && <div className="empty">No upcoming meetings. Schedule one above.</div>}
            {upcoming.map(meetingCard)}
            <h3 style={{ fontSize: 14, margin: '14px 0 10px' }}>Previous meetings</h3>
            {!past.length && <div className="empty">No previous meetings.</div>}
            {past.map(meetingCard)}
        </>}

        {tab === 'Decision Register' && <>
            {!decisions.length && <div className="empty">No decisions recorded yet.</div>}
            {decisions.map(d => {
                const dAcks = acks.filter(a => a.decision_id === d.id);
                const iAcked = dAcks.some(a => a.founder_id === me.id);
                return <div key={d.id} className="card">
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                        <div><b>{d.title}</b> <span className="mut small">{d.decision_code}</span></div>
                        <span className={`pill p-${d.status}`}>{label(d.status)}</span>
                    </div>
                    <div className="mut small" style={{ marginTop: 4 }}>{fmtDate(d.decision_date)} - proposed by {nameOf(d.proposed_by)}{d.responsible_person ? ` - responsible: ${nameOf(d.responsible_person)}` : ''}{d.meeting_id ? ` - from ${rows.find(m => m.id === d.meeting_id)?.meeting_code || 'meeting'}` : ''}</div>
                    {d.details && <div className="small" style={{ marginTop: 6 }}>{d.details}</div>}
                    <div className="row" style={{ marginTop: 8, justifyContent: 'space-between' }}>
                        <span className="small mut">Acknowledged by: {dAcks.length ? dAcks.map(a => nameOf(a.founder_id)).join(', ') : 'nobody yet'} ({dAcks.length}/3)</span>
                        <span>
                            <button className={`btn sm ${iAcked ? 'ghost' : ''}`} onClick={() => toggleAck(d)}>{iAcked ? 'Acknowledged' : 'Acknowledge'}</button>{' '}
                            <button className="btn ghost sm" onClick={() => setDForm({ ...d })}>Edit</button>
                        </span>
                    </div>
                </div>;
            })}
        </>}

        {form && <div className="modal-bg" onClick={() => setForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{form.id ? `Edit ${form.meeting_code}` : 'Schedule Meeting'}</h2>
            <MeetingForm form={form} setForm={setForm} founders={founders} />
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn" disabled={busy} onClick={saveMeeting}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}

        {detail && <div className="modal-bg" onClick={() => setDetail(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{detail.title} <span className="mut small">{detail.meeting_code}</span></h2>
            <div className="mut small">{fmtDT(detail.scheduled_at)} - {label(detail.mode)} - {(detail.participants || []).map(nameOf).join(', ')}</div>
            <label>Discussion notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was discussed?" />
            <div className="row" style={{ marginTop: 6, justifyContent: 'flex-end' }}><button className="btn ghost sm" disabled={busy} onClick={saveNotes}>Save notes</button></div>
            <label>Action items</label>
            {items.map(it => <div key={it.id} className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="small" style={{ textDecoration: it.status === 'done' ? 'line-through' : 'none' }}>{it.action} <span className="mut">- {nameOf(it.assigned_to)}{it.deadline ? ` - due ${fmtDate(it.deadline)}` : ''}</span></span>
                <button className="btn ghost sm" onClick={() => toggleItem(it)}>{it.status === 'done' ? 'Reopen' : 'Done'}</button>
            </div>)}
            <div className="row" style={{ marginTop: 8 }}>
                <input style={{ flex: 2 }} placeholder="New action item..." value={newItem.action} onChange={e => setNewItem({ ...newItem, action: e.target.value })} />
                <select style={{ flex: 1 }} value={newItem.assigned_to} onChange={e => setNewItem({ ...newItem, assigned_to: e.target.value })}><option value="">Assignee</option>{founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}</select>
                <input type="date" style={{ flex: 1 }} value={newItem.deadline} onChange={e => setNewItem({ ...newItem, deadline: e.target.value })} />
                <button className="btn sm" disabled={busy || !newItem.action.trim()} onClick={addItem}>Add</button>
            </div>
            <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
                <button className="btn danger sm" onClick={() => removeMeeting(detail)}>Delete meeting</button>
                <span>
                    <button className="btn ghost sm" onClick={() => { setDetail(null); openForm(detail); }}>Edit details</button>{' '}
                    <button className="btn ghost sm" onClick={() => setDetail(null)}>Close</button>
                </span>
            </div>
        </div></div>}

        {dForm && <div className="modal-bg" onClick={() => setDForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{dForm.id ? `Edit ${dForm.decision_code}` : 'Record Decision'}</h2>
            <label>Decision title</label><input value={dForm.title || ''} onChange={e => setDForm({ ...dForm, title: e.target.value })} />
            <label>Description</label><textarea value={dForm.details || ''} onChange={e => setDForm({ ...dForm, details: e.target.value })} />
            <div className="field-row">
                <div><label>Date</label><input type="date" value={(dForm.decision_date || '').slice(0, 10)} onChange={e => setDForm({ ...dForm, decision_date: e.target.value })} /></div>
                <div><label>Status</label><select value={dForm.status || 'proposed'} onChange={e => setDForm({ ...dForm, status: e.target.value })}><option value="proposed">Proposed</option><option value="decided">Decided</option><option value="implemented">Implemented</option></select></div>
            </div>
            <label>Responsible person</label><select value={dForm.responsible_person || ''} onChange={e => setDForm({ ...dForm, responsible_person: e.target.value })}><option value="">None</option>{founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}</select>
            <label>Related meeting</label><select value={dForm.meeting_id || ''} onChange={e => setDForm({ ...dForm, meeting_id: e.target.value })}><option value="">None</option>{rows.map(m => <option key={m.id} value={m.id}>{m.meeting_code} - {m.title}</option>)}</select>
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setDForm(null)}>Cancel</button>
                <button className="btn" disabled={busy} onClick={saveDecision}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}
    </>;
}
