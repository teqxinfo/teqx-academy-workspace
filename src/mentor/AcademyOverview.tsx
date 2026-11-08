import React, { useEffect, useState } from 'react';
import { useMentor } from './MentorShell';
import { repo, logMentorActivity } from '../lib/data';

export function ProgressAreas({ group, title, subtitle }: { group: string; title: string; subtitle: string }) {
    const { me } = useMentor();
    const [rows, setRows] = useState<any[]>([]);
    const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

    const load = () => repo.aProgress.list(group).then(setRows).catch(e => setErr(e.message));
    useEffect(() => { load(); }, [group]);

    const setPct = async (a: any, pct: number) => {
        setErr('');
        try { await repo.aProgress.update(a.id, { pct }); setRows(rows.map(r => r.id === a.id ? { ...r, pct } : r)); }
        catch (e: any) { setErr(e.message); }
    };
    const saveNote = async (a: any, mentor_note: string) => {
        try {
            await repo.aProgress.update(a.id, { mentor_note });
            await logMentorActivity(me.id, 'progress_note', 'academy_progress', a.id, `Note on ${a.label}`);
            setMsg(`Note saved for ${a.label}`);
        } catch (e: any) { setErr(e.message); }
    };

    const avg = rows.length ? Math.round(rows.reduce((s, r) => s + (r.pct || 0), 0) / rows.length) : 0;

    return <>
        <div className="topbar"><div><h1>{title}</h1><p>{subtitle} - average {avg}%</p></div></div>
        {msg && <div className="ok">{msg}</div>}{err && <div className="err">{err}</div>}
        <div className="card" style={{ marginBottom: 12 }}><div className="bar" style={{ height: 10 }}><i style={{ width: `${avg}%` }} /></div></div>
        <div className="grid cards2">
            {rows.map(a => <div key={a.id} className="card">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                    <b style={{ fontSize: 13 }}>{a.label}</b><span className="mut small">{a.pct}%</span>
                </div>
                <input type="range" min={0} max={100} step={5} value={a.pct} onChange={e => setPct(a, Number(e.target.value))} style={{ width: '100%', margin: '8px 0' }} />
                {a.founder_note && <div className="small mut" style={{ marginBottom: 4 }}>Founder: {a.founder_note}</div>}
                <textarea rows={2} defaultValue={a.mentor_note || ''} placeholder="Your review note for this area..." onBlur={e => saveNote(a, e.target.value)} />
            </div>)}
        </div>
    </>;
}

export function AcademyOverview() {
    return <ProgressAreas group="dashboard" title="Academy Overview" subtitle="Overall academy progress areas" />;
}
export function BusinessProgress() {
    return <ProgressAreas group="business" title="Business Progress" subtitle="Business readiness areas" />;
}
