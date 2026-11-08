import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMentor } from './MentorShell';
import { repo, fmtDate, label, initials } from '../lib/data';

export function MentorDashboard() {
    const { me, founders } = useMentor();
    const [tasks, setTasks] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [docs, setDocs] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [recs, setRecs] = useState<any[]>([]);
    const [notifs, setNotifs] = useState<any[]>([]);
    const [err, setErr] = useState('');

    useEffect(() => {
        Promise.all([
            repo.tasks.list(), repo.reports.list(), repo.documents.list(), repo.activity.list(10),
            repo.milestones.list(), repo.recommendations.list(), repo.mNotifications.list(),
        ]).then(([t, r, d, a, m, rc, n]) => {
            setTasks(t); setReports(r); setDocs(d); setActivity(a); setMilestones(m); setRecs(rc); setNotifs(n);
        }).catch(e => setErr(e.message));
    }, []);

    const open = tasks.filter(t => t.status !== 'completed');
    const overdue = open.filter(t => t.deadline && new Date(t.deadline) < new Date());
    const unread = notifs.filter(n => !n.read).length;
    const msActive = milestones.filter(m => m.status === 'in_progress').length;
    const msDone = milestones.filter(m => m.status === 'completed').length;
    const recsOpen = recs.filter(r => !['completed', 'rejected'].includes(r.status)).length;

    // Monday of this week
    const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
    const weekReports = reports.filter(r => r.week_start && new Date(r.week_start) >= monday);

    const deptStats = useMemo(() => {
        const map: Record<string, { total: number; done: number }> = {};
        founders.forEach(f => { map[f.department] = map[f.department] || { total: 0, done: 0 }; });
        tasks.forEach(t => {
            const f = founders.find(x => x.id === t.assigned_to);
            if (!f) return;
            map[f.department].total++;
            if (t.status === 'completed') map[f.department].done++;
        });
        return Object.entries(map);
    }, [tasks, founders]);

    const perf = (fid: string) => {
        const mine = tasks.filter(t => t.assigned_to === fid);
        const done = mine.filter(t => t.status === 'completed');
        const myReports = reports.filter(r => r.founder_id === fid);
        return {
            assigned: mine.length, completed: done.length, pending: mine.length - done.length,
            overdue: mine.filter(t => t.status !== 'completed' && t.deadline && new Date(t.deadline) < new Date()).length,
            reports: myReports.length,
            reportedThisWeek: myReports.some(r => r.week_start && new Date(r.week_start) >= monday),
        };
    };

    return <>
        <div className="topbar"><div>
            <h1>Mentor Dashboard</h1>
            <p>Welcome, {me.full_name} - academy-wide read-only oversight</p>
        </div></div>
        {err && <div className="err">{err}</div>}

        <div className="grid cards4">
            <div className="card stat"><div className="lbl">Open Tasks</div><div className="num">{open.length}</div><div className="trend mut">{tasks.length} total</div></div>
            <div className="card stat"><div className="lbl">Overdue</div><div className="num" style={{ color: overdue.length ? 'var(--red)' : 'var(--txt)' }}>{overdue.length}</div><div className="trend mut">need follow-up</div></div>
            <div className="card stat"><div className="lbl">Milestones</div><div className="num" style={{ color: 'var(--accent)' }}>{msActive}</div><div className="trend mut">active - {msDone} completed</div></div>
            <div className="card stat"><div className="lbl">Open Recommendations</div><div className="num">{recsOpen}</div><div className="trend mut">{recs.length} total</div></div>
        </div>

        <h3 style={{ fontSize: 14, margin: '18px 0 10px' }}>Department Progress</h3>
        <div className="card">
            {deptStats.map(([dept, s]) => { const pct = s.total ? Math.round(s.done / s.total * 100) : 0; return <div key={dept} style={{ marginBottom: 10 }}>
                <div className="small">{dept} <span style={{ float: 'right' }} className="mut">{s.done}/{s.total} tasks - {pct}%</span></div>
                <div className="bar"><i style={{ width: `${pct}%` }} /></div>
            </div>; })}
        </div>

        <h3 style={{ fontSize: 14, margin: '18px 0 10px' }}>Founder Overview</h3>
        <div className="grid cards3">
            {founders.map(f => { const p = perf(f.id); return <div key={f.id} className="card">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <div><b style={{ fontSize: 14 }}>{f.full_name}</b><div className="mut small">{f.role_title} - {f.department}</div></div>
                    <div className="avatar" style={{ width: 34, height: 34, fontSize: 13 }}>{initials(f.full_name)}</div>
                </div>
                <table style={{ fontSize: 12 }}><tbody>
                    <tr><td className="mut">Tasks (done/total)</td><td style={{ textAlign: 'right' }}><b>{p.completed}/{p.assigned}</b></td></tr>
                    <tr><td className="mut">Overdue</td><td style={{ textAlign: 'right' }}><b style={{ color: p.overdue ? 'var(--red)' : 'var(--txt)' }}>{p.overdue}</b></td></tr>
                    <tr><td className="mut">Weekly reports</td><td style={{ textAlign: 'right' }}><b>{p.reports}</b></td></tr>
                    <tr><td className="mut">Reported this week</td><td style={{ textAlign: 'right' }}><b style={{ color: p.reportedThisWeek ? 'var(--green)' : 'var(--amber)' }}>{p.reportedThisWeek ? 'Yes' : 'Not yet'}</b></td></tr>
                </tbody></table>
            </div>; })}
        </div>

        <div className="grid cards2" style={{ marginTop: 16 }}>
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Recent Activity</h3>
                {activity.length ? activity.map((a: any) => <div key={a.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 12 }}>
                    <span style={{ flex: 1 }}>{a.summary}</span><span className="mut small">{fmtDate(a.created_at)}</span>
                </div>) : <div className="empty">No activity recorded yet.</div>}
            </div>
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Documents Under Review</h3>
                {docs.filter(d => d.status === 'under_review').length ? docs.filter(d => d.status === 'under_review').map((d: any) => <div key={d.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 12 }}>
                    <span style={{ flex: 1 }}>{d.title}</span><span className={`pill p-${d.status}`}>{label(d.status)}</span>
                </div>) : <div className="empty">No documents waiting for review.</div>}
                <div className="row" style={{ marginTop: 12 }}>
                    <Link to="/notifications" className="small" style={{ color: unread ? 'var(--accent)' : 'var(--mut)' }}>Notifications: <b>{unread}</b> unread</Link>
                    <span className="small mut">Weekly reports this week: <b style={{ color: 'var(--txt)' }}>{weekReports.length}</b></span>
                </div>
            </div>
        </div>
    </>;
}
