import React, { useEffect, useState } from 'react';
import { useMentor } from './MentorShell';
import { repo, logMentorActivity, fmtDate } from '../lib/data';

export function CommentPanel({ entityType, entityId }: { entityType: string; entityId: string }) {
    const { me } = useMentor();
    const [rows, setRows] = useState<any[]>([]);
    const [body, setBody] = useState('');
    const [err, setErr] = useState('');
    const load = () => repo.mComments.list(entityType, entityId).then(setRows).catch(e => setErr(e.message));
    useEffect(() => { setBody(''); load(); }, [entityType, entityId]);

    const add = async () => {
        if (!body.trim()) return;
        setErr('');
        try {
            await repo.mComments.add({ mentor_id: me.id, entity_type: entityType, entity_id: entityId, body: body.trim() });
            await logMentorActivity(me.id, 'comment_added', entityType, entityId, `Comment on ${entityType}: ${body.trim().slice(0, 80)}`);
            setBody(''); await load();
        } catch (e: any) { setErr(e.message); }
    };
    const remove = async (id: string) => { await repo.mComments.remove(id); await load(); };

    return <div style={{ marginTop: 10 }}>
        <h4 style={{ fontSize: 13, marginBottom: 6 }}>Mentor Comments</h4>
        {err && <div className="err">{err}</div>}
        {rows.length ? rows.map(c => <div key={c.id} className="row" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
                <div>{c.body}</div>
                <div className="mut small">{c.mentor_id === me.id ? 'You' : 'Mentor'} - {fmtDate(c.created_at)}</div>
            </div>
            {c.mentor_id === me.id && <button className="btn ghost sm danger" onClick={() => remove(c.id)}>Delete</button>}
        </div>) : <div className="mut small" style={{ marginBottom: 6 }}>No comments yet.</div>}
        <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <input value={body} onChange={e => setBody(e.target.value)} placeholder="Add a comment the founders can read..." style={{ flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') add(); }} />
            <button className="btn sm" onClick={add}>Comment</button>
        </div>
    </div>;
}
