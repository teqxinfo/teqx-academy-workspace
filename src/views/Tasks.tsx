import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import { repo, logActivity, fmtDate, label } from '../lib/data';

const STATUSES = ['backlog', 'to_do', 'in_progress', 'under_review', 'completed', 'on_hold'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VIEWS = ['kanban', 'list', 'calendar'];
const empty = { title: '', description: '', remarks: '', priority: 'medium', status: 'to_do', progress_pct: 0, assigned_to: '', department: '', deadline: '' };
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function Tasks() {
    const { me, founders } = useApp();
    const [tasks, setTasks] = useState<any[]>([]);
    const [err, setErr] = useState('');
    const [q, setQ] = useState('');
    const [fStatus, setFStatus] = useState('');
    const [fMine, setFMine] = useState(false);
    const [view, setView] = useState('kanban');
    const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
    const [form, setForm] = useState<any>(null);
    const [detail, setDetail] = useState<any>(null);
    const [updates, setUpdates] = useState<any[]>([]);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => { try { setTasks(await repo.tasks.list()); } catch (e: any) { setErr(e.message); } };
    useEffect(() => { load(); }, []);
    useEffect(() => { if (detail) repo.taskUpdates.list(detail.id).then(setUpdates).catch(() => {}); }, [detail?.id]);

    const nameOf = (id?: string) => founders.find(f => f.id === id)?.full_name || '-';
    const shown = useMemo(() => tasks.filter(t =>
        (!fStatus || t.status === fStatus) &&
        (!fMine || t.assigned_to === me.id || t.created_by === me.id) &&
        (!q || (t.title + ' ' + (t.description || '') + ' ' + t.task_code).toLowerCase().includes(q.toLowerCase()))
    ), [tasks, q, fStatus, fMine, me.id]);

    const save = async () => {
        setBusy(true); setErr('');
        try {
            const row: any = {
                title: form.title.trim(), description: form.description || null, remarks: form.remarks || null,
                priority: form.priority, status: form.status, progress_pct: Number(form.progress_pct) || 0,
                assigned_to: form.assigned_to || null, department: form.department || null,
                deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
            };
            if (form.id) {
                const before = tasks.find(t => t.id === form.id);
                await repo.tasks.update(form.id, { ...row, completed_at: row.status === 'completed' ? new Date().toISOString() : null, updated_at: new Date().toISOString() });
                if (before && (before.status !== row.status || before.progress_pct !== row.progress_pct))
                    await repo.taskUpdates.add({ task_id: form.id, founder_id: me.id, status_from: before.status, status_to: row.status, progress_from: before.progress_pct, progress_to: row.progress_pct });
                await logActivity(me.id, 'task', form.id, 'update', `updated task "${row.title}"`);
            } else {
                const t = await repo.tasks.create({ ...row, created_by: me.id });
                await logActivity(me.id, 'task', t.id, 'create', `created task "${row.title}"`);
            }
            setForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const remove = async (t: any) => {
        if (!confirm(`Delete task "${t.title}"?`)) return;
        await repo.tasks.remove(t.id); await logActivity(me.id, 'task', t.id, 'delete', `deleted task "${t.title}"`);
        setDetail(null); await load();
    };
    const setStatus = async (t: any, status: string) => {
        await repo.tasks.update(t.id, { status, progress_pct: status === 'completed' ? 100 : t.progress_pct, completed_at: status === 'completed' ? new Date().toISOString() : null, updated_at: new Date().toISOString() });
        await repo.taskUpdates.add({ task_id: t.id, founder_id: me.id, status_from: t.status, status_to: status });
        await logActivity(me.id, 'task', t.id, 'update', `moved "${t.title}" to ${label(status)}`);
        setDetail({ ...t, status }); await load();
    };
    const addNote = async () => {
        if (!note.trim()) return;
        await repo.taskUpdates.add({ task_id: detail.id, founder_id: me.id, note: note.trim() });
        setNote(''); setUpdates(await repo.taskUpdates.list(detail.id));
    };

    // Calendar data: days of the displayed month, tasks by deadline day
    const cal = useMemo(() => {
        const y = calMonth.getFullYear(), m = calMonth.getMonth();
        const first = new Date(y, m, 1);
        const startOffset = (first.getDay() + 6) % 7; // Monday-first
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const cells: (Date | null)[] = [];
        for (let i = 0; i < startOffset; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
        const byDay: Record<string, any[]> = {};
        for (const t of shown) {
            if (!t.deadline) continue;
            const k = t.deadline.slice(0, 10);
            (byDay[k] = byDay[k] || []).push(t);
        }
        return { cells, byDay };
    }, [calMonth, shown]);
    const todayStr = new Date().toISOString().slice(0, 10);
    const shiftMonth = (n: number) => { const d = new Date(calMonth); d.setMonth(d.getMonth() + n); setCalMonth(d); };

    const overdue = (t: any) => t.deadline && t.deadline.slice(0, 10) < todayStr && t.status !== 'completed';

    return <>
        <div className="topbar"><div><h1>Task Management</h1><p>{tasks.length} tasks - {tasks.filter(t => t.status !== 'completed').length} open</p></div>
            <div className="row">
                <div className="chips" style={{ margin: 0 }}>{VIEWS.map(v => <button key={v} className={`chip${view === v ? ' on' : ''}`} onClick={() => setView(v)}>{label(v)}</button>)}</div>
                <button className="btn" onClick={() => setForm({ ...empty })}>+ New Task</button>
            </div></div>
        {err && <div className="err">{err}</div>}
        <div className="row" style={{ marginBottom: 14 }}>
            <input className="search" style={{ maxWidth: 280 }} placeholder="Search tasks..." value={q} onChange={e => setQ(e.target.value)} />
            <div className="chips" style={{ margin: 0 }}>
                <button className={`chip${!fStatus ? ' on' : ''}`} onClick={() => setFStatus('')}>All</button>
                {STATUSES.map(s => <button key={s} className={`chip${fStatus === s ? ' on' : ''}`} onClick={() => setFStatus(s)}>{label(s)}</button>)}
                <button className={`chip${fMine ? ' on' : ''}`} onClick={() => setFMine(!fMine)}>Mine</button>
            </div>
        </div>

        {view === 'kanban' && <div className="kanban">
            {STATUSES.map(s => <div key={s} className="kcol">
                <h4>{label(s)} ({shown.filter(t => t.status === s).length})</h4>
                {shown.filter(t => t.status === s).map(t => <div key={t.id} className="kcard" onClick={() => setDetail(t)}>
                    <b>{t.title}</b>
                    <div className="row" style={{ marginTop: 6, gap: 6 }}>
                        <span className={`pill p-${t.priority}`}>{label(t.priority)}</span>
                        <span className="mut small">{nameOf(t.assigned_to)}</span>
                    </div>
                    {t.deadline && <div className="small" style={{ marginTop: 5, color: overdue(t) ? 'var(--red)' : 'var(--mut)' }}>{overdue(t) ? 'Overdue: ' : ''}{fmtDate(t.deadline)}</div>}
                </div>)}
            </div>)}
        </div>}

        {view === 'list' && <div className="card">
            {shown.length ? <table><thead><tr><th>ID</th><th>Task</th><th>Priority</th><th>Assigned</th><th>Deadline</th><th>Progress</th><th>Status</th><th></th></tr></thead><tbody>
                {shown.map(t => <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(t)}>
                    <td className="mut">{t.task_code}</td>
                    <td><b>{t.title}</b>{t.department && <div className="mut small">{t.department}</div>}</td>
                    <td><span className={`pill p-${t.priority}`}>{label(t.priority)}</span></td>
                    <td>{nameOf(t.assigned_to)}</td>
                    <td style={{ color: overdue(t) ? 'var(--red)' : 'var(--txt)' }}>{fmtDate(t.deadline)}</td>
                    <td style={{ minWidth: 90 }}><div className="bar"><i style={{ width: `${t.progress_pct}%` }} /></div><span className="mut small">{t.progress_pct}%</span></td>
                    <td><span className={`pill p-${t.status}`}>{label(t.status)}</span></td>
                    <td onClick={e => e.stopPropagation()}><button className="btn ghost sm" onClick={() => setForm({ ...t, assigned_to: t.assigned_to || '', deadline: t.deadline ? t.deadline.slice(0, 10) : '' })}>Edit</button></td>
                </tr>)}
            </tbody></table> : <div className="empty">No tasks match. Create the first one.</div>}
        </div>}

        {view === 'calendar' && <>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <button className="btn ghost sm" onClick={() => shiftMonth(-1)}>&lt; Prev</button>
                <b>{calMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</b>
                <button className="btn ghost sm" onClick={() => shiftMonth(1)}>Next &gt;</button>
            </div>
            <div className="cal">
                {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
                {cal.cells.map((d, i) => {
                    const k = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
                    const dayTasks = d ? (cal.byDay[k] || []) : [];
                    return <div key={i} className={`cal-day${d ? '' : ' off'}${k === todayStr ? ' today' : ''}`}>
                        {d && <div className="cal-num">{d.getDate()}</div>}
                        {dayTasks.map(t => <div key={t.id} className={`cal-task${overdue(t) ? ' late' : ''}`} onClick={() => setDetail(t)} title={t.title}>{t.title}</div>)}
                    </div>;
                })}
            </div>
        </>}

        {form && <div className="modal-bg" onClick={() => setForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{form.id ? `Edit ${form.task_code}` : 'New Task'}</h2>
            <label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" />
            <label>Description</label><textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="field-row">
                <div><label>Priority</label><select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map(p => <option key={p} value={p}>{label(p)}</option>)}</select></div>
                <div><label>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></div>
            </div>
            <div className="field-row">
                <div><label>Assigned to</label><select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}><option value="">Unassigned</option>{founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}</select></div>
                <div><label>Deadline</label><input type="date" value={form.deadline || ''} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
            </div>
            <div className="field-row">
                <div><label>Department</label><input value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Marketing" /></div>
                <div><label>Progress %</label><input type="number" min={0} max={100} value={form.progress_pct} onChange={e => setForm({ ...form, progress_pct: e.target.value })} /></div>
            </div>
            <label>Remarks</label><textarea value={form.remarks || ''} onChange={e => setForm({ ...form, remarks: e.target.value })} style={{ minHeight: 50 }} />
            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn" disabled={busy || !form.title.trim()} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}

        {detail && <div className="modal-bg" onClick={() => setDetail(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{detail.title}</h2>
            <p className="mut small" style={{ margin: '4px 0 12px' }}>{detail.task_code} - created by {nameOf(detail.created_by)}{detail.department ? ` - ${detail.department}` : ''}</p>
            <div className="row" style={{ marginBottom: 12 }}>
                <span className={`pill p-${detail.status}`}>{label(detail.status)}</span>
                <span className={`pill p-${detail.priority}`}>{label(detail.priority)}</span>
                <span className="mut small">Assigned: {nameOf(detail.assigned_to)}</span>
                <span className="mut small">Deadline: {fmtDate(detail.deadline)}</span>
            </div>
            {detail.description && <p className="small" style={{ marginBottom: 10 }}>{detail.description}</p>}
            {detail.remarks && <p className="small mut" style={{ marginBottom: 10 }}>Remarks: {detail.remarks}</p>}
            <div className="bar" style={{ marginBottom: 14 }}><i style={{ width: `${detail.progress_pct}%` }} /></div>
            <label>Move to</label>
            <div className="chips">{STATUSES.map(s => <button key={s} className={`chip${detail.status === s ? ' on' : ''}`} onClick={() => setStatus(detail, s)}>{label(s)}</button>)}</div>
            <label>History & notes</label>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 180, overflow: 'auto', marginBottom: 10 }}>
                {updates.length ? updates.map(u => <div key={u.id} className="mut">
                    <b style={{ color: 'var(--txt)' }}>{nameOf(u.founder_id)}</b>{' '}
                    {u.note ? u.note : `${u.status_from ? `${label(u.status_from)} -> ${label(u.status_to)}` : ''}${u.progress_to != null && u.progress_to !== u.progress_from ? ` (${u.progress_from}% -> ${u.progress_to}%)` : ''}`}
                    <span style={{ float: 'right', fontSize: 10.5 }}>{fmtDate(u.created_at)}</span>
                </div>) : <div className="mut">No updates yet.</div>}
            </div>
            <div className="row"><input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." onKeyDown={e => e.key === 'Enter' && addNote()} /><button className="btn sm" onClick={addNote}>Add</button></div>
            <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
                <button className="btn danger sm" onClick={() => remove(detail)}>Delete task</button>
                <button className="btn ghost" onClick={() => setDetail(null)}>Close</button>
            </div>
        </div></div>}
    </>;
}
