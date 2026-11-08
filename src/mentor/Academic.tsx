import React, { useEffect, useState } from 'react';
import { useMentor } from './MentorShell';
import { repo, fmtDate, label } from '../lib/data';
import { CommentPanel } from './Comments';

export function AcademicReview() {
    const { founders } = useMentor();
    const [courses, setCourses] = useState<any[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [study, setStudy] = useState<any[]>([]);
    const [detail, setDetail] = useState<any | null>(null);
    const [err, setErr] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const [c, s] = await Promise.all([repo.courses.list(), repo.study.list()]);
                setCourses(c); setStudy(s);
                const modLists = await Promise.all(c.map((x: any) => repo.courseModules.list(x.id).catch(() => [])));
                setModules(modLists.flat());
            } catch (e: any) { setErr(e.message); }
        })();
    }, []);

    const nameOf = (id: string) => founders.find(f => f.id === id)?.full_name || '-';
    const coursePct = (cid: string) => {
        const mods = modules.filter(m => m.course_id === cid);
        if (!mods.length) return 0;
        return Math.round(mods.filter(m => m.status === 'completed').length / mods.length * 100);
    };

    return <>
        <div className="topbar"><div><h1>Academic Review</h1><p>Course development and study progress - read-only with comments</p></div></div>
        {err && <div className="err">{err}</div>}
        <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>Courses</h3>
        <div className="card" style={{ marginBottom: 16 }}>
            {courses.length ? <table><thead><tr><th>Course</th><th>Lead</th><th>Modules</th><th>Progress</th><th>Status</th></tr></thead><tbody>
                {courses.map(c => <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(detail?.id === c.id ? null : c)}>
                    <td>{c.title}</td><td>{nameOf(c.created_by)}</td>
                    <td className="mut">{modules.filter(m => m.course_id === c.id).length}</td>
                    <td style={{ minWidth: 120 }}><div className="small">{coursePct(c.id)}%<div className="bar"><i style={{ width: `${coursePct(c.id)}%` }} /></div></div></td>
                    <td><span className={`pill p-${c.development_status}`}>{label(c.development_status)}</span></td>
                </tr>)}
            </tbody></table> : <div className="empty">No courses yet.</div>}
        </div>
        {detail && <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>{detail.title}</h3>
            {detail.description && <p className="mut small" style={{ marginBottom: 8 }}>{detail.description}</p>}
            {modules.filter(m => m.course_id === detail.id).map(m => <div key={m.id} className="small" style={{ padding: '3px 0' }}>
                {m.title} <span className={`pill p-${m.status}`}>{label(m.status)}</span>
            </div>)}
            <CommentPanel entityType="course" entityId={detail.id} />
        </div>}
        <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>Study Progress</h3>
        <div className="grid cards3">
            {founders.map(f => {
                const mine = study.filter(s => s.founder_id === f.id);
                const done = mine.filter(s => s.learning_status === 'completed').length;
                const pct = mine.length ? Math.round(done / mine.length * 100) : 0;
                return <div key={f.id} className="card">
                    <b style={{ fontSize: 13 }}>{f.full_name}</b>
                    <div className="mut small" style={{ margin: '4px 0' }}>{done}/{mine.length} topics completed</div>
                    <div className="bar"><i style={{ width: `${pct}%`, background: 'var(--violet)' }} /></div>
                </div>;
            })}
        </div>
    </>;
}
