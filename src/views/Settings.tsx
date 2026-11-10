import React, { useEffect, useState } from 'react';
import { useApp } from '../App';
import { repo, fmtDate, label } from '../lib/data';
import { dbSelect, dbInsert, dbUpdate, dbUpsert, dbDelete } from '../lib/sb';

const TABLES = ['founders', 'tasks', 'task_updates', 'study_items', 'documents', 'document_acl', 'courses', 'course_modules', 'weekly_reports', 'decisions', 'expenses', 'activity_log', 'app_settings',
    'market_research', 'competitors', 'brand_assets', 'content_calendar', 'campaigns', 'leads', 'lead_followups',
    'income', 'budgets', 'founder_contributions', 'outstanding_payments', 'transaction_edits',
    'meetings', 'meeting_action_items', 'decision_acknowledgements',
    'knowledge_items', 'knowledge_comments', 'knowledge_sessions', 'notifications'];

export function Settings() {
    const { me, founders, dark, toggleTheme } = useApp();
    const [activity, setActivity] = useState<any[]>([]);
    const [err, setErr] = useState('');
    const [backupState, setBackupState] = useState('');

    useEffect(() => { repo.activity.list(20).then(setActivity).catch(() => {}); }, []);
    const nameOf = (id?: string) => founders.find(f => f.id === id)?.full_name || 'System';

    const backup = async () => {
        setBackupState('Building backup...'); setErr('');
        try {
            const out: any = { exported_at: new Date().toISOString(), exported_by: me.full_name, tables: {}, skipped: [] as string[] };
            for (const t of TABLES) { try { out.tables[t] = await dbSelect(t, {}); } catch { out.skipped.push(t); } }
            const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `teqx-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            setBackupState(`Downloaded (${Object.keys(out.tables).length} tables${out.skipped.length ? `, ${out.skipped.length} skipped (no read access)` : ''}).`);
        } catch (e: any) { setErr(e.message); setBackupState(''); }
    };

    return <>
        <div className="topbar"><div><h1>Settings</h1><p>Profile, preferences, data</p></div></div>
        {err && <div className="err">{err}</div>}
        <div className="grid cards2">
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>My Profile</h3>
                <div className="row" style={{ marginBottom: 10 }}>
                    <div className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>{me.full_name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                    <div><b>{me.full_name}</b><div className="mut small">{me.role_title}</div></div>
                </div>
                <table><tbody>
                    <tr><td className="mut">Founder ID</td><td>{me.founder_code}</td></tr>
                    <tr><td className="mut">Department</td><td>{me.department || '-'}</td></tr>
                    <tr><td className="mut">Login email</td><td>{me.email || '-'}</td></tr>
                </tbody></table>
                <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Appearance</h3>
                <div className="row"><span className="small">Theme</span>
                    <button className={`chip${dark ? ' on' : ''}`} onClick={() => !dark && toggleTheme()}>Dark</button>
                    <button className={`chip${!dark ? ' on' : ''}`} onClick={() => dark && toggleTheme()}>Light</button>
                </div>
            </div>
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>Founders</h3>
                <table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>
                    {founders.map(f => <tr key={f.id}><td className="mut">{f.founder_code}</td><td><b>{f.full_name}</b></td><td className="small">{f.role_title}</td>
                        <td><span className={`pill p-${f.is_active ? 'active' : 'archived'}`}>{f.is_active ? 'Active' : 'Inactive'}</span></td></tr>)}
                </tbody></table>
                <p className="mut small" style={{ marginTop: 12 }}>Founder logins are managed by Afvan. New login IDs are created on request.</p>
                <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Data & backup</h3>
                <p className="mut small">All data lives in Teqx's own Supabase database (Mumbai region). Download a full JSON backup of every table any time.</p>
                <div className="row" style={{ marginTop: 8 }}><button className="btn ghost" onClick={backup}>Download full backup</button>{backupState && <span className="small mut">{backupState}</span>}</div>
            </div>
        </div>
        <div className="card">
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>Recent activity</h3>
            {activity.length ? <table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>What</th></tr></thead><tbody>
                {activity.map(a => <tr key={a.id}><td className="mut small">{fmtDate(a.created_at)}</td><td>{nameOf(a.actor_id)}</td>
                    <td><span className="pill p-shared">{label(a.action)}</span></td><td className="small">{a.summary}</td></tr>)}
            </tbody></table> : <div className="empty">No activity recorded yet.</div>}
        </div>
    </>;
}
