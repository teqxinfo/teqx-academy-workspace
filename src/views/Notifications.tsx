import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { repo, fmtDate, label } from '../lib/data';

const fmtDT = (d?: string) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
const ICONS: Record<string, string> = {
    task_assigned: 'Task', task_deadline: 'Due', task_overdue: 'Overdue', document_shared: 'Doc', document_approved: 'Doc',
    meeting_scheduled: 'Meeting', meeting_reminder: 'Meeting', weekly_report: 'Report', report_reminder: 'Report',
    course_update: 'Course', financial_alert: 'Finance', decision_recorded: 'Decision', knowledge_shared: 'Hub',
};

type Alert = { type: string; title: string; body?: string; link?: string };

export function Notifications() {
    const { me, founders } = useApp();
    const [rows, setRows] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => {
        try { setRows(await repo.notifications.list()); } catch (e: any) { setErr(e.message); }
        try { setTasks(await repo.tasks.list()); } catch {}
        try { setMeetings(await repo.meetings.list()); } catch {}
        try { setReports(await repo.reports.list()); } catch {}
    };
    useEffect(() => { load(); }, []);

    const unread = useMemo(() => rows.filter(r => !r.read), [rows]);
    const shown = useMemo(() => (filter === 'unread' ? unread : rows), [rows, unread, filter]);

    // Time-based alerts computed on the fly (deadlines, overdue, meeting reminders, report reminder)
    const alerts = useMemo<Alert[]>(() => {
        const now = Date.now(), out: Alert[] = [];
        const mine = tasks.filter(t => t.assigned_to === me.id && t.status !== 'completed' && t.deadline);
        for (const t of mine) {
            const dl = new Date(t.deadline).getTime();
            if (dl < now) out.push({ type: 'task_overdue', title: `Overdue: ${t.title}`, body: `Was due ${fmtDT(t.deadline)}`, link: '/tasks' });
            else if (dl - now < 48 * 3600 * 1000) out.push({ type: 'task_deadline', title: `Due soon: ${t.title}`, body: `Due ${fmtDT(t.deadline)}`, link: '/tasks' });
        }
        for (const m of meetings) {
            if (m.status !== 'scheduled' || !(m.participants || []).includes(me.id)) continue;
            const at = new Date(m.scheduled_at).getTime();
            if (at > now && at - now < 48 * 3600 * 1000) out.push({ type: 'meeting_reminder', title: `Upcoming meeting: ${m.title}`, body: fmtDT(m.scheduled_at), link: '/meetings' });
        }
        // Weekly report reminder: no report from me covering the current week
        const ws = new Date(); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7)); // Monday
        const wsStr = ws.toISOString().slice(0, 10);
        if (!reports.some(r => r.founder_id === me.id && r.week_start === wsStr))
            out.push({ type: 'report_reminder', title: 'Weekly report reminder', body: `No report from you for the week of ${fmtDate(wsStr)} yet.`, link: '/reports' });
        return out;
    }, [tasks, meetings, reports, me.id]);

    const markRead = async (r: any) => {
        if (r.read) return;
        setRows(rows.map(x => x.id === r.id ? { ...x, read: true } : x));
        try { await repo.notifications.markRead(r.id); } catch {}
    };
    const markAll = async () => {
        setBusy(true);
        setRows(rows.map(x => ({ ...x, read: true })));
        try { await repo.notifications.markAllRead(); } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const remove = async (r: any) => {
        setRows(rows.filter(x => x.id !== r.id));
        try { await repo.notifications.remove(r.id); } catch {}
    };

    return <>
        <div className="topbar">
            <div><h1>Notifications</h1><p>In-app alerts and updates across the workspace.</p></div>
            <button className="btn ghost" disabled={busy || !unread.length} onClick={markAll}>Mark all read{unread.length ? ` (${unread.length})` : ''}</button>
        </div>
        {err && <div className="err">{err}</div>}

        {!!alerts.length && <>
            <h2 style={{ margin: '4px 0 10px' }}>Needs attention</h2>
            <div className="grid cards3" style={{ marginBottom: 20 }}>
                {alerts.map((a, i) => <Link key={i} to={a.link || '/'} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="card hover">
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                            <span className={`badge ${a.type === 'task_overdue' ? 'danger' : ''}`}>{ICONS[a.type] || label(a.type)}</span>
                        </div>
                        <h3 style={{ margin: '8px 0 4px', fontSize: 15 }}>{a.title}</h3>
                        {a.body && <small className="muted">{a.body}</small>}
                    </div>
                </Link>)}
            </div>
        </>}

        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Inbox</h2>
            <div className="chips" style={{ margin: 0 }}>
                <button className={`chip${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>All</button>
                <button className={`chip${filter === 'unread' ? ' on' : ''}`} onClick={() => setFilter('unread')}>Unread ({unread.length})</button>
            </div>
        </div>
        {!shown.length && <div className="empty">No notifications yet. They appear when tasks are assigned, documents are shared, meetings are scheduled, and more.</div>}
        {shown.map(r => <div key={r.id} className={`card notif${r.read ? '' : ' unread'}`} style={{ marginBottom: 8 }} onClick={() => markRead(r)}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                    {!r.read && <span className="dot-on" title="Unread" />}
                    <div>
                        <div style={{ fontWeight: r.read ? 400 : 600 }}>{r.title}</div>
                        {r.body && <small className="muted">{r.body}</small>}
                        <div><small className="muted">{ICONS[r.type] || label(r.type)} · {fmtDT(r.created_at)}</small></div>
                    </div>
                </div>
                <span className="row" style={{ gap: 6 }}>
                    {r.link && <Link to={r.link} className="btn ghost sm" onClick={e => e.stopPropagation()}>Open</Link>}
                    <button className="btn danger sm" onClick={e => { e.stopPropagation(); remove(r); }}>x</button>
                </span>
            </div>
        </div>)}
        <p className="muted" style={{ marginTop: 14 }}><small>Email and WhatsApp notifications are planned for a future phase.</small></p>
    </>;
}
