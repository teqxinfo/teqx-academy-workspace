import React, { useEffect, useState } from 'react';
import { repo, label } from '../lib/data';

export function MentorNotifications() {
    const [rows, setRows] = useState<any[]>([]);
    const [err, setErr] = useState('');
    const load = () => repo.mNotifications.list().then(setRows).catch(e => setErr(e.message));
    useEffect(() => { load(); }, []);

    const markRead = async (id: string) => { await repo.mNotifications.markRead(id); await load(); };
    const markAll = async () => { await repo.mNotifications.markAllRead(); await load(); };
    const remove = async (id: string) => { await repo.mNotifications.remove(id); await load(); };

    const unread = rows.filter(r => !r.read).length;

    return <>
        <div className="topbar"><div>
            <h1>Notifications</h1>
            <p>{unread ? `${unread} unread` : 'All caught up'} - founder activity across the workspace</p>
        </div>{unread > 0 && <button className="btn" onClick={markAll}>Mark all read</button>}</div>
        {err && <div className="err">{err}</div>}
        <div className="card">
            {rows.length ? rows.map(n => <div key={n.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
                <span className={`notif-dot${n.read ? ' read' : ''}`} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
                    <div className="mut small">{n.message}</div>
                    <div className="mut small" style={{ marginTop: 2 }}>{label(n.kind || 'general')} - {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                    {!n.read && <button className="btn ghost sm" onClick={() => markRead(n.id)}>Read</button>}
                    <button className="btn ghost sm danger" onClick={() => remove(n.id)}>Delete</button>
                </div>
            </div>) : <div className="empty">No notifications yet. Founder activity (documents, reports, task updates, milestones) will show up here.</div>}
        </div>
    </>;
}
