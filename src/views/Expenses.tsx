import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import { repo, logActivity, fmtDate, fmtMoney, label } from '../lib/data';

const CATS = ['travel', 'food', 'software', 'marketing', 'operations', 'other'];
const empty = { category: 'other', amount: '', spent_on: new Date().toISOString().slice(0, 10), description: '', payment_method: '' };

export function Expenses() {
    const { me, founders } = useApp();
    const [rows, setRows] = useState<any[]>([]);
    const [err, setErr] = useState('');
    const [q, setQ] = useState('');
    const [fCat, setFCat] = useState('');
    const [form, setForm] = useState<any>(null);
    const [busy, setBusy] = useState(false);

    const load = async () => { try { setRows(await repo.expenses.list()); } catch (e: any) { setErr(e.message); } };
    useEffect(() => { load(); }, []);

    const nameOf = (id?: string) => founders.find(f => f.id === id)?.full_name || '-';
    const shown = useMemo(() => rows.filter(r =>
        (!fCat || r.category === fCat) &&
        (!q || (r.description || '' + r.expense_code).toLowerCase().includes(q.toLowerCase()))
    ), [rows, q, fCat]);

    const now = new Date();
    const thisMonth = rows.filter(r => { const d = new Date(r.spent_on); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const sum = (xs: any[]) => xs.reduce((a, r) => a + Number(r.amount || 0), 0);
    const byCat: Record<string, number> = {};
    for (const r of thisMonth) byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount);

    const save = async () => {
        setBusy(true); setErr('');
        try {
            const row: any = {
                category: form.category, amount: Number(form.amount), spent_on: form.spent_on,
                description: form.description || null, payment_method: form.payment_method || null,
                updated_at: new Date().toISOString(),
            };
            if (form.id) { await repo.expenses.update(form.id, row); await logActivity(me.id, 'expense', form.id, 'update', `updated expense ${form.expense_code} (${fmtMoney(row.amount)})`); }
            else { const r = await repo.expenses.create({ ...row, logged_by: me.id }); await logActivity(me.id, 'expense', r.id, 'create', `logged expense ${fmtMoney(row.amount)} (${label(row.category)})`); }
            setForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const remove = async (r: any) => {
        if (!confirm(`Delete expense ${r.expense_code} (${fmtMoney(r.amount)})?`)) return;
        await repo.expenses.remove(r.id); await logActivity(me.id, 'expense', r.id, 'delete', `deleted expense ${r.expense_code}`); await load();
    };

    return <>
        <div className="topbar"><div><h1>Financial Tracker</h1><p>Shared expense log for Teqx Academy</p></div>
            <button className="btn" onClick={() => setForm({ ...empty })}>+ Log Expense</button></div>
        {err && <div className="err">{err}</div>}
        <div className="grid cards4">
            <div className="card stat"><div className="lbl">This month</div><div className="num">{fmtMoney(sum(thisMonth))}</div><div className="trend mut">{thisMonth.length} expenses</div></div>
            <div className="card stat"><div className="lbl">All time</div><div className="num">{fmtMoney(sum(rows))}</div><div className="trend mut">{rows.length} expenses</div></div>
            <div className="card stat"><div className="lbl">Top category</div><div className="num" style={{ fontSize: 19 }}>{Object.entries(byCat).sort((a, b) => b[1] - a[1])[0] ? label(Object.entries(byCat).sort((a, b) => b[1] - a[1])[0][0]) : '-'}</div><div className="trend mut">this month</div></div>
            <div className="card stat"><div className="lbl">Largest this month</div><div className="num" style={{ fontSize: 19 }}>{thisMonth.length ? fmtMoney(Math.max(...thisMonth.map(r => Number(r.amount)))) : '-'}</div><div className="trend mut">single expense</div></div>
        </div>
        <div className="row" style={{ marginBottom: 14 }}>
            <input className="search" style={{ maxWidth: 260 }} placeholder="Search expenses..." value={q} onChange={e => setQ(e.target.value)} />
            <div className="chips" style={{ margin: 0 }}>
                <button className={`chip${!fCat ? ' on' : ''}`} onClick={() => setFCat('')}>All</button>
                {CATS.map(c => <button key={c} className={`chip${fCat === c ? ' on' : ''}`} onClick={() => setFCat(c)}>{label(c)}</button>)}
            </div>
        </div>
        <div className="card">
            {shown.length ? <table><thead><tr><th>ID</th><th>Date</th><th>Category</th><th>Description</th><th>By</th><th>Method</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr></thead><tbody>
                {shown.map(r => <tr key={r.id}>
                    <td className="mut">{r.expense_code}</td>
                    <td>{fmtDate(r.spent_on)}</td>
                    <td><span className="pill p-shared">{label(r.category)}</span></td>
                    <td className="small">{r.description || '-'}</td>
                    <td>{nameOf(r.logged_by)}</td>
                    <td className="small">{r.payment_method || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(r.amount)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}><button className="btn ghost sm" onClick={() => setForm({ ...r })}>Edit</button>{' '}<button className="btn danger sm" onClick={() => remove(r)}>Delete</button></td>
                </tr>)}
            </tbody></table> : <div className="empty">No expenses logged yet.</div>}
        </div>

        {form && <div className="modal-bg" onClick={() => setForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{form.id ? `Edit ${form.expense_code}` : 'Log Expense'}</h2>
            <div className="field-row">
                <div><label>Amount (INR)</label><input type="number" min={0} step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
                <div><label>Date</label><input type="date" value={form.spent_on} onChange={e => setForm({ ...form, spent_on: e.target.value })} /></div>
            </div>
            <div className="field-row">
                <div><label>Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATS.map(c => <option key={c} value={c}>{label(c)}</option>)}</select></div>
                <div><label>Payment method</label><input value={form.payment_method || ''} onChange={e => setForm({ ...form, payment_method: e.target.value })} placeholder="UPI, cash, card..." /></div>
            </div>
            <label>Description</label><textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} style={{ minHeight: 50 }} placeholder="What was this for?" />
            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn" disabled={busy || !(Number(form.amount) > 0)} onClick={save}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
        </div></div>}
    </>;
}
