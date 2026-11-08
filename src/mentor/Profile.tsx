import React, { useState } from 'react';
import { useMentor } from './MentorShell';
import { dbUpdate, changePassword } from '../lib/sb';

const PREF_KEYS: [string, string][] = [
    ['document_status', 'Document status changes'],
    ['weekly_report', 'Weekly report submissions'],
    ['task_update', 'Task status changes'],
    ['milestone_update', 'Milestone updates'],
];

export function MentorProfile() {
    const { me, refresh, dark, toggleTheme } = useMentor();
    const [form, setForm] = useState({ full_name: me.full_name, designation: me.designation || '', specialization: me.specialization || '', phone: me.phone || '', bio: me.bio || '' });
    const prefs: Record<string, boolean> = { document_status: true, weekly_report: true, task_update: true, milestone_update: true, ...(me.notif_prefs || {}) };
    const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
    const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

    const save = async () => {
        setMsg(''); setErr('');
        if (!form.full_name.trim()) return setErr('Name is required');
        try { await dbUpdate('mentors', me.id, form); await refresh(); setMsg('Profile saved'); }
        catch (e: any) { setErr(e.message); }
    };
    const togglePref = async (k: string) => {
        const next = { ...prefs, [k]: !prefs[k] };
        try { await dbUpdate('mentors', me.id, { notif_prefs: next }); await refresh(); }
        catch (e: any) { setErr(e.message); }
    };
    const changePw = async () => {
        setMsg(''); setErr('');
        if (pw.length < 8) return setErr('Password must be at least 8 characters');
        if (pw !== pw2) return setErr('Passwords do not match');
        try { await changePassword(pw); setPw(''); setPw2(''); setMsg('Password changed'); }
        catch (e: any) { setErr(e.message); }
    };

    return <>
        <div className="topbar"><div><h1>My Profile</h1><p>Your mentor identity and preferences</p></div></div>
        {msg && <div className="ok">{msg}</div>}{err && <div className="err">{err}</div>}
        <div className="grid cards2">
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Profile</h3>
                <label>Full name<input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></label>
                <label>Designation<input value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Business Mentor" /></label>
                <label>Specialization<input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. EdTech, Startup Operations" /></label>
                <label>Phone<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
                <label>Bio<textarea rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></label>
                <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn" onClick={save}>Save profile</button>
                    <span className="mut small">Mentor code: {me.mentor_code}</span>
                </div>
                <div className="mut small" style={{ marginTop: 6 }}>Sign-in email: {me.email || '-'}</div>
            </div>
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Notification Preferences</h3>
                {PREF_KEYS.map(([k, lbl]) => <label key={k} className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
                    <span>{lbl}</span>
                    <input type="checkbox" checked={!!prefs[k]} onChange={() => togglePref(k)} style={{ width: 'auto' }} />
                </label>)}
                <h3 style={{ fontSize: 14, margin: '14px 0 10px' }}>Appearance</h3>
                <label className="row" style={{ justifyContent: 'space-between' }}>
                    <span>Dark theme</span>
                    <input type="checkbox" checked={dark} onChange={toggleTheme} style={{ width: 'auto' }} />
                </label>
                <h3 style={{ fontSize: 14, margin: '14px 0 10px' }}>Change Password</h3>
                <label>New password<input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" /></label>
                <label>Repeat password<input type="password" value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" /></label>
                <button className="btn" style={{ marginTop: 6 }} onClick={changePw}>Change password</button>
            </div>
        </div>
    </>;
}
