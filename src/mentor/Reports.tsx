import React, { useEffect, useState } from 'react';
import { useMentor } from './MentorShell';
import { repo, fmtDate } from '../lib/data';
import { CommentPanel } from './Comments';

export function MentorWeeklyReports() {
    const { founders } = useMentor();
    const [reports, setReports] = useState<any[]>([]);
    const [view, setView] = useState<any | null>(null);
    const [founder, setFounder] = useState('all');
    const [err, setErr] = useState('');

    useEffect(() => { repo.reports.list().then(setReports).catch(e => setErr(e.message)); }, []);
    const nameOf = (id: string) => founders.find(f => f.id === id)?.full_name || '-';
    const shown = reports.filter(r => founder === 'all' || r.founder_id === founder);

    const Section = ({ title, text }: { title: string; text?: string | null }) => text ? <div style={{ marginBottom: 10 }}>
        <div className="small" style={{ fontWeight: 600 }}>{title}</div>
        <div className="small mut" style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
    </div> : null;

    return <>
        <div className="topbar"><div><h1>Weekly Reports</h1><p>Founder weekly reports - read and comment</p></div>
            <select value={founder} onChange={e => setFounder(e.target.value)} style={{ maxWidth: 180 }}>
                <option value="all">All founders</option>
                {founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select></div>
        {err && <div className="err">{err}</div>}
        <div className="card">
            {shown.length ? <table><thead><tr><th>Code</th><th>Founder</th><th>Week</th><th>Submitted</th></tr></thead><tbody>
                {shown.map(r => <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setView(view?.id === r.id ? null : r)}>
                    <td className="mut">{r.report_code}</td><td>{nameOf(r.founder_id)}</td>
                    <td>{fmtDate(r.week_start)} - {fmtDate(r.week_end)}</td>
                    <td className="mut">{r.submitted_at ? fmtDate(r.submitted_at) : 'draft'}</td>
                </tr>)}
            </tbody></table> : <div className="empty">No weekly reports yet.</div>}
        </div>
        {view && <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>{view.report_code} - {nameOf(view.founder_id)} ({fmtDate(view.week_start)} - {fmtDate(view.week_end)})</h3>
            <Section title="Achievements" text={view.achievements} />
            <Section title="Completed tasks" text={view.completed_tasks} />
            <Section title="Pending tasks" text={view.pending_tasks} />
            <Section title="Challenges" text={view.challenges} />
            <Section title="Study progress" text={view.study_progress} />
            <Section title="Next week plan" text={view.next_week_plan} />
            <CommentPanel entityType="report" entityId={view.id} />
        </div>}
    </>;
}
