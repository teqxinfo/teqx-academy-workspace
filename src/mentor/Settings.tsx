import React from 'react';
import { useMentor } from './MentorShell';
import { signOut } from '../lib/sb';

export function MentorSettings() {
    const { me, dark, toggleTheme } = useMentor();
    return <>
        <div className="topbar"><div><h1>Settings</h1><p>Portal preferences and account</p></div></div>
        <div className="grid cards2">
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Appearance</h3>
                <label className="row" style={{ justifyContent: 'space-between' }}>
                    <span>Dark theme</span>
                    <input type="checkbox" checked={dark} onChange={toggleTheme} style={{ width: 'auto' }} />
                </label>
            </div>
            <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 10 }}>Account</h3>
                <div className="small mut" style={{ marginBottom: 4 }}>Signed in as {me.full_name} ({me.mentor_code})</div>
                <div className="small mut" style={{ marginBottom: 10 }}>{me.email}</div>
                <div className="small mut" style={{ marginBottom: 10 }}>Profile, notification preferences and password are under My Profile. Module access is managed by the founders.</div>
                <button className="btn ghost" onClick={async () => { await signOut(); location.reload(); }}>Sign out</button>
            </div>
        </div>
    </>;
}
