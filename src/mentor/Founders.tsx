import React, { useEffect, useState } from 'react';
import { useMentor } from './MentorShell';
import { repo, fmtDate, label, initials } from '../lib/data';

export function FounderMonitoring() {
    const { founders } = useMentor();
    const [open, setOpen] = useState<string | null>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [study, setStudy] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [docs, setDocs] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [err, setErr] = useState('');

    useEffect(() => {
        Promise.all([repo.tasks.list(), repo.study.list(), repo.courses.list(), repo.documents.list(), repo.reports.list()])
            .then(([t, s, c, d, r]) => { setTasks(t); setStudy(s); setCourses(c); setDocs(d); setReports(r); })
            .catch(e => setErr(e.message));
    }, []);

    return <>
        <div className="topbar"><div><h1>Founder Monitoring</h1><p>Read-only view of each founder's workload and output</p></div></div>
        {err && <div className="err">{err}</div>}
        {founders.map(f => {
            const mine = tasks.filter(t => t.assigned_to === f.id);
            const myStudy = study.filter(s => s.founder_id === f.id);
            const myCourses = courses.filter(c => c.created_by === f.id);
            const myDocs = docs.filter(d => d.responsible_founder === f.id);
            const myReports = reports.filter(r => r.founder_id === f.id);
            const studyPct = myStudy.length ? Math.round(myStudy.filter(s => s.learning_status === 'completed').length / myStudy.length * 100) : 0;
            const isOpen = open === f.id;
            return <div key={f.id} className="card" style={{ marginBottom: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : f.id)}>
                    <div className="row">
                        <div className="avatar">{initials(f.full_name)}</div>
                        <div><b>{f.full_name}</b><div className="mut small">{f.role_title} - {f.department}</div></div>
                    </div>
                    <div className="row" style={{ gap: 14 }}>
                        <span className="small mut">Tasks <b style={{ color: 'var(--txt)' }}>{mine.filter(t => t.status === 'completed').length}/{mine.length}</b></span>
                        <span className="small mut">Reports <b style={{ color: 'var(--txt)' }}>{myReports.length}</b></span>
                        <span className="small mut">Study <b style={{ color: 'var(--txt)' }}>{studyPct}%</b></span>
                        <button className="btn ghost sm">{isOpen ? 'Hide' : 'Details'}</button>
                    </div>
                </div>
                {isOpen && <div style={{ marginTop: 12 }}>
                    <div className="grid cards2">
                        <div>
                            <h4 style={{ fontSize: 13, marginBottom: 6 }}>Tasks</h4>
                            {mine.length ? <table style={{ fontSize: 12 }}><thead><tr><th>Task</th><th>Status</th><th>Deadline</th></tr></thead><tbody>
                                {mine.slice(0, 10).map(t => <tr key={t.id}><td>{t.title}</td><td><span className={`pill p-${t.status}`}>{label(t.status)}</span></td><td>{fmtDate(t.deadline)}</td></tr>)}
                            </tbody></table> : <div className="mut small">No tasks assigned.</div>}
                            <h4 style={{ fontSize: 13, margin: '12px 0 6px' }}>Courses ({myCourses.length})</h4>
                            {myCourses.length ? myCourses.slice(0, 6).map(c => <div key={c.id} className="small" style={{ padding: '3px 0' }}>{c.title} <span className={`pill p-${c.development_status}`}>{label(c.development_status)}</span></div>) : <div className="mut small">No courses.</div>}
                        </div>
                        <div>
                            <h4 style={{ fontSize: 13, marginBottom: 6 }}>Documents ({myDocs.length})</h4>
                            {myDocs.length ? myDocs.slice(0, 6).map(d => <div key={d.id} className="small" style={{ padding: '3px 0' }}>{d.title} <span className={`pill p-${d.status}`}>{label(d.status)}</span></div>) : <div className="mut small">No documents.</div>}
                            <h4 style={{ fontSize: 13, margin: '12px 0 6px' }}>Weekly Reports ({myReports.length})</h4>
                            {myReports.length ? <table style={{ fontSize: 12 }}><tbody>
                                {myReports.slice(0, 6).map(r => <tr key={r.id}><td>{r.report_code}</td><td>{fmtDate(r.week_start)}</td><td className="mut">{r.submitted_at ? 'submitted' : 'draft'}</td></tr>)}
                            </tbody></table> : <div className="mut small">No reports submitted.</div>}
                            <h4 style={{ fontSize: 13, margin: '12px 0 6px' }}>Study</h4>
                            <div className="small">{myStudy.filter(s => s.learning_status === 'completed').length}/{myStudy.length} topics completed
                                <div className="bar"><i style={{ width: `${studyPct}%`, background: 'var(--violet)' }} /></div></div>
                        </div>
                    </div>
                </div>}
            </div>;
        })}
    </>;
}
