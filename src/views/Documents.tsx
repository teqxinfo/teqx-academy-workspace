import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../App';
import { repo, logActivity, fmtDate, label } from '../lib/data';
import { uploadDoc, docSignedUrl, dbSelect, dbInsert, dbDelete } from '../lib/sb';

const CATS = ['business', 'legal', 'branding', 'finance', 'academic', 'courses', 'marketing'];
const empty = { title: '', category: 'business', description: '', access: 'shared', status: 'draft', responsible_founder: '', acl: [] as string[] };

export function Documents() {
    const { me, founders } = useApp();
    const [docs, setDocs] = useState<any[]>([]);
    const [err, setErr] = useState('');
    const [q, setQ] = useState('');
    const [fCat, setFCat] = useState('');
    const [form, setForm] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const load = async () => { try { setDocs(await repo.documents.list()); } catch (e: any) { setErr(e.message); } };
    useEffect(() => { load(); }, []);

    const nameOf = (id?: string) => founders.find(f => f.id === id)?.full_name || '-';
    const shown = useMemo(() => docs.filter(d =>
        (!fCat || d.category === fCat) &&
        (!q || (d.title + ' ' + (d.description || '') + ' ' + d.doc_code).toLowerCase().includes(q.toLowerCase()))
    ), [docs, q, fCat]);

    const openEdit = async (d: any) => {
        let acl: string[] = [];
        if (d.access === 'restricted') { try { acl = (await dbSelect<any>('document_acl', { eq: { document_id: d.id } })).map(r => r.founder_id); } catch {} }
        setFile(null); setForm({ ...d, responsible_founder: d.responsible_founder || '', acl });
    };

    const save = async () => {
        setBusy(true); setErr('');
        try {
            let fileMeta: any = {};
            if (file) {
                const path = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
                await uploadDoc(file, path);
                fileMeta = { file_path: path, file_name: file.name, mime_type: file.type || null, file_size_bytes: file.size };
            }
            const row: any = {
                title: form.title.trim(), category: form.category, description: form.description || null,
                access: form.access, status: form.status, responsible_founder: form.responsible_founder || null,
                updated_at: new Date().toISOString(), ...fileMeta,
            };
            let docId = form.id;
            if (form.id) { await repo.documents.update(form.id, row); await logActivity(me.id, 'document', form.id, 'update', `updated document "${row.title}"`); }
            else {
                const r = await repo.documents.create({ ...row, created_by: me.id }); docId = r.id;
                await logActivity(me.id, 'document', docId, file ? 'upload' : 'create', `added document "${row.title}"`);
            }
            if (form.access === 'restricted') {
                const existing = await dbSelect<any>('document_acl', { eq: { document_id: docId } });
                for (const e of existing) if (!form.acl.includes(e.founder_id)) await dbDelete('document_acl', e.id);
                for (const fid of form.acl) if (!existing.find(e => e.founder_id === fid)) await dbInsert('document_acl', { document_id: docId, founder_id: fid });
            }
            setForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const remove = async (d: any) => {
        if (!confirm(`Delete document "${d.title}"?`)) return;
        await repo.documents.remove(d.id); await logActivity(me.id, 'document', d.id, 'delete', `deleted document "${d.title}"`); await load();
    };
    const openFile = async (d: any) => {
        try { const url = await docSignedUrl(d.file_path); window.open(url, '_blank'); }
        catch (e: any) { setErr(e.message); }
    };
    const fmtSize = (n?: number) => !n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

    return <>
        <div className="topbar"><div><h1>Document Management</h1><p>{docs.length} documents - private storage, signed links only</p></div>
            <button className="btn" onClick={() => { setFile(null); setForm({ ...empty, acl: [] }); }}>+ New Document</button></div>
        {err && <div className="err">{err}</div>}
        <div className="row" style={{ marginBottom: 14 }}>
            <input className="search" style={{ maxWidth: 260 }} placeholder="Search documents..." value={q} onChange={e => setQ(e.target.value)} />
            <div className="chips" style={{ margin: 0 }}>
                <button className={`chip${!fCat ? ' on' : ''}`} onClick={() => setFCat('')}>All</button>
                {CATS.map(c => <button key={c} className={`chip${fCat === c ? ' on' : ''}`} onClick={() => setFCat(c)}>{label(c)}</button>)}
            </div>
        </div>
        <div className="card">
            {shown.length ? <table><thead><tr><th>ID</th><th>Document</th><th>Category</th><th>File</th><th>Responsible</th><th>Access</th><th>Status</th><th></th></tr></thead><tbody>
                {shown.map(d => <tr key={d.id}>
                    <td className="mut">{d.doc_code}</td>
                    <td><b>{d.title}</b>{d.description && <div className="mut small">{d.description.slice(0, 70)}</div>}</td>
                    <td>{label(d.category)}</td>
                    <td>{d.file_name ? <button className="btn ghost sm" onClick={() => openFile(d)}>{d.file_name.length > 24 ? d.file_name.slice(0, 22) + '...' : d.file_name} {fmtSize(d.file_size_bytes)}</button> : <span className="mut">-</span>}</td>
                    <td>{nameOf(d.responsible_founder)}</td>
                    <td><span className={`pill p-${d.access}`}>{label(d.access)}</span></td>
                    <td><span className={`pill p-${d.status}`}>{label(d.status)}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}><button className="btn ghost sm" onClick={() => openEdit(d)}>Edit</button>{' '}<button className="btn danger sm" onClick={() => remove(d)}>Delete</button></td>
                </tr>)}
            </tbody></table> : <div className="empty">No documents yet.</div>}
        </div>

        {form && <div className="modal-bg" onClick={() => setForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{form.id ? `Edit ${form.doc_code}` : 'New Document'}</h2>
            <label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Document name" />
            <div className="field-row">
                <div><label>Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATS.map(c => <option key={c} value={c}>{label(c)}</option>)}</select></div>
                <div><label>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="not_started">Not Started</option><option value="draft">Draft</option><option value="under_review">Under Review</option><option value="approved">Approved</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
            </div>
            <label>Description</label><textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} style={{ minHeight: 50 }} />
            <div className="field-row">
                <div><label>Responsible founder</label><select value={form.responsible_founder} onChange={e => setForm({ ...form, responsible_founder: e.target.value })}><option value="">None</option>{founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}</select></div>
                <div><label>Access</label><select value={form.access} onChange={e => setForm({ ...form, access: e.target.value })}><option value="shared">All founders</option><option value="restricted">Restricted</option></select></div>
            </div>
            {form.access === 'restricted' && <>
                <label>Who can see it</label>
                <div className="chips">{founders.map(f => <button key={f.id} className={`chip${form.acl.includes(f.id) ? ' on' : ''}`}
                    onClick={() => setForm({ ...form, acl: form.acl.includes(f.id) ? form.acl.filter((x: string) => x !== f.id) : [...form.acl, f.id] })}>{f.full_name}</button>)}</div>
            </>}
            <label>File {form.file_name && !file ? `(current: ${form.file_name})` : ''}</label>
            <input ref={fileRef} type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn" disabled={busy || !form.title.trim()} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}
    </>;
}
