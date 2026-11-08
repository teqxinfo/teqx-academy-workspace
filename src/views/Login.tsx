import React, { useState } from 'react';
import { signIn } from '../lib/sb';
import logoUrl from '../assets/logo.png';

export function Login({ onDone }: { onDone: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const go = async () => {
        setErr(''); setBusy(true);
        try { await signIn(email.trim(), password); onDone(); }
        catch (e: any) { setErr(e.message || 'Sign in failed'); }
        setBusy(false);
    };
    return <div className="login-wrap"><div className="login-card">
        <div className="brandbox" style={{ marginBottom: 6 }}><img src={logoUrl} alt="Teqx Academy" className="brandimg" /></div>
        <p className="mut small" style={{ margin: '6px 0 20px' }}>Founder Workspace - sign in to continue</p>
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@teqx.in" autoComplete="email" />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && go()} />
        <button className="btn" style={{ width: '100%', marginTop: 18, padding: 12 }} disabled={busy || !email || !password} onClick={go}>{busy ? 'Signing in...' : 'Sign in'}</button>
        {err && <div className="err">{err}</div>}
        <p className="mut small" style={{ textAlign: 'center', marginTop: 22, fontSize: 11 }}>Founder access only - Afvan · Razin · Jaleel</p>
    </div></div>;
}
