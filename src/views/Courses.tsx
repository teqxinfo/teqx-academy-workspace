import React, { useEffect, useState } from 'react';
import { useApp } from '../App';
import { repo, logActivity, fmtMoney, label } from '../lib/data';

const STATUSES = ['proposed', 'in_development', 'review', 'launched', 'on_hold'];
const MSTATUSES = ['not_started', 'in_progress', 'done'];
const emptyC = { name: '', category: '', duration: '', proposed_fee: '', target_audience: '', syllabus: '', development_status: 'proposed' };
const emptyM = { title: '', description: '', learning_materials: '', practical_projects: '', status: 'not_started' };

export function Courses() {
    const { me } = useApp();
    const [courses, setCourses] = useState<any[]>([]);
    const [err, setErr] = useState('');
    const [open, setOpen] = useState<string>('');
    const [modules, setModules] = useState<any[]>([]);
    const [cForm, setCForm] = useState<any>(null);
    const [mForm, setMForm] = useState<any>(null);
    const [busy, setBusy] = useState(false);

    const load = async () => { try { setCourses(await repo.courses.list()); } catch (e: any) { setErr(e.message); } };
    useEffect(() => { load(); }, []);
    const loadModules = async (cid: string) => { try { setModules(await repo.courseModules.list(cid)); } catch (e: any) { setErr(e.message); } };
    useEffect(() => { if (open) loadModules(open); }, [open]);

    const saveCourse = async () => {
        setBusy(true); setErr('');
        try {
            const row: any = {
                name: cForm.name.trim(), category: cForm.category || null, duration: cForm.duration || null,
                proposed_fee: cForm.proposed_fee === '' || cForm.proposed_fee == null ? null : Number(cForm.proposed_fee),
                target_audience: cForm.target_audience || null, syllabus: cForm.syllabus || null,
                development_status: cForm.development_status, updated_at: new Date().toISOString(),
            };
            if (cForm.id) { await repo.courses.update(cForm.id, row); await logActivity(me.id, 'course', cForm.id, 'update', `updated course "${row.name}"`); }
            else { const r = await repo.courses.create({ ...row, created_by: me.id }); await logActivity(me.id, 'course', r.id, 'create', `proposed course "${row.name}"`); }
            setCForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const removeCourse = async (c: any) => {
        if (!confirm(`Delete course "${c.name}" and its modules?`)) return;
        await repo.courses.remove(c.id); await logActivity(me.id, 'course', c.id, 'delete', `deleted course "${c.name}"`);
        if (open === c.id) setOpen(''); await load();
    };
    const saveModule = async () => {
        setBusy(true); setErr('');
        try {
            const row: any = {
                title: mForm.title.trim(), description: mForm.description || null,
                learning_materials: mForm.learning_materials || null, practical_projects: mForm.practical_projects || null,
                status: mForm.status, updated_at: new Date().toISOString(),
            };
            if (mForm.id) await repo.courseModules.update(mForm.id, row);
            else {
                const nextOrder = modules.length ? Math.max(...modules.map(m => m.module_order)) + 1 : 1;
                await repo.courseModules.create({ ...row, course_id: open, module_order: nextOrder });
            }
            await logActivity(me.id, 'course_module', mForm.id || null, mForm.id ? 'update' : 'create', `${mForm.id ? 'updated' : 'added'} module "${row.title}"`);
            setMForm(null); await loadModules(open);
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const removeModule = async (m: any) => {
        if (!confirm(`Delete module "${m.title}"?`)) return;
        await repo.courseModules.remove(m.id); await loadModules(open);
    };
    const move = async (m: any, dir: number) => {
        const idx = modules.findIndex(x => x.id === m.id);
        const swap = modules[idx + dir];
        if (!swap) return;
        await repo.courseModules.update(m.id, { module_order: swap.module_order });
        await repo.courseModules.update(swap.id, { module_order: m.module_order });
        await loadModules(open);
    };
    const pct = (cid: string) => {
        if (open !== cid || !modules.length) return null;
        return Math.round(modules.filter(m => m.status === 'done').length / modules.length * 100);
    };

    return <>
        <div className="topbar"><div><h1>Course Development</h1><p>{courses.length} courses - managed by Jaleel, visible to all</p></div>
            <button className="btn" onClick={() => setCForm({ ...emptyC })}>+ New Course</button></div>
        {err && <div className="err">{err}</div>}
        {courses.length === 0 && <div className="empty">No courses yet. Propose the first one.</div>}
        {courses.map(c => <div className="card" key={c.id}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 15 }}>{c.name}</b> <span className="mut small">{c.course_code}</span>
                    <div className="mut small" style={{ marginTop: 4 }}>
                        {[c.category, c.duration, c.proposed_fee != null ? fmtMoney(c.proposed_fee) : '', c.target_audience].filter(Boolean).join(' - ')}
                    </div>
                </div>
                <div className="row" style={{ flexShrink: 0 }}>
                    <span className={`pill p-${c.development_status}`}>{label(c.development_status)}</span>
                    <button className="btn ghost sm" onClick={() => { setOpen(open === c.id ? '' : c.id); }}>{open === c.id ? 'Hide modules' : 'Modules'}</button>
                    <button className="btn ghost sm" onClick={() => setCForm({ ...c, proposed_fee: c.proposed_fee ?? '' })}>Edit</button>
                    <button className="btn danger sm" onClick={() => removeCourse(c)}>Delete</button>
                </div>
            </div>
            {c.syllabus && <p className="small mut" style={{ marginTop: 8 }}>{c.syllabus.slice(0, 200)}{c.syllabus.length > 200 ? '...' : ''}</p>}
            {open === c.id && <div style={{ marginTop: 14 }}>
                {pct(c.id) != null && <div className="bar" style={{ marginBottom: 12 }}><i style={{ width: `${pct(c.id)}%` }} /></div>}
                {modules.length ? modules.map((m, i) => <div key={m.id} className="row" style={{ padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                    <span className="mut small" style={{ width: 22, flexShrink: 0 }}>{m.module_order}.</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <b className="small">{m.title}</b>
                        {m.description && <div className="mut small">{m.description}</div>}
                        {m.learning_materials && <div className="mut small">Materials: {m.learning_materials}</div>}
                        {m.practical_projects && <div className="mut small">Projects: {m.practical_projects}</div>}
                    </div>
                    <span className={`pill p-${m.status}`}>{label(m.status)}</span>
                    <button className="btn ghost sm" disabled={i === 0} onClick={() => move(m, -1)}>Up</button>
                    <button className="btn ghost sm" disabled={i === modules.length - 1} onClick={() => move(m, 1)}>Down</button>
                    <button className="btn ghost sm" onClick={() => setMForm({ ...m })}>Edit</button>
                    <button className="btn danger sm" onClick={() => removeModule(m)}>Del</button>
                </div>) : <div className="empty" style={{ padding: 14 }}>No modules yet.</div>}
                <button className="btn sm" style={{ marginTop: 6 }} onClick={() => setMForm({ ...emptyM })}>+ Add Module</button>
            </div>}
        </div>)}

        {cForm && <div className="modal-bg" onClick={() => setCForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{cForm.id ? `Edit ${cForm.course_code}` : 'New Course'}</h2>
            <label>Course name</label><input value={cForm.name} onChange={e => setCForm({ ...cForm, name: e.target.value })} />
            <div className="field-row">
                <div><label>Category</label><input value={cForm.category || ''} onChange={e => setCForm({ ...cForm, category: e.target.value })} placeholder="e.g. Design, Coding" /></div>
                <div><label>Duration</label><input value={cForm.duration || ''} onChange={e => setCForm({ ...cForm, duration: e.target.value })} placeholder="e.g. 6 weeks" /></div>
            </div>
            <div className="field-row">
                <div><label>Proposed fee (INR)</label><input type="number" min={0} value={cForm.proposed_fee} onChange={e => setCForm({ ...cForm, proposed_fee: e.target.value })} /></div>
                <div><label>Status</label><select value={cForm.development_status} onChange={e => setCForm({ ...cForm, development_status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></div>
            </div>
            <label>Target audience</label><input value={cForm.target_audience || ''} onChange={e => setCForm({ ...cForm, target_audience: e.target.value })} />
            <label>Syllabus outline</label><textarea value={cForm.syllabus || ''} onChange={e => setCForm({ ...cForm, syllabus: e.target.value })} />
            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setCForm(null)}>Cancel</button>
                <button className="btn" disabled={busy || !cForm.name.trim()} onClick={saveCourse}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}

        {mForm && <div className="modal-bg" onClick={() => setMForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{mForm.id ? 'Edit Module' : 'New Module'}</h2>
            <label>Title</label><input value={mForm.title} onChange={e => setMForm({ ...mForm, title: e.target.value })} />
            <label>Description</label><textarea value={mForm.description || ''} onChange={e => setMForm({ ...mForm, description: e.target.value })} style={{ minHeight: 50 }} />
            <label>Learning materials</label><textarea value={mForm.learning_materials || ''} onChange={e => setMForm({ ...mForm, learning_materials: e.target.value })} style={{ minHeight: 50 }} />
            <label>Practical projects</label><textarea value={mForm.practical_projects || ''} onChange={e => setMForm({ ...mForm, practical_projects: e.target.value })} style={{ minHeight: 50 }} />
            <label>Status</label><select value={mForm.status} onChange={e => setMForm({ ...mForm, status: e.target.value })}>{MSTATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select>
            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setMForm(null)}>Cancel</button>
                <button className="btn" disabled={busy || !mForm.title.trim()} onClick={saveModule}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}
    </>;
}
