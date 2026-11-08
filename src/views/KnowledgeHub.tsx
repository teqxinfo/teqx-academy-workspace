import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import { repo, logActivity, fmtDate, label } from '../lib/data';

const CATS = ['shared_notes', 'learning_resources', 'research_materials', 'founder_presentations', 'training_materials', 'recorded_sessions', 'shared_documents'];
const DEPTS = ['Marketing & Students', 'Business & Operations', 'Courses & Technology'];
const TABS = ['Knowledge Hub', 'Sharing Schedule'];
const fmtDT = (d?: string) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
const fmtMonth = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '-';

export function KnowledgeHub() {
    const { me, founders } = useApp();
    const [tab, setTab] = useState(TABS[0]);
    const [rows, setRows] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [cat, setCat] = useState('');
    const [q, setQ] = useState('');
    const [form, setForm] = useState<any>(null);
    const [sForm, setSForm] = useState<any>(null);
    const [detail, setDetail] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [comment, setComment] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const nameOf = (id?: string) => founders.find(f => f.id === id)?.full_name || '-';

    const load = async () => {
        try { setRows(await repo.knowledge.list()); } catch (e: any) { setErr(e.message); }
        try { setSessions(await repo.kSessions.list()); } catch {}
    };
    useEffect(() => { load(); }, []);

    const shown = useMemo(() => rows.filter(r =>
        (!cat || r.category === cat) &&
        (!q || [r.title, r.body, r.link].some(v => String(v || '').toLowerCase().includes(q.toLowerCase())))
    ), [rows, cat, q]);

    const save = async () => {
        if (!form.title) { setErr('Title is required.'); return; }
        setBusy(true); setErr('');
        try {
            const row = { category: form.category, title: form.title, body: form.body || null, link: form.link || null };
            if (form.id) { await repo.knowledge.update(form.id, row); await logActivity(me.id, 'knowledge', form.id, 'update', `updated knowledge item ${form.item_code}`); }
            else { const r = await repo.knowledge.create({ ...row, created_by: me.id }); await logActivity(me.id, 'knowledge', r.id, 'create', `shared knowledge: ${row.title}`); }
            setForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const remove = async (r: any) => {
        if (!confirm(`Delete "${r.title}"?`)) return;
        await repo.knowledge.remove(r.id); await logActivity(me.id, 'knowledge', r.id, 'delete', `deleted knowledge item ${r.item_code}`);
        if (detail?.id === r.id) setDetail(null);
        await load();
    };

    const openDetail = async (r: any) => {
        setDetail(r); setComment('');
        try { setComments(await repo.kComments.list(r.id)); } catch { setComments([]); }
    };
    const addComment = async () => {
        if (!comment.trim()) return;
        setBusy(true);
        try {
            await repo.kComments.add({ item_id: detail.id, founder_id: me.id, body: comment.trim() });
            await logActivity(me.id, 'knowledge', detail.id, 'comment', `commented on ${detail.item_code}`);
            setComment(''); setComments(await repo.kComments.list(detail.id));
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const removeComment = async (c: any) => {
        await repo.kComments.remove(c.id); setComments(await repo.kComments.list(detail.id));
    };

    const saveSession = async () => {
        if (!sForm.topic || !sForm.month) { setErr('Topic and month are required.'); return; }
        setBusy(true); setErr('');
        try {
            const month = sForm.month.length === 7 ? `${sForm.month}-01` : sForm.month;
            const row: any = { month, topic: sForm.topic, presenter: sForm.presenter || null, department: sForm.department || null, status: sForm.status || 'planned' };
            if (sForm.id) { await repo.kSessions.update(sForm.id, row); await logActivity(me.id, 'knowledge_session', sForm.id, 'update', `updated session ${sForm.session_code}`); }
            else { const r = await repo.kSessions.create({ ...row, created_by: me.id }); await logActivity(me.id, 'knowledge_session', r.id, 'create', `planned knowledge session: ${row.topic}`); }
            setSForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const removeSession = async (r: any) => {
        if (!confirm(`Delete session "${r.topic}"?`)) return;
        await repo.kSessions.remove(r.id); await logActivity(me.id, 'knowledge_session', r.id, 'delete', `deleted session ${r.session_code}`); await load();
    };

    return <>
        <div className="topbar">
            <div><h1>Knowledge Hub</h1><p>Shared notes, resources and learning across all three departments.</p></div>
            {tab === TABS[0]
                ? <button className="btn" onClick={() => { setErr(''); setForm({ category: CATS[0], title: '', body: '', link: '' }); }}>Share Knowledge</button>
                : <button className="btn" onClick={() => { setErr(''); setSForm({ month: new Date().toISOString().slice(0, 7), topic: '', presenter: '', department: DEPTS[0], status: 'planned' }); }}>Plan Session</button>}
        </div>
        <div className="chips">{TABS.map(t => <button key={t} className={`chip${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>{t}</button>)}</div>
        {err && <div className="err">{err}</div>}

        {tab === TABS[0] && <>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <button className={`chip${!cat ? ' on' : ''}`} onClick={() => setCat('')}>All</button>
                {CATS.map(c => <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(cat === c ? '' : c)}>{label(c)}</button>)}
                <input className="search" style={{ maxWidth: 220, marginLeft: 'auto' }} placeholder="Search knowledge..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            {!shown.length && <div className="empty">Nothing shared yet. Click "Share Knowledge" to add the first item.</div>}
            <div className="grid cards3">
                {shown.map(r => <div key={r.id} className="card hover" onClick={() => openDetail(r)}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="badge">{label(r.category)}</span>
                        <small>{fmtDate(r.created_at)}</small>
                    </div>
                    <h3 style={{ margin: '8px 0 4px' }}>{r.title}</h3>
                    {r.body && <p className="muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.body}</p>}
                    <small className="muted">Shared by {nameOf(r.created_by)}{r.link ? ' · has link' : ''}</small>
                </div>)}
            </div>
        </>}

        {tab === TABS[1] && <>
            {!sessions.length && <div className="empty">No sessions planned. Click "Plan Session" to schedule the monthly knowledge sharing.</div>}
            {!!sessions.length && <div className="card" style={{ padding: 6, overflowX: 'auto' }}><table>
                <thead><tr><th>Month</th><th>Topic</th><th>Presenter</th><th>Department</th><th>Status</th><th></th></tr></thead>
                <tbody>{sessions.map(s => <tr key={s.id}>
                    <td>{fmtMonth(s.month)}</td><td>{s.topic}</td><td>{nameOf(s.presenter)}</td><td>{s.department || '-'}</td>
                    <td><span className={`badge ${s.status}`}>{label(s.status)}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn ghost sm" onClick={() => setSForm({ ...s, month: s.month?.slice(0, 7) })}>Edit</button>{' '}
                        <button className="btn danger sm" onClick={() => removeSession(s)}>Delete</button>
                    </td>
                </tr>)}</tbody>
            </table></div>}
        </>}

        {form && <div className="modal-bg" onClick={() => setForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{form.id ? 'Edit Item' : 'Share Knowledge'}</h2>
            <label>Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATS.map(c => <option key={c} value={c}>{label(c)}</option>)}</select>
            <label>Title</label><input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
            <label>Details</label><textarea value={form.body || ''} onChange={e => setForm({ ...form, body: e.target.value })} />
            <label>Link (optional)</label><input value={form.link || ''} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}

        {sForm && <div className="modal-bg" onClick={() => setSForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{sForm.id ? 'Edit Session' : 'Plan Session'}</h2>
            <label>Month</label><input type="month" value={sForm.month || ''} onChange={e => setSForm({ ...sForm, month: e.target.value })} />
            <label>Topic</label><input value={sForm.topic || ''} onChange={e => setSForm({ ...sForm, topic: e.target.value })} />
            <label>Presenter</label>
            <select value={sForm.presenter || ''} onChange={e => setSForm({ ...sForm, presenter: e.target.value })}>
                <option value="">Select founder</option>{founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
            <label>Department</label>
            <select value={sForm.department || ''} onChange={e => setSForm({ ...sForm, department: e.target.value })}>{DEPTS.map(d => <option key={d} value={d}>{d}</option>)}</select>
            <label>Status</label>
            <select value={sForm.status || 'planned'} onChange={e => setSForm({ ...sForm, status: e.target.value })}>
                <option value="planned">Planned</option><option value="done">Done</option><option value="cancelled">Cancelled</option>
            </select>
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setSForm(null)}>Cancel</button>
                <button className="btn" disabled={busy} onClick={saveSession}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}

        {detail && <div className="modal-bg" onClick={() => setDetail(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="badge">{label(detail.category)}</span>
                <small className="muted">{detail.item_code}</small>
            </div>
            <h2 style={{ margin: '8px 0' }}>{detail.title}</h2>
            <small className="muted">Shared by {nameOf(detail.created_by)} · {fmtDT(detail.created_at)}</small>
            {detail.body && <p style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{detail.body}</p>}
            {detail.link && <p><a href={detail.link} target="_blank" rel="noreferrer">{detail.link}</a></p>}
            <div className="row" style={{ marginTop: 8 }}>
                <button className="btn ghost sm" onClick={() => { setForm({ ...detail }); setDetail(null); }}>Edit</button>
                <button className="btn danger sm" onClick={() => remove(detail)}>Delete</button>
            </div>
            <h3 style={{ marginTop: 18 }}>Discussion ({comments.length})</h3>
            {comments.map(c => <div key={c.id} className="card" style={{ padding: 10, marginBottom: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                    <b style={{ fontSize: 13 }}>{nameOf(c.founder_id)}</b>
                    <span className="row" style={{ gap: 6 }}>
                        <small className="muted">{fmtDT(c.created_at)}</small>
                        {c.founder_id === me.id && <button className="btn danger sm" onClick={() => removeComment(c)}>x</button>}
                    </span>
                </div>
                <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.body}</div>
            </div>)}
            <textarea placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)} />
            <div className="row" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
                <button className="btn sm" disabled={busy || !comment.trim()} onClick={addComment}>Comment</button>
            </div>
        </div></div>}
    </>;
}
