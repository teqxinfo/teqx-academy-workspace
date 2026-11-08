import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import { repo, logActivity, fmtDate, label } from '../lib/data';

const STATUSES = ['not_started', 'learning', 'completed', 'on_hold'];
const empty = { topic: '', category: '', resource_link: '', start_date: '', target_date: '', learning_status: 'not_started', key_learnings: '', practical_applications: '', visibility: 'individual' };

export function Study() {
    const { me, founders } = useApp();
    const [items, setItems] = useState<any[]>([]);
    const [err, setErr] = useState('');
    const [q, setQ] = useState('');
    const [fStatus, setFStatus] = useState('');
    const [form, setForm] = useState<any>(null);
    const [busy, setBusy] = useState(false);

    const load = async () => { try { setItems(await repo.study.list()); } catch (e: any) { setErr(e.message); } };
    useEffect(() => { load(); }, []);

    const nameOf = (id?: string) => founders.find(f => f.id === id)?.full_name || '-';
    const shown = useMemo(() => items.filter(t =>
        (!fStatus || t.learning_status === fStatus) &&
        (!q || (t.topic + ' ' + (t.category || '')).toLowerCase().includes(q.toLowerCase()))
    ), [items, q, fStatus]);

    const save = async () => {
        setBusy(true); setErr('');
        try {
            const row: any = {
                topic: form.topic.trim(), category: form.category || null, resource_link: form.resource_link || null,
                start_date: form.start_date || null, target_date: form.target_date || null,
                learning_status: form.learning_status, key_learnings: form.key_learnings || null,
                practical_applications: form.practical_applications || null, visibility: form.visibility,
                updated_at: new Date().toISOString(),
            };
            if (form.id) { await repo.study.update(form.id, row); await logActivity(me.id, 'study_item', form.id, 'update', `updated study "${row.topic}"`); }
            else { const r = await repo.study.create({ ...row, founder_id: me.id }); await logActivity(me.id, 'study_item', r.id, 'create', `started studying "${row.topic}"`); }
            setForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const remove = async (t: any) => {
        if (!confirm(`Delete study item "${t.topic}"?`)) return;
        await repo.study.remove(t.id); await logActivity(me.id, 'study_item', t.id, 'delete', `deleted study "${t.topic}"`); await load();
    };

    return <>
        <div className="topbar"><div><h1>Study Tracker</h1><p>Personal learning, shared when marked shared</p></div>
            <button className="btn" onClick={() => setForm({ ...empty })}>+ New Study Item</button></div>
        {err && <div className="err">{err}</div>}
        <div className="row" style={{ marginBottom: 14 }}>
            <input className="search" style={{ maxWidth: 280 }} placeholder="Search topics..." value={q} onChange={e => setQ(e.target.value)} />
            <div className="chips" style={{ margin: 0 }}>
                <button className={`chip${!fStatus ? ' on' : ''}`} onClick={() => setFStatus('')}>All</button>
                {STATUSES.map(s => <button key={s} className={`chip${fStatus === s ? ' on' : ''}`} onClick={() => setFStatus(s)}>{label(s)}</button>)}
            </div>
        </div>
        <div className="card">
            {shown.length ? <table><thead><tr><th>ID</th><th>Topic</th><th>Founder</th><th>Target</th><th>Visibility</th><th>Status</th><th></th></tr></thead><tbody>
                {shown.map(t => <tr key={t.id}>
                    <td className="mut">{t.study_code}</td>
                    <td><b>{t.topic}</b>{t.category && <div className="mut small">{t.category}</div>}
                        {t.key_learnings && <div className="mut small">Learned: {t.key_learnings.slice(0, 80)}{t.key_learnings.length > 80 ? '...' : ''}</div>}</td>
                    <td>{nameOf(t.founder_id)}</td>
                    <td>{fmtDate(t.target_date)}</td>
                    <td><span className={`pill p-${t.visibility === 'shared' ? 'shared' : 'restricted'}`}>{label(t.visibility)}</span></td>
                    <td><span className={`pill p-${t.learning_status}`}>{label(t.learning_status)}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                        {t.resource_link && <a className="btn ghost sm" href={t.resource_link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', marginRight: 6 }}>Open</a>}
                        <button className="btn ghost sm" onClick={() => setForm({ ...t })}>Edit</button>{' '}
                        <button className="btn danger sm" onClick={() => remove(t)}>Delete</button>
                    </td>
                </tr>)}
            </tbody></table> : <div className="empty">No study items yet.</div>}
        </div>

        {form && <div className="modal-bg" onClick={() => setForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{form.id ? `Edit ${form.study_code}` : 'New Study Item'}</h2>
            <label>Topic</label><input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="What are you learning?" />
            <div className="field-row">
                <div><label>Category</label><input value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Marketing, Tech" /></div>
                <div><label>Status</label><select value={form.learning_status} onChange={e => setForm({ ...form, learning_status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></div>
            </div>
            <label>Resource link</label><input value={form.resource_link || ''} onChange={e => setForm({ ...form, resource_link: e.target.value })} placeholder="https://..." />
            <div className="field-row">
                <div><label>Start date</label><input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><label>Target date</label><input type="date" value={form.target_date || ''} onChange={e => setForm({ ...form, target_date: e.target.value })} /></div>
            </div>
            <label>Key learnings</label><textarea value={form.key_learnings || ''} onChange={e => setForm({ ...form, key_learnings: e.target.value })} />
            <label>Practical applications</label><textarea value={form.practical_applications || ''} onChange={e => setForm({ ...form, practical_applications: e.target.value })} style={{ minHeight: 50 }} />
            <label>Visibility</label><select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value })}><option value="individual">Only me</option><option value="shared">Shared with founders</option></select>
            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn" disabled={busy || !form.topic.trim()} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}
    </>;
}
