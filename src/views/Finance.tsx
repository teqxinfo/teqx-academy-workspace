import React, { useEffect, useState } from 'react';
import { useApp } from '../App';
import { repo, fmtDate, fmtMoney, label } from '../lib/data';
import { CrudSection } from '../lib/crud';

const TABS = ['Dashboard', 'Income', 'Expenses', 'Budgets', 'Contributions', 'Outstanding', 'Audit Log'];
const EXP_CATS = ['travel', 'food', 'software', 'marketing', 'operations', 'other'];
const INC_CATS = ['course_fee', 'admission_fee', 'service', 'consulting', 'other'];
const monthKey = (d: string) => (d || '').slice(0, 7);
const monthName = (mk: string) => mk ? new Date(mk + '-02').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '-';

export function Finance() {
    const { me, founders } = useApp();
    const [tab, setTab] = useState('Dashboard');
    const [income, setIncome] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [budgets, setBudgets] = useState<any[]>([]);
    const [contribs, setContribs] = useState<any[]>([]);
    const [outstanding, setOutstanding] = useState<any[]>([]);
    const [edits, setEdits] = useState<any[]>([]);
    const isOps = me.department === 'Business & Operations';
    const nameOf = (id?: string) => founders.find(f => f.id === id)?.full_name || '-';
    const sum = (xs: any[], k = 'amount') => xs.reduce((a, r) => a + Number(r[k] || 0), 0);

    useEffect(() => {
        (async () => {
            try { setIncome(await repo.income.list()); } catch {}
            try { setExpenses(await repo.expenses.list()); } catch {}
            try { setBudgets(await repo.budgets.list()); } catch {}
            try { setContribs(await repo.contributions.list()); } catch {}
            try { setOutstanding(await repo.outstanding.list()); } catch {}
            if (tab === 'Audit Log') { try { setEdits(await repo.txEdits.list()); } catch {} }
        })();
    }, [tab]);

    const totalIncome = sum(income), totalExpenses = sum(expenses);
    const net = totalIncome - totalExpenses;
    const balance = sum(contribs) + net;
    const outstandingAmt = sum(outstanding.filter(o => o.status !== 'paid'), 'amount_due');
    const nowMk = monthKey(new Date().toISOString());
    const months = [...new Set([...income.map(i => monthKey(i.received_on)), ...expenses.map(e => monthKey(e.spent_on))])].filter(Boolean).sort().reverse().slice(0, 6);
    const thisMonthBudgets = budgets.filter(b => monthKey(b.period_month) === nowMk);
    const expByCat: Record<string, number> = {};
    for (const e of expenses.filter(e => monthKey(e.spent_on) === nowMk)) expByCat[e.category] = (expByCat[e.category] || 0) + Number(e.amount);
    const courseRevenue: Record<string, number> = {};
    for (const i of income.filter(i => i.category === 'course_fee' && i.course_name)) courseRevenue[i.course_name] = (courseRevenue[i.course_name] || 0) + Number(i.amount);

    return <>
        <div className="topbar"><div><h1>Financial Management</h1><p>Managed by Razin (COO) - internal tracking only, not statutory accounting{isOps ? '' : ' - view only for your role'}</p></div></div>
        <div className="chips">{TABS.map(t => <button key={t} className={`chip${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>{t}</button>)}</div>

        {tab === 'Dashboard' && <>
            <div className="grid cards4">
                <div className="card stat"><div className="lbl">Total income</div><div className="num">{fmtMoney(totalIncome)}</div><div className="trend mut">{income.length} entries</div></div>
                <div className="card stat"><div className="lbl">Total expenses</div><div className="num">{fmtMoney(totalExpenses)}</div><div className="trend mut">{expenses.length} entries</div></div>
                <div className="card stat"><div className="lbl">Net cash flow</div><div className="num" style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoney(net)}</div><div className="trend mut">income - expenses</div></div>
                <div className="card stat"><div className="lbl">Cash balance</div><div className="num">{fmtMoney(balance)}</div><div className="trend mut">incl. {fmtMoney(sum(contribs))} founder contributions</div></div>
            </div>
            <div className="grid cards2">
                <div className="card"><h3 style={{ fontSize: 14, marginBottom: 10 }}>Monthly summary</h3>
                    {!months.length && <p className="mut small">No transactions yet.</p>}
                    <table><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead>
                        <tbody>{months.map(mk => {
                            const inc = sum(income.filter(i => monthKey(i.received_on) === mk));
                            const exp = sum(expenses.filter(e => monthKey(e.spent_on) === mk));
                            return <tr key={mk}><td>{monthName(mk)}</td><td>{fmtMoney(inc)}</td><td>{fmtMoney(exp)}</td><td style={{ color: inc - exp >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoney(inc - exp)}</td></tr>;
                        })}</tbody></table>
                </div>
                <div className="card"><h3 style={{ fontSize: 14, marginBottom: 10 }}>Budget vs actual - {monthName(nowMk)}</h3>
                    {!thisMonthBudgets.length && <p className="mut small">No budgets set for this month. Add them in the Budgets tab.</p>}
                    {thisMonthBudgets.map(b => {
                        const actual = expByCat[b.category] || 0;
                        const pct = b.planned_amount ? Math.min(100, Math.round((actual / Number(b.planned_amount)) * 100)) : 0;
                        return <div key={b.id} style={{ marginBottom: 10 }}>
                            <div className="row" style={{ justifyContent: 'space-between' }}><span className="small">{label(b.category)}</span><span className="small mut">{fmtMoney(actual)} / {fmtMoney(b.planned_amount)}</span></div>
                            <div className="bar"><i style={{ width: `${pct}%`, background: actual > Number(b.planned_amount) ? 'var(--red)' : 'var(--accent)' }} /></div>
                        </div>;
                    })}
                    <h3 style={{ fontSize: 14, margin: '14px 0 8px' }}>Expenses this month by category</h3>
                    {!Object.keys(expByCat).length && <p className="mut small">No expenses this month.</p>}
                    {Object.entries(expByCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => <div key={c} className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}><span className="small">{label(c)}</span><span className="small mut">{fmtMoney(v)}</span></div>)}
                </div>
            </div>
            <div className="grid cards2">
                <div className="card stat"><div className="lbl">Outstanding payments</div><div className="num" style={{ color: outstandingAmt > 0 ? 'var(--amber)' : undefined }}>{fmtMoney(outstandingAmt)}</div><div className="trend mut">{outstanding.filter(o => o.status !== 'paid').length} pending/partial</div></div>
                <div className="card"><h3 style={{ fontSize: 14, marginBottom: 8 }}>Course-wise revenue</h3>
                    {!Object.keys(courseRevenue).length && <p className="mut small">No course-fee income recorded yet.</p>}
                    {Object.entries(courseRevenue).sort((a, b) => b[1] - a[1]).map(([c, v]) => <div key={c} className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}><span className="small">{c}</span><span className="small mut">{fmtMoney(v)}</span></div>)}
                </div>
            </div>
        </>}

        {tab === 'Income' && <CrudSection title="Income" addLabel="+ Add Income" entity="income" repoApi={repo.income} canWrite={isOps} nameOf={nameOf} searchKeys={['income_code', 'description', 'received_from', 'course_name']}
            fields={[
                { key: 'received_on', label: 'Date', type: 'date' },
                { key: 'category', label: 'Income category', type: 'select', options: INC_CATS },
                { key: 'course_name', label: 'Course (if course fee)' },
                { key: 'description', label: 'Description', type: 'textarea' },
                { key: 'amount', label: 'Amount (INR)', type: 'number', required: true },
                { key: 'payment_method', label: 'Payment method', type: 'select', options: ['upi', 'cash', 'bank_transfer', 'card', 'other'] },
                { key: 'received_from', label: 'Received from' },
                { key: 'reference_number', label: 'Reference number' },
            ]}
            columns={[
                { key: 'income_code', label: 'ID', render: r => <span className="mut">{r.income_code}</span> },
                { key: 'received_on', label: 'Date', render: r => <span className="mut">{fmtDate(r.received_on)}</span> },
                { key: 'category', label: 'Category', render: r => label(r.category) },
                { key: 'description', label: 'Description', render: r => <span className="small">{r.description || r.course_name || '-'}</span> },
                { key: 'received_from', label: 'From' },
                { key: 'amount', label: 'Amount', render: r => fmtMoney(r.amount) },
            ]} />}

        {tab === 'Expenses' && <CrudSection title="Expenses" addLabel="+ Log Expense" entity="expense" repoApi={repo.expenses} canWrite={true} ownerKey="logged_by" nameOf={nameOf} searchKeys={['expense_code', 'description', 'paid_to']}
            fields={[
                { key: 'spent_on', label: 'Date', type: 'date' },
                { key: 'category', label: 'Expense category', type: 'select', options: EXP_CATS },
                { key: 'description', label: 'Description', type: 'textarea' },
                { key: 'amount', label: 'Amount (INR)', type: 'number', required: true },
                { key: 'paid_to', label: 'Paid to' },
                { key: 'payment_method', label: 'Payment method', type: 'select', options: ['upi', 'cash', 'bank_transfer', 'card', 'other'] },
                { key: 'approval_status', label: 'Approval status', type: 'select', options: ['pending', 'approved', 'rejected'] },
            ]}
            columns={[
                { key: 'expense_code', label: 'ID', render: r => <span className="mut">{r.expense_code}</span> },
                { key: 'spent_on', label: 'Date', render: r => <span className="mut">{fmtDate(r.spent_on)}</span> },
                { key: 'category', label: 'Category', render: r => label(r.category) },
                { key: 'description', label: 'Description', render: r => <span className="small">{r.description || '-'}</span> },
                { key: 'paid_to', label: 'Paid to' },
                { key: 'amount', label: 'Amount', render: r => fmtMoney(r.amount) },
                { key: 'approval_status', label: 'Approval', render: r => <span className={`pill p-${r.approval_status === 'approved' ? 'completed' : r.approval_status === 'rejected' ? 'restricted' : 'review'}`}>{label(r.approval_status)}</span> },
                { key: 'logged_by', label: 'Logged by', render: r => nameOf(r.logged_by) },
            ]} />}

        {tab === 'Budgets' && <CrudSection title="Budgets" addLabel="+ Set Budget" entity="budget" repoApi={repo.budgets} canWrite={isOps} nameOf={nameOf} searchKeys={['budget_code', 'category']}
            fields={[
                { key: 'category', label: 'Budget category', type: 'select', options: EXP_CATS },
                { key: 'period_month', label: 'Month (pick any day in it)', type: 'date', required: true },
                { key: 'planned_amount', label: 'Planned budget (INR)', type: 'number', required: true },
                { key: 'notes', label: 'Notes', type: 'textarea' },
            ]}
            columns={[
                { key: 'budget_code', label: 'ID', render: r => <span className="mut">{r.budget_code}</span> },
                { key: 'category', label: 'Category', render: r => label(r.category) },
                { key: 'period_month', label: 'Month', render: r => monthName(monthKey(r.period_month)) },
                { key: 'planned_amount', label: 'Planned', render: r => fmtMoney(r.planned_amount) },
                { key: 'actual', label: 'Actual', render: r => fmtMoney(expenses.filter(e => e.category === r.category && monthKey(e.spent_on) === monthKey(r.period_month)).reduce((a, e) => a + Number(e.amount), 0)) },
                { key: 'remaining', label: 'Remaining', render: r => {
                    const actual = expenses.filter(e => e.category === r.category && monthKey(e.spent_on) === monthKey(r.period_month)).reduce((a, e) => a + Number(e.amount), 0);
                    const rem = Number(r.planned_amount) - actual;
                    return <span style={{ color: rem < 0 ? 'var(--red)' : 'var(--green)' }}>{fmtMoney(rem)}</span>;
                } },
            ]} />}

        {tab === 'Contributions' && <CrudSection title="Founder Contributions" addLabel="+ Add Contribution" entity="contribution" repoApi={repo.contributions} canWrite={isOps} nameOf={nameOf} searchKeys={['contribution_code', 'reference']}
            fields={[
                { key: 'founder_id', label: 'Founder', type: 'founder', required: true },
                { key: 'contribution_date', label: 'Date', type: 'date' },
                { key: 'amount', label: 'Amount (INR)', type: 'number', required: true },
                { key: 'contribution_type', label: 'Type', type: 'select', options: ['capital', 'loan', 'expense_cover', 'other'] },
                { key: 'reference', label: 'Reference' },
                { key: 'remarks', label: 'Remarks', type: 'textarea' },
            ]}
            columns={[
                { key: 'contribution_code', label: 'ID', render: r => <span className="mut">{r.contribution_code}</span> },
                { key: 'founder_id', label: 'Founder', render: r => nameOf(r.founder_id) },
                { key: 'contribution_date', label: 'Date', render: r => <span className="mut">{fmtDate(r.contribution_date)}</span> },
                { key: 'contribution_type', label: 'Type', render: r => label(r.contribution_type) },
                { key: 'amount', label: 'Amount', render: r => fmtMoney(r.amount) },
                { key: 'reference', label: 'Reference' },
            ]} />}

        {tab === 'Outstanding' && <CrudSection title="Outstanding Payments" addLabel="+ Add Outstanding" entity="outstanding payment" repoApi={repo.outstanding} canWrite={isOps} nameOf={nameOf} searchKeys={['outstanding_code', 'payer']}
            fields={[
                { key: 'payer', label: 'Payer', required: true },
                { key: 'description', label: 'Description', type: 'textarea' },
                { key: 'amount_due', label: 'Amount due (INR)', type: 'number', required: true },
                { key: 'due_date', label: 'Due date', type: 'date' },
                { key: 'status', label: 'Payment status', type: 'select', options: ['pending', 'partial', 'paid'] },
            ]}
            columns={[
                { key: 'outstanding_code', label: 'ID', render: r => <span className="mut">{r.outstanding_code}</span> },
                { key: 'payer', label: 'Payer' },
                { key: 'amount_due', label: 'Amount due', render: r => fmtMoney(r.amount_due) },
                { key: 'due_date', label: 'Due', render: r => <span className="mut">{fmtDate(r.due_date)}</span> },
                { key: 'status', label: 'Status', render: r => <span className={`pill p-${r.status === 'paid' ? 'completed' : r.status === 'partial' ? 'review' : 'on_hold'}`}>{label(r.status)}</span> },
            ]} />}

        {tab === 'Audit Log' && <>
            <p className="mut small" style={{ marginBottom: 10 }}>Every edit to an income or expense record is captured automatically with its full before/after state. This log cannot be edited from the app.</p>
            {!edits.length && <div className="empty">No transaction edits recorded yet.</div>}
            {edits.map(e => {
                const changed = Object.keys(e.new_row || {}).filter(k => JSON.stringify((e.old_row || {})[k]) !== JSON.stringify((e.new_row || {})[k]) && !['updated_at'].includes(k));
                return <div key={e.id} className="card" style={{ padding: 12 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="small"><b>{e.entity_code || e.entity}</b> <span className={`pill p-${e.entity === 'income' ? 'completed' : 'review'}`}>{e.entity}</span></span>
                        <span className="mut small">{nameOf(e.edited_by)} - {new Date(e.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="small" style={{ marginTop: 6 }}>
                        {changed.map(k => <div key={k} className="mut">{label(k)}: <span style={{ color: 'var(--red)' }}>{String((e.old_row || {})[k] ?? '-')}</span> → <span style={{ color: 'var(--green)' }}>{String((e.new_row || {})[k] ?? '-')}</span></div>)}
                        {!changed.length && <span className="mut">No field changes detected.</span>}
                    </div>
                </div>;
            })}
        </>}
    </>;
}
