import React, { useEffect, useState } from 'react';
import { useApp } from '../App';
import { repo, fmtDate, label } from '../lib/data';
import { dbSelect, dbInsert, dbUpdate, dbUpsert, dbDelete } from '../lib/sb';

function MentorAccess() {
    const [mentors, setMentors] = useState<any[]>([]);
    const [perms, setPerms] = useState<any[]>([]);
    const [form, setForm] = useState({ full_name: '', email: '', designation: '', specialization: '' });
    const [showForm, setShowForm] = useState(false);
    const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
    const load = () => Promise.all([repo.mentorsAdmin.list(), dbSelect('mentor_permissions', {})])
        .then(([m, p]) => { setMentors(m); setPerms(p); }).catch(e => setErr(e.message));
    useEffect(() => { load(); }, []);

    const nextCode = async () => {
        const rows: any[] = await dbSelect('mentors', { select: 'mentor_code' });
        let n = 0; rows.forEach(r => { const m = /^MNT-(\d+)$/.exec(r.mentor_code || ''); if (m) n = Math.max(n, parseInt(m[1])); });
        return `MNT-${String(n + 1).padStart(4, '0')}`;
    };
    const create = async () => {
        setMsg(''); setErr('');
        if (!form.full_name.trim()) return setErr('Name is required');
        try {
            await dbInsert('mentors', { mentor_code: await nextCode(), full_name: form.full_name.trim(), email: form.email.trim() || null, designation: form.designation || null, specialization: form.specialization || null, is_active: true });
            setForm({ full_name: '', email: '', designation: '', specialization: '' }); setShowForm(false);
            setMsg('Mentor added. Ask Instinct to create the login once the mentor shares an email.');
            await load();
        } catch (e: any) { setErr(e.message); }
    };
    const toggleActive = async (m: any) => { await dbUpdate('mentors', m.id, { is_active: !m.is_active }); await load(); };
    const remove = async (m: any) => { await dbUpdate('mentors', m.id, { deleted_at: new Date().toISOString() }); await load(); };
    const financeAllowed = (mid: string) => !!perms.find(p => p.mentor_id === mid && p.module === 'finance')?.allowed;
    const toggleFinance = async (m: any) => {
        await dbUpsert('mentor_permissions', { mentor_id: m.id, module: 'finance', allowed: !financeAllowed(m.id) }, 'mentor_id,module');
        await load();
    };

    return <>
        <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Mentor Access</h3>
        {msg && <div className="ok">{msg}</div>}{err && <div className="err">{err}</div>}
        {mentors.length ? <table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Login</th><th>Finance access</th><th>Status</th><th></th></tr></thead><tbody>
            {mentors.map(m => <tr key={m.id}>
                <td className="mut">{m.mentor_code}</td><td><b>{m.full_name}</b></td><td className="small">{m.email || '-'}</td>
                <td className="small">{m.auth_user_id ? <span className="pill p-active">Linked</span> : <span className="mut">not created</span>}</td>
                <td><input type="checkbox" style={{ width: 'auto' }} checked={financeAllowed(m.id)} onChange={() => toggleFinance(m)} /></td>
                <td><span className={`pill p-${m.is_active ? 'active' : 'archived'}`}>{m.is_active ? 'Active' : 'Disabled'}</span></td>
                <td><div className="row" style={{ gap: 4 }}>
                    <button className="btn ghost sm" onClick={() => toggleActive(m)}>{m.is_active ? 'Disable' : 'Enable'}</button>
                    <button className="btn ghost sm danger" onClick={() => remove(m)}>Remove</button>
                </div></td>
            </tr>)}
        </tbody></table> : <p className="mut small">No mentor added yet.</p>}
        {showForm ? <div style={{ marginTop: 8 }}>
            <div className="grid cards2">
                <label>Full name<input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>
                <label>Email (for login)<input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
                <label>Designation<input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Business Mentor" /></label>
                <label>Specialization<input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} /></label>
            </div>
            <div className="row" style={{ marginTop: 6, gap: 6 }}>
                <button className="btn" onClick={create}>Add mentor</button>
                <button className="btn ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
            <p className="mut small" style={{ marginTop: 6 }}>The mentor row is created instantly. The login itself is provisioned on request (same as founder logins) - share the mentor's email with Instinct.</p>
        </div> : <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setShowForm(true)}>+ Add mentor</button>}
    </>;
}

const TABLES = ['founders', 'tasks', 'task_updates', 'study_items', 'documents', 'document_acl', 'courses', 'course_modules', 'weekly_reports', 'decisions', 'expenses', 'activity_log', 'app_settings',
    'mentors', 'mentor_permissions', 'mentor_comments', 'mentor_reviews', 'mentor_notifications', 'mentor_activity_log',
    'recommendations', 'recommendation_responses', 'milestones', 'milestone_updates', 'mentoring_meetings', 'mentoring_meeting_notes', 'academy_progress',
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
                <MentorAccess />
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
