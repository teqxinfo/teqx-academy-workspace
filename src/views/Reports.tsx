import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import { repo, logActivity, fmtDate } from '../lib/data';
import { MentorCommentsBlock } from './MentorComments';

function monday(d: Date): string {
    const x = new Date(d); const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day); return x.toISOString().slice(0, 10);
}
const empty = () => {
    const ws = monday(new Date());
    const we = new Date(ws); we.setDate(we.getDate() + 6);
    return { week_start: ws, week_end: we.toISOString().slice(0, 10), completed_tasks: '', pending_tasks: '', study_progress: '', achievements: '', challenges: '', next_week_plan: '' };
};

export function Reports() {
    const { me, founders } = useApp();
    const [reports, setReports] = useState<any[]>([]);
    const [err, setErr] = useState('');
    const [form, setForm] = useState<any>(null);
    const [view, setView] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [comment, setComment] = useState('');
    const [busy, setBusy] = useState(false);

    const load = async () => { try { setReports(await repo.reports.list()); } catch (e: any) { setErr(e.message); } };
    useEffect(() => { load(); }, []);
    useEffect(() => { if (view) { setComment(''); repo.reportComments.list(view.id).then(setComments).catch(() => setComments([])); } }, [view?.id]);

    const addComment = async () => {
        if (!comment.trim()) return;
        setBusy(true);
        try {
            await repo.reportComments.add({ report_id: view.id, founder_id: me.id, body: comment.trim() });
            await logActivity(me.id, 'weekly_report', view.id, 'comment', `reviewed ${view.report_code}`);
            setComment(''); setComments(await repo.reportComments.list(view.id));
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };
    const removeComment = async (c: any) => { await repo.reportComments.remove(c.id); setComments(await repo.reportComments.list(view.id)); };

    const exportPdf = async (r: any) => {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        let y = 20;
        const line = (txt: string, size = 11, bold = false, gap = 7) => {
            doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal');
            const lines = doc.splitTextToSize(txt, 175);
            for (const l of lines) { if (y > 280) { doc.addPage(); y = 20; } doc.text(l, 17, y); y += gap; }
        };
        line('Teqx Academy - Weekly Founder Report', 15, true, 9);
        line(`${nameOf(r.founder_id)}  -  week of ${fmtDate(r.week_start)} to ${fmtDate(r.week_end)}`, 11, false, 6);
        line(`${r.report_code}  -  submitted ${fmtDate(r.submitted_at)}`, 9, false, 12);
        const sec = (title: string, body?: string) => { if (!body) return; line(title.toUpperCase(), 9, true, 5); line(body, 10.5, false, 5.5); y += 3; };
        sec('Completed tasks', r.completed_tasks); sec('Pending tasks', r.pending_tasks);
        sec('Study progress', r.study_progress); sec('Achievements', r.achievements);
        sec('Challenges', r.challenges); sec('Next week plan', r.next_week_plan);
        doc.save(`${r.report_code}-${r.week_start}.pdf`);
    };

    const nameOf = (id?: string) => founders.find(f => f.id === id)?.full_name || '-';
    const weeks = useMemo(() => {
        const m: Record<string, any[]> = {};
        for (const r of reports) (m[r.week_start] = m[r.week_start] || []).push(r);
        return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]));
    }, [reports]);
    const myThisWeek = reports.find(r => r.founder_id === me.id && r.week_start === monday(new Date()));

    const save = async () => {
        setBusy(true); setErr('');
        try {
            const row: any = {
                week_start: form.week_start, week_end: form.week_end,
                completed_tasks: form.completed_tasks || null, pending_tasks: form.pending_tasks || null,
                study_progress: form.study_progress || null, achievements: form.achievements || null,
                challenges: form.challenges || null, next_week_plan: form.next_week_plan || null,
                updated_at: new Date().toISOString(),
            };
            if (form.id) { await repo.reports.update(form.id, row); await logActivity(me.id, 'weekly_report', form.id, 'update', `updated report for week of ${fmtDate(row.week_start)}`); }
            else {
                const r = await repo.reports.create({ ...row, founder_id: me.id, submitted_at: new Date().toISOString() });
                await logActivity(me.id, 'weekly_report', r.id, 'submit', `submitted report for week of ${fmtDate(row.week_start)}`);
            }
            setForm(null); await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };

    const F = ({ k, v }: any) => v ? <div style={{ marginBottom: 10 }}><div className="mut" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 3 }}>{k}</div><div className="small" style={{ whiteSpace: 'pre-wrap' }}>{v}</div></div> : null;

    return <>
        <div className="topbar"><div><h1>Weekly Reports</h1><p>{myThisWeek ? 'Your report for this week is in' : 'No report from you this week yet'}</p></div>
            <button className="btn" onClick={() => setForm(myThisWeek ? { ...myThisWeek } : empty())}>{myThisWeek ? 'Edit this week\'s report' : '+ Submit this week\'s report'}</button></div>
        {err && <div className="err">{err}</div>}
        {weeks.length === 0 && <div className="empty">No reports yet.</div>}
        {weeks.map(([ws, rs]) => <div className="card" key={ws}>
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>Week of {fmtDate(ws)} <span className="mut" style={{ fontWeight: 400, fontSize: 11 }}>({rs.length} of {founders.length} founders)</span></h3>
            <table><thead><tr><th>ID</th><th>Founder</th><th>Completed</th><th>Pending</th><th>Submitted</th><th></th></tr></thead><tbody>
                {rs.map(r => <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setView(r)}>
                    <td className="mut">{r.report_code}</td>
                    <td><b>{nameOf(r.founder_id)}</b></td>
                    <td className="small">{(r.completed_tasks || '-').slice(0, 60)}</td>
                    <td className="small">{(r.pending_tasks || '-').slice(0, 60)}</td>
                    <td className="mut small">{fmtDate(r.submitted_at)}</td>
                    <td onClick={e => e.stopPropagation()}>{r.founder_id === me.id && <button className="btn ghost sm" onClick={() => setForm({ ...r })}>Edit</button>}</td>
                </tr>)}
            </tbody></table>
        </div>)}

        {form && <div className="modal-bg" onClick={() => setForm(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{form.id ? `Edit ${form.report_code}` : 'Weekly Report'}</h2>
            <div className="field-row">
                <div><label>Week start (Mon)</label><input type="date" value={form.week_start} onChange={e => setForm({ ...form, week_start: e.target.value })} /></div>
                <div><label>Week end (Sun)</label><input type="date" value={form.week_end} onChange={e => setForm({ ...form, week_end: e.target.value })} /></div>
            </div>
            <label>Completed tasks</label><textarea value={form.completed_tasks || ''} onChange={e => setForm({ ...form, completed_tasks: e.target.value })} />
            <label>Pending tasks</label><textarea value={form.pending_tasks || ''} onChange={e => setForm({ ...form, pending_tasks: e.target.value })} style={{ minHeight: 50 }} />
            <label>Study progress</label><textarea value={form.study_progress || ''} onChange={e => setForm({ ...form, study_progress: e.target.value })} style={{ minHeight: 50 }} />
            <label>Achievements</label><textarea value={form.achievements || ''} onChange={e => setForm({ ...form, achievements: e.target.value })} style={{ minHeight: 50 }} />
            <label>Challenges</label><textarea value={form.challenges || ''} onChange={e => setForm({ ...form, challenges: e.target.value })} style={{ minHeight: 50 }} />
            <label>Next week plan</label><textarea value={form.next_week_plan || ''} onChange={e => setForm({ ...form, next_week_plan: e.target.value })} style={{ minHeight: 50 }} />
            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
                <button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving...' : form.id ? 'Save' : 'Submit'}</button>
            </div>
        </div></div>}

        {view && <div className="modal-bg" onClick={() => setView(null)}><div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{nameOf(view.founder_id)} - week of {fmtDate(view.week_start)}</h2>
            <p className="mut small" style={{ margin: '4px 0 14px' }}>{view.report_code} - submitted {fmtDate(view.submitted_at)}</p>
            <F k="Completed tasks" v={view.completed_tasks} /><F k="Pending tasks" v={view.pending_tasks} />
            <F k="Study progress" v={view.study_progress} /><F k="Achievements" v={view.achievements} />
            <F k="Challenges" v={view.challenges} /><F k="Next week plan" v={view.next_week_plan} />
            <div className="row" style={{ marginTop: 6, justifyContent: 'flex-end' }}>
                <button className="btn sm" onClick={() => exportPdf(view)}>Export PDF</button>
            </div>
            <h3 style={{ fontSize: 14, margin: '16px 0 10px' }}>Review & comments ({comments.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflow: 'auto', marginBottom: 10 }}>
                {comments.length ? comments.map(c => <div key={c.id} className="card" style={{ padding: 10 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                        <b style={{ fontSize: 12.5 }}>{nameOf(c.founder_id)}</b>
                        <span className="row" style={{ gap: 6 }}>
                            <small className="mut">{fmtDate(c.created_at)}</small>
                            {c.founder_id === me.id && <button className="btn danger sm" onClick={() => removeComment(c)}>x</button>}
                        </span>
                    </div>
                    <div className="small" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                </div>) : <div className="mut small">No reviews yet.</div>}
            </div>
            <div className="row"><input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a review comment..." onKeyDown={e => e.key === 'Enter' && addComment()} /><button className="btn sm" disabled={busy || !comment.trim()} onClick={addComment}>Add</button></div>
            <MentorCommentsBlock entityType="report" entityId={view.id} />
            <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}><button className="btn ghost" onClick={() => setView(null)}>Close</button></div>
        </div></div>}
    </>;
}
