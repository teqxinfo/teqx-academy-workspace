import React, { useEffect, useState } from 'react';
import { useMentor } from './MentorShell';
import { repo, fmtDate, fmtMoney, label } from '../lib/data';

export function FinancialOverview() {
    const { founders } = useMentor();
    const [allowed, setAllowed] = useState<boolean | null>(null);
    const [income, setIncome] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [budgets, setBudgets] = useState<any[]>([]);
    const [outstanding, setOutstanding] = useState<any[]>([]);
    const [contributions, setContributions] = useState<any[]>([]);
    const [err, setErr] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const can = await repo.mPermissions.can('finance');
                setAllowed(can);
                if (!can) return;
                const [i, e, b, o, c] = await Promise.all([repo.income.list(), repo.expenses.list(), repo.budgets.list(), repo.outstanding.list(), repo.contributions.list()]);
                setIncome(i); setExpenses(e); setBudgets(b); setOutstanding(o); setContributions(c);
            } catch (e: any) { setErr(e.message); }
        })();
    }, []);

    if (allowed === null) return <div className="mut">Loading...</div>;
    if (!allowed) return <>
        <div className="topbar"><div><h1>Financial Overview</h1><p>Academy finances</p></div></div>
        <div className="card"><div className="empty">Financial data is restricted. A founder can grant you access from Settings - Mentor Access.</div></div>
    </>;

    const inSum = income.reduce((s, r) => s + (r.amount || 0), 0);
    const exSum = expenses.reduce((s, r) => s + (r.amount || 0), 0);
    const outSum = outstanding.filter(o => o.status !== 'paid').reduce((s, r) => s + (r.amount_due || 0), 0);
    const nameOf = (id: string) => founders.find(f => f.id === id)?.full_name || '-';

    return <>
        <div className="topbar"><div><h1>Financial Overview</h1><p>Read-only - income, expenses, budgets and outstanding payments</p></div></div>
        {err && <div className="err">{err}</div>}
        <div className="grid cards4">
            <div className="card stat"><div className="lbl">Total Income</div><div className="num" style={{ color: 'var(--green)' }}>{fmtMoney(inSum)}</div><div className="trend mut">{income.length} entries</div></div>
            <div className="card stat"><div className="lbl">Total Expenses</div><div className="num" style={{ color: 'var(--red)' }}>{fmtMoney(exSum)}</div><div className="trend mut">{expenses.length} entries</div></div>
            <div className="card stat"><div className="lbl">Net Balance</div><div className="num" style={{ color: inSum - exSum >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoney(inSum - exSum)}</div></div>
            <div className="card stat"><div className="lbl">Outstanding</div><div className="num" style={{ color: 'var(--amber)' }}>{fmtMoney(outSum)}</div><div className="trend mut">unpaid</div></div>
        </div>
        <div className="grid cards2" style={{ marginTop: 16 }}>
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Recent Income</h3>
                {income.length ? <table style={{ fontSize: 12 }}><tbody>
                    {income.slice(0, 8).map(r => <tr key={r.id}><td>{r.category}{r.course_name ? ` - ${r.course_name}` : ''}</td><td className="mut">{fmtDate(r.received_on)}</td><td style={{ textAlign: 'right' }}><b>{fmtMoney(r.amount)}</b></td></tr>)}
                </tbody></table> : <div className="empty">No income recorded.</div>}
                <h3 style={{ fontSize: 14, margin: '14px 0 10px' }}>Founder Contributions</h3>
                {contributions.length ? <table style={{ fontSize: 12 }}><tbody>
                    {contributions.slice(0, 6).map(r => <tr key={r.id}><td>{nameOf(r.founder_id)}</td><td className="mut">{fmtDate(r.contribution_date)}</td><td style={{ textAlign: 'right' }}><b>{fmtMoney(r.amount)}</b></td></tr>)}
                </tbody></table> : <div className="empty">No contributions recorded.</div>}
            </div>
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Recent Expenses</h3>
                {expenses.length ? <table style={{ fontSize: 12 }}><tbody>
                    {expenses.slice(0, 8).map(r => <tr key={r.id}><td>{r.title || r.category}</td><td className="mut">{fmtDate(r.date || r.created_at)}</td><td style={{ textAlign: 'right' }}><b>{fmtMoney(r.amount)}</b></td></tr>)}
                </tbody></table> : <div className="empty">No expenses recorded.</div>}
                <h3 style={{ fontSize: 14, margin: '14px 0 10px' }}>Budgets</h3>
                {budgets.length ? <table style={{ fontSize: 12 }}><tbody>
                    {budgets.slice(0, 6).map(b => <tr key={b.id}><td>{b.category}</td><td className="mut">{b.period_month}</td><td style={{ textAlign: 'right' }}><b>{fmtMoney(b.planned_amount)}</b></td></tr>)}
                </tbody></table> : <div className="empty">No budgets set.</div>}
            </div>
        </div>
    </>;
}
