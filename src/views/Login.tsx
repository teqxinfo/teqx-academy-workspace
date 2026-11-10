import React, { useState } from 'react';
import { signIn, rpcPublic } from '../lib/sb';
import logoUrl from '../assets/logo.png';

export function Login({ onDone }: { onDone: () => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const go = async () => {
        setErr(''); setBusy(true);
        try {
            const name = username.trim().toLowerCase();
            // username -> hidden internal email (users never see or type an email)
            const email = await rpcPublic('resolve_username', { p_username: name });
            if (!email) throw new Error('Username not found');
            await signIn(email, password);
            onDone();
        }
        catch (e: any) { setErr(e.message || 'Sign in failed'); }
        setBusy(false);
    };
    return <div className="login-wrap"><div className="login-card">
        <div className="brandbox" style={{ marginBottom: 6 }}><img src={logoUrl} alt="Teqx Academy" className="brandimg" /></div>
        <p className="mut small" style={{ margin: '6px 0 20px' }}>Teqx Academy Workspace - sign in to continue</p>
        <label>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Your username" autoComplete="username" autoCapitalize="none" />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && go()} />
        <button className="btn" style={{ width: '100%', marginTop: 18, padding: 12 }} disabled={busy || !username || !password} onClick={go}>{busy ? 'Signing in...' : 'Sign in'}</button>
        {err && <div className="err">{err}</div>}
        <p className="mut small" style={{ textAlign: 'center', marginTop: 22, fontSize: 11 }}>Ask the admin for your username and password</p>
    </div></div>;
}
