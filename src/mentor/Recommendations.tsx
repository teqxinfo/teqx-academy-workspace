import React, { useEffect, useState } from 'react';
import { useMentor } from './MentorShell';
import { repo, logMentorActivity, fmtDate, label } from '../lib/data';

const STATUSES = ['suggested', 'under_discussion', 'accepted', 'in_progress', 'implemented', 'rejected'];
const empty = { title: '', description: '', department: '', related_project: '', priority: 'medium', assigned_founder: '', supporting_docs: '' };

export function MentorRecommendations() {
    const { me, founders } = useMentor();
    const [rows, setRows] = useState<any[]>([]);
    const [responses, setResponses] = useState<any[]>([]);
    const [form, setForm] = useState<any>({ ...empty });
    const [showForm, setShowForm] = useState(false);
    const [detail, setDetail] = useState<any | null>(null);
    const [reply, setReply] = useState('');
    const [filter, setFilter] = useState('all');
    const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

    const load = () => repo.recommendations.list().then(setRows).catch(e => setErr(e.message));
    useEffect(() => { load(); }, []);
    useEffect(() => { if (detail) { setReply(''); repo.recResponses.list(detail.id).then(setResponses).catch(() => setResponses([])); } }, [detail?.id]);

    const nameOf = (id: string) => founders.find(f => f.id === id)?.full_name || '-';

    const create = async () => {
        setMsg(''); setErr('');
        if (!form.title.trim()) return setErr('Title is required');
        try {
            const r = await repo.recommendations.create({ ...form, title: form.title.trim(), description: form.description || null, department: form.department || null, related_project: form.related_project || null, assigned_founder: form.assigned_founder || null, supporting_docs: form.supporting_docs || null, suggested_by: me.id });
            await logMentorActivity(me.id, 'recommendation_created', 'recommendation', (r as any).id, `Recommendation: ${form.title.trim()}`);
            setForm({ ...empty }); setShowForm(false); setMsg('Recommendation shared with the founders'); await load();
        } catch (e: any) { setErr(e.message); }
    };
    const respond = async () => {
        if (!reply.trim() || !detail) return;
        try {
            await repo.recResponses.add({ recommendation_id: detail.id, mentor_id: me.id, body: reply.trim() });
            setReply(''); setResponses(await repo.recResponses.list(detail.id));
        } catch (e: any) { setErr(e.message); }
    };
    const remove = async (id: string) => { await repo.recommendations.remove(id); setDetail(null); await load(); };

    const shown = rows.filter(r => filter === 'all' || r.status === filter);

    return <>
        <div className="topbar"><div><h1>Recommendations</h1><p>Business recommendations for the founders, with a response thread</p></div>
            <button className="btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ New Recommendation'}</button></div>
        {msg && <div className="ok">{msg}</div>}{err && <div className="err">{err}</div>}
        {showForm && <div className="card" style={{ marginBottom: 12 }}>
            <div className="grid cards2">
                <label>Title<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
                <label>Priority<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{label(p)}</option>)}</select></label>
                <label>Department<select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}><option value="">-</option>{['Marketing & Students', 'Business & Operations', 'Courses & Technology'].map(d => <option key={d} value={d}>{d}</option>)}</select></label>
                <label>Assign to founder<select value={form.assigned_founder} onChange={e => setForm({ ...form, assigned_founder: e.target.value })}><option value="">All founders</option>{founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}</select></label>
                <label>Related project<input value={form.related_project} onChange={e => setForm({ ...form, related_project: e.target.value })} placeholder="Optional" /></label>
                <label>Supporting docs / links<input value={form.supporting_docs} onChange={e => setForm({ ...form, supporting_docs: e.target.value })} placeholder="Optional" /></label>
            </div>
            <label>Description<textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            <button className="btn" style={{ marginTop: 6 }} onClick={create}>Share recommendation</button>
        </div>}
        <div className="chips" style={{ marginBottom: 12 }}>
            {['all', ...STATUSES].map(s => <button key={s} className={`chip${filter === s ? ' on' : ''}`} onClick={() => setFilter(s)}>{s === 'all' ? 'All' : label(s)}</button>)}
        </div>
        <div className="card">
            {shown.length ? <table><thead><tr><th>Code</th><th>Recommendation</th><th>Priority</th><th>Assigned</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>
                {shown.map(r => <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(detail?.id === r.id ? null : r)}>
                    <td className="mut">{r.rec_code}</td><td>{r.title}</td>
                    <td><span className={`pill pr-${r.priority}`}>{label(r.priority)}</span></td>
                    <td>{r.assigned_founder ? nameOf(r.assigned_founder) : 'All'}</td>
                    <td><span className={`pill p-${r.status}`}>{label(r.status)}</span></td>
                    <td className="mut">{fmtDate(r.created_at)}</td>
                    <td onClick={e => e.stopPropagation()}><button className="btn ghost sm danger" onClick={() => remove(r.id)}>Delete</button></td>
                </tr>)}
            </tbody></table> : <div className="empty">No recommendations yet - share the first one.</div>}
        </div>
        {detail && <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 14, marginBottom: 4 }}>{detail.rec_code} - {detail.title}</h3>
            <div className="mut small" style={{ marginBottom: 8 }}>{label(detail.status)}{detail.department ? ` - ${detail.department}` : ''}{detail.related_project ? ` - ${detail.related_project}` : ''}</div>
            {detail.description && <p className="small" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{detail.description}</p>}
            {detail.supporting_docs && <div className="small mut" style={{ marginBottom: 8 }}>Supporting: {detail.supporting_docs}</div>}
            <h4 style={{ fontSize: 13, marginBottom: 6 }}>Discussion</h4>
            {responses.length ? responses.map(rp => <div key={rp.id} className="small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <div>{rp.body}</div>
                <div className="mut small">{rp.founder_id ? nameOf(rp.founder_id) : 'You'}{rp.status_change ? ` - set status to ${label(rp.status_change)}` : ''} - {fmtDate(rp.created_at)}</div>
            </div>) : <div className="mut small" style={{ marginBottom: 6 }}>No responses yet.</div>}
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply to the founders..." style={{ flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') respond(); }} />
                <button className="btn sm" onClick={respond}>Reply</button>
            </div>
        </div>}
    </>;
}
