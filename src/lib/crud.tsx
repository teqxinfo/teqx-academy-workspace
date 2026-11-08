import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import { logActivity, label } from './data';

export type Field = { key: string; label: string; type?: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'founder'; options?: string[]; required?: boolean };

export function FieldInput({ f, form, setForm, founders }: { f: Field; form: any; setForm: (x: any) => void; founders: any[] }) {
    const v = form[f.key] ?? '';
    if (f.type === 'textarea') return <textarea value={v} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />;
    if (f.type === 'select') return <select value={v} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>{(f.options || []).map(o => <option key={o} value={o}>{label(o)}</option>)}</select>;
    if (f.type === 'founder') return <select value={v} onChange={e => setForm({ ...form, [f.key]: e.target.value })}><option value="">Unassigned</option>{founders.map(x => <option key={x.id} value={x.id}>{x.full_name}</option>)}</select>;
    return <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} value={v} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />;
}

export function CrudSection({ title, addLabel, fields, columns, repoApi, entity, canWrite, nameOf, searchKeys, ownerKey = 'created_by' }: {
    title: string; addLabel: string; fields: Field[]; columns: { key: string; label: string; render?: (r: any) => any }[];
    repoApi: any; entity: string; canWrite: boolean; nameOf: (id?: string) => string; searchKeys: string[]; ownerKey?: string;
}) {
    const { me } = useApp();
    const [rows, setRows] = useState<any[]>([]);
    const [q, setQ] = useState('');
    const [form, setForm] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const { founders } = useApp();

    const load = async () => { try { setRows(await repoApi.list()); } catch (e: any) { setErr(e.message); } };
    useEffect(() => { load(); }, []);
    const shown = useMemo(() => rows.filter(r => !q || searchKeys.some(k => String(r[k] || '').toLowerCase().includes(q.toLowerCase()))), [rows, q]);

    const save = async () => {
        setBusy(true); setErr('');
        try {
            const row: any = {};
            for (const f of fields) {
                let v = form[f.key];
                if (v === '' || v === undefined) v = null;
                if (f.type === 'number' && v != null) v = Number(v);
                row[f.key] = v;
            }
            if (!form.id) { for (const k of Object.keys(row)) if (row[k] === null) delete row[k]; }
            if (form.id) { await repoApi.update(form.id, row); await logActivity(me.id, entity, form.id, 'update', `updated ${entity} ${form[Object.keys(form).find(k => k.endsWith('_code')) || 'title'] || ''}`); }
            else { const r = await repoApi.create({ ...row, [ownerKey]: me.id }); await logActivity(me.id, entity, r.id, 'create', `added ${entity}: ${row.title || row.name || row.student_name}`); }
            setForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const remove = async (r: any) => {
        if (!confirm(`Delete "${r.title || r.name || r.student_name}"?`)) return;
        await repoApi.remove(r.id); await logActivity(me.id, entity, r.id, 'delete', `deleted ${entity}: ${r.title || r.name || r.student_name}`); await load();
    };

    return <>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <input className="search" style={{ maxWidth: 260 }} placeholder={`Search ${title.toLowerCase()}...`} value={q} onChange={e => setQ(e.target.value)} />
            {canWrite && <button className="btn" onClick={() => { const e: any = {}; for (const f of fields) e[f.key] = f.type === 'select' ? (f.options || [])[0] : f.type === 'date' ? new Date().toISOString().slice(0, 10) : ''; setForm(e); }}>{addLabel}</button>}
        </div>
        {err && <div className="err">{err}</div>}
        {!rows.length && <div className="empty">No {title.toLowerCase()} yet.{canWrite ? ` Click "${addLabel}" to add the first one.` : ''}</div>}
        {!!rows.length && <div className="card" style={{ padding: 6, overflowX: 'auto' }}><table>
            <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}{canWrite && <th></th>}</tr></thead>
            <tbody>{shown.map(r => <tr key={r.id}>
                {columns.map(c => <td key={c.key}>{c.render ? c.render(r) : (r[c.key] ?? '-')}</td>)}
                {canWrite && <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn ghost sm" onClick={() => setForm({ ...r })}>Edit</button>{' '}
                    <button className="btn danger sm" onClick={() => remove(r)}>Delete</button>
                </td>}
            </tr>)}</tbody>
        </table></div>}
        {form && <div className="modal-bg" onClick={() => setForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{form.id ? 'Edit' : addLabel}</h2>
            {fields.map(f => <div key={f.key}><label>{f.label}</label><FieldInput f={f} form={form} setForm={setForm} founders={founders} /></div>)}
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}
    </>;
}

