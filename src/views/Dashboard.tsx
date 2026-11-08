import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { repo, fmtDate, fmtMoney, label } from '../lib/data';

const RANGES = ['today', 'this_week', 'this_month', 'all', 'custom'] as const;

function rangeBounds(range: string, from: string, to: string): [Date | null, Date | null] {
    const now = new Date();
    if (range === 'today') { const s = new Date(now); s.setHours(0, 0, 0, 0); return [s, now]; }
    if (range === 'this_week') { const s = new Date(now); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); s.setHours(0, 0, 0, 0); return [s, now]; }
    if (range === 'this_month') return [new Date(now.getFullYear(), now.getMonth(), 1), now];
    if (range === 'custom') return [from ? new Date(from + 'T00:00:00') : null, to ? new Date(to + 'T23:59:59') : null];
    return [null, null];
}
const inRange = (d: string | null | undefined, lo: Date | null, hi: Date | null) => {
    if (!d) return false;
    const t = new Date(d).getTime();
    return (!lo || t >= +lo) && (!hi || t <= +hi);
};

export function Dashboard() {
    const { me, founders } = useApp();
    const [range, setRange] = useState<string>('this_month');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [D, setD] = useState<any>({ tasks: [], activity: [], decisions: [], courses: [], leads: [], income: [], expenses: [], meetings: [], study: [], docs: [], notifs: [] });
    const [err, setErr] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const [tasks, activity, decisions, courses, leads, income, expenses, meetings, study, docs, notifs] = await Promise.all([
                    repo.tasks.list(), repo.activity.list(8), repo.decisions.list(), repo.courses.list(), repo.leads.list(),
                    repo.income.list(), repo.expenses.list(), repo.meetings.list(), repo.study.list(), repo.documents.list(), repo.notifications.list(),
                ]);
                setD({ tasks, activity, decisions, courses, leads, income, expenses, meetings, study, docs, notifs });
            } catch (e: any) { setErr(e.message); }
        })();
    }, []);

    const [lo, hi] = rangeBounds(range, from, to);
    const { tasks, activity, decisions, courses, leads, income, expenses, meetings, study, docs, notifs } = D;

    const open = tasks.filter((t: any) => t.status !== 'completed');
    const doneAll = tasks.filter((t: any) => t.status === 'completed');
    const doneInRange = doneAll.filter((t: any) => inRange(t.completed_at || t.updated_at, lo, hi));
    const overdue = open.filter((t: any) => t.deadline && new Date(t.deadline) < new Date());
    const upcoming = open.filter((t: any) => t.deadline).sort((a: any, b: any) => +new Date(a.deadline) - +new Date(b.deadline)).slice(0, 5);
    const activeCourses = courses.filter((c: any) => c.development_status !== 'launched');
    const nameOf = (id?: string) => founders.find(f => f.id === id)?.full_name || '-';

    const leadsInRange = leads.filter((l: any) => inRange(l.enquiry_date, lo, hi));
    const newLeads = leadsInRange.filter((l: any) => !['converted', 'not_interested'].includes(l.status));
    const incomeSum = income.filter((r: any) => inRange(r.received_on, lo, hi)).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const expenseSum = expenses.filter((r: any) => inRange(r.spent_on, lo, hi)).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const upcomingMeetings = meetings.filter((m: any) => m.status === 'scheduled' && new Date(m.scheduled_at) >= new Date());
    const pendingApprovals = docs.filter((d: any) => d.status === 'under_review').length + decisions.filter((d: any) => d.status === 'proposed').length;
    const unread = notifs.filter((n: any) => !n.read).length;
    const studyDone = study.filter((s: any) => s.learning_status === 'completed').length;
    const docsActive = docs.filter((d: any) => d.status === 'approved' || d.status === 'published').length;

    const perf = (fid: string) => {
        const mine = tasks.filter((t: any) => t.assigned_to === fid);
        const completed = mine.filter((t: any) => t.status === 'completed');
        const inR = completed.filter((t: any) => inRange(t.completed_at || t.updated_at, lo, hi));
        const myCourses = courses.filter((c: any) => c.created_by === fid && c.development_status !== 'launched');
        const myStudy = study.filter((s: any) => s.founder_id === fid);
        const studyPct = myStudy.length ? Math.round(myStudy.filter((s: any) => s.learning_status === 'completed').length / myStudy.length * 100) : 0;
        // Weekly performance: share of this week's tasks (due or completed this week) that are done
        const [wlo, whi] = rangeBounds('this_week', '', '');
        const weekTasks = mine.filter((t: any) => inRange(t.deadline, wlo, whi) || inRange(t.completed_at, wlo, whi));
        const weekPct = weekTasks.length ? Math.round(weekTasks.filter((t: any) => t.status === 'completed').length / weekTasks.length * 100) : (mine.length ? Math.round(completed.length / mine.length * 100) : 0);
        return { assigned: mine.length, completed: completed.length, completedInRange: inR.length, pending: mine.length - completed.length, projects: myCourses.length, studyPct, weekPct };
    };

    return <>
        <div className="topbar"><div>
            <h1>Welcome back, {me.full_name}</h1>
            <p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} - shared business overview</p>
        </div><Link to="/tasks" className="btn" style={{ textDecoration: 'none' }}>+ New Task</Link></div>
        {err && <div className="err">{err}</div>}

        <div className="row" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            <div className="chips" style={{ margin: 0 }}>
                {RANGES.map(r => <button key={r} className={`chip${range === r ? ' on' : ''}`} onClick={() => setRange(r)}>{label(r)}</button>)}
            </div>
            {range === 'custom' && <>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ maxWidth: 150 }} />
                <span className="mut">to</span>
                <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ maxWidth: 150 }} />
            </>}
        </div>

        <div className="grid cards4">
            <div className="card stat"><div className="lbl">Total Tasks</div><div className="num">{tasks.length}</div><div className="trend mut">{open.length} open</div></div>
            <div className="card stat"><div className="lbl">Completed</div><div className="num" style={{ color: 'var(--green)' }}>{range === 'all' ? doneAll.length : doneInRange.length}</div><div className="trend mut">{tasks.length ? Math.round(doneAll.length / tasks.length * 100) : 0}% overall</div></div>
            <div className="card stat"><div className="lbl">Pending</div><div className="num" style={{ color: 'var(--amber)' }}>{open.length}</div><div className="trend" style={{ color: 'var(--red)' }}>{overdue.length} overdue</div></div>
            <div className="card stat"><div className="lbl">Active Projects</div><div className="num" style={{ color: 'var(--accent)' }}>{activeCourses.length}</div><div className="trend mut">courses in development</div></div>
            <div className="card stat"><div className="lbl">Total Leads</div><div className="num">{leadsInRange.length}</div><div className="trend mut">{newLeads.length} open</div></div>
            <div className="card stat"><div className="lbl">Financial Overview</div><div className="num" style={{ color: incomeSum - expenseSum >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoney(incomeSum - expenseSum)}</div><div className="trend mut">{fmtMoney(incomeSum)} in - {fmtMoney(expenseSum)} out</div></div>
            <div className="card stat"><div className="lbl">Upcoming Meetings</div><div className="num">{upcomingMeetings.length}</div><div className="trend mut">{upcomingMeetings[0] ? `next ${fmtDate(upcomingMeetings[0].scheduled_at)}` : 'none scheduled'}</div></div>
            <div className="card stat"><div className="lbl">Pending Approvals</div><div className="num" style={{ color: pendingApprovals ? 'var(--amber)' : 'var(--txt)' }}>{pendingApprovals}</div><div className="trend mut">docs in review + proposed decisions</div></div>
        </div>

        <h3 style={{ fontSize: 14, margin: '18px 0 10px' }}>Founder Performance</h3>
        <div className="grid cards3">
            {founders.map(f => { const p = perf(f.id); return <div key={f.id} className="card">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <div><b style={{ fontSize: 14 }}>{f.full_name}</b><div className="mut small">{f.department}</div></div>
                    <div className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{f.full_name.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                </div>
                <table style={{ fontSize: 12 }}><tbody>
                    <tr><td className="mut">Assigned tasks</td><td style={{ textAlign: 'right' }}><b>{p.assigned}</b></td></tr>
                    <tr><td className="mut">Completed{range !== 'all' ? ' (in range)' : ''}</td><td style={{ textAlign: 'right' }}><b style={{ color: 'var(--green)' }}>{range === 'all' ? p.completed : p.completedInRange}</b></td></tr>
                    <tr><td className="mut">Pending</td><td style={{ textAlign: 'right' }}><b style={{ color: 'var(--amber)' }}>{p.pending}</b></td></tr>
                    <tr><td className="mut">Current projects</td><td style={{ textAlign: 'right' }}><b>{p.projects}</b></td></tr>
                </tbody></table>
                <div className="small" style={{ marginTop: 8 }}>Learning progress <span style={{ float: 'right' }} className="mut">{p.studyPct}%</span>
                    <div className="bar"><i style={{ width: `${p.studyPct}%`, background: 'var(--violet)' }} /></div></div>
                <div className="small" style={{ marginTop: 8 }}>Weekly performance <span style={{ float: 'right' }} className="mut">{p.weekPct}%</span>
                    <div className="bar"><i style={{ width: `${p.weekPct}%` }} /></div></div>
            </div>; })}
        </div>

        <div className="grid cards2" style={{ marginTop: 16 }}>
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Upcoming Deadlines</h3>
                {upcoming.length ? <table><thead><tr><th>Task</th><th>Owner</th><th>Deadline</th><th>Status</th></tr></thead><tbody>
                    {upcoming.map((t: any) => <tr key={t.id}>
                        <td>{t.title}</td><td>{nameOf(t.assigned_to)}</td>
                        <td style={{ color: new Date(t.deadline) < new Date() ? 'var(--red)' : 'var(--txt)' }}>{fmtDate(t.deadline)}</td>
                        <td><span className={`pill p-${t.status}`}>{label(t.status)}</span></td>
                    </tr>)}
                </tbody></table> : <div className="empty">No deadlines yet - create the first task.</div>}
                <div className="row" style={{ marginTop: 12, gap: 14 }}>
                    <span className="small mut">Study: <b style={{ color: 'var(--txt)' }}>{studyDone}/{study.length}</b> topics done</span>
                    <span className="small mut">Documents: <b style={{ color: 'var(--txt)' }}>{docsActive}/{docs.length}</b> approved</span>
                    <Link to="/notifications" className="small" style={{ color: unread ? 'var(--accent)' : 'var(--mut)' }}>Notifications: <b>{unread}</b> unread</Link>
                </div>
            </div>
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>Recent Activities</h3>
                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 7 }} className="mut">
                    {activity.length ? activity.map((a: any) => <div key={a.id}><b style={{ color: 'var(--txt)' }}>{nameOf(a.actor_id)}</b> {a.summary}</div>) : <div>No activity yet.</div>}
                </div>
            </div>
        </div>
        <div className="card">
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>Important Decisions <span className="mut" style={{ fontWeight: 400, fontSize: 11 }}>- shared with all founders</span></h3>
            {decisions.length ? <table><thead><tr><th>Decision</th><th>Date</th><th>Proposed by</th><th>Status</th></tr></thead><tbody>
                {decisions.slice(0, 6).map((d: any) => <tr key={d.id}><td>{d.title}</td><td>{fmtDate(d.decision_date)}</td><td>{nameOf(d.proposed_by)}</td><td><span className={`pill p-${d.status}`}>{label(d.status)}</span></td></tr>)}
            </tbody></table> : <div className="empty">No decisions recorded yet.</div>}
        </div>
    </>;
}
