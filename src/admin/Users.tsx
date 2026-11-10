import React, { useEffect, useState } from 'react';
import { dbSelect, rpcCall, getSession } from '../lib/sb';

type Row = {
    username: string; auth_user_id: string; created_at: string;
    link: string; // display: which record this login opens
};

export function AdminUsers() {
    const [rows, setRows] = useState<Row[]>([]);
    const [founders, setFounders] = useState<any[]>([]);
    const [err, setErr] = useState('');
    const [ok, setOk] = useState('');
    // create form
    const [uname, setUname] = useState('');
    const [fname, setFname] = useState('');
    const [pw, setPw] = useState('');
    const [linkType, setLinkType] = useState('none');
    const [linkId, setLinkId] = useState('');
    const [busy, setBusy] = useState(false);
    // reset / delete
    const [resetRow, setResetRow] = useState<Row | null>(null);
    const [newPw, setNewPw] = useState('');
    const [delRow, setDelRow] = useState<Row | null>(null);

    const myUid = getSession()?.user?.id;

    const load = async () => {
        setErr('');
        try {
            const [uns, fs, as] = await Promise.all([
                dbSelect<any>('usernames', { order: 'username' }),
                dbSelect<any>('founders', { select: 'id,full_name,founder_code,auth_user_id' }),
                dbSelect<any>('admin_users', { select: 'id,full_name,email,auth_user_id' }),
            ]);
            setFounders(fs);
            const linkOf = (uid: string) => {
                const f = fs.find((x: any) => x.auth_user_id === uid);
                if (f) return `Founder - ${f.full_name} (${f.founder_code})`;
                const a = as.find((x: any) => x.auth_user_id === uid);
                if (a) return `Admin - ${a.full_name}`;
                return 'No link (signs in but has no workspace role)';
            };
            setRows(uns.map((u: any) => ({ ...u, link: linkOf(u.auth_user_id) })));
        } catch (e: any) { setErr(e.message); }
    };
    useEffect(() => { load(); }, []);

    // link picker value: 'none' | 'admin' | 'founder:<id>'
    const linkVal = linkType === 'none' || linkType === 'admin' ? linkType : `${linkType}:${linkId}`;
    const pickLink = (v: string) => {
        if (v === 'none' || v === 'admin') { setLinkType(v); setLinkId(''); return; }
        const [t, id] = v.split(':');
        setLinkType(t); setLinkId(id);
    };

    const create = async () => {
        setBusy(true); setErr(''); setOk('');
        try {
            const lt = linkType === 'none' ? null : linkType;
            const lid = linkType === 'founder' ? (linkId || null) : null;
            if (linkType === 'founder' && !lid) throw new Error('Pick which founder record this login opens');
            await rpcCall('admin_create_user', { p_username: uname, p_password: pw, p_full_name: fname, p_link_type: lt, p_link_id: lid });
            setOk(`Login created: ${uname.trim().toLowerCase()}`);
            setUname(''); setFname(''); setPw(''); setLinkType('none'); setLinkId('');
            await load();
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };

    const doReset = async () => {
        if (!resetRow) return;
        setBusy(true); setErr(''); setOk('');
        try {
            await rpcCall('admin_reset_password', { p_username: resetRow.username, p_password: newPw });
            setOk(`Password reset for ${resetRow.username}`);
            setResetRow(null); setNewPw('');
        } catch (e: any) { setErr(e.message); }
        setBusy(false);
    };

    const doDelete = async () => {
        if (!delRow) return;
        setBusy(true); setErr(''); setOk('');
        try {
            await rpcCall('admin_delete_user', { p_username: delRow.username });
            setOk(`Login deleted: ${delRow.username}`);
            setDelRow(null); await load();
        } catch (e: any) { setErr(e.message); setDelRow(null); }
        setBusy(false);
    };

    return <div>
        <div className="topbar">
            <div><h1>User Accounts</h1><p>Create username + password logins - no email or Gmail needed. Users sign in with just their username and password.</p></div>
        </div>
        {err && <div className="card" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>{err}</div>}
        {ok && <div className="card" style={{ borderColor: 'var(--green)', color: 'var(--green)' }}>{ok}</div>}

        <div className="card">
            <h3>Create login</h3>
            <div className="field-row">
                <div><label>Username *</label><input value={uname} onChange={e => setUname(e.target.value)} placeholder="e.g. razin" autoCapitalize="none" /></div>
                <div><label>Full name</label><input value={fname} onChange={e => setFname(e.target.value)} placeholder="Display name" /></div>
            </div>
            <div className="field-row">
                <div><label>Password * (min 8 chars - you choose it and share it with them)</label><input value={pw} onChange={e => setPw(e.target.value)} placeholder="Set their password" autoComplete="off" /></div>
                <div><label>This login opens</label>
                    <select value={linkVal} onChange={e => pickLink(e.target.value)}>
                        <option value="none">No link</option>
                        <option value="admin">New admin</option>
                        <optgroup label="Founders without a login">
                            {founders.filter(f => !f.auth_user_id).map(f => <option key={f.id} value={`founder:${f.id}`}>{f.full_name} ({f.founder_code})</option>)}
                        </optgroup>
                    </select>
                    <div className="mut" style={{ fontSize: 11, marginTop: 4 }}>The role comes from your pick: founder or admin.</div>
                </div>
            </div>
            <button className="btn" style={{ marginTop: 12 }} disabled={busy || uname.trim().length < 3 || pw.length < 8} onClick={create}>{busy ? 'Creating...' : 'Create login'}</button>
        </div>

        <div className="card" style={{ overflowX: 'auto' }}>
            <h3 style={{ marginBottom: 10 }}>Logins ({rows.length})</h3>
            <table>
                <thead><tr><th>Username</th><th>Opens</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                    {rows.map(r => <tr key={r.username}>
                        <td style={{ fontWeight: 600 }}>{r.username}{r.auth_user_id === myUid ? ' (you)' : ''}</td>
                        <td>{r.link}</td>
                        <td>{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn ghost sm" onClick={() => { setResetRow(r); setNewPw(''); }}>Reset password</button>{' '}
                            {r.auth_user_id === myUid
                                ? <span className="pill p-restricted">Protected</span>
                                : <button className="btn danger sm" onClick={() => setDelRow(r)}>Delete</button>}
                        </td>
                    </tr>)}
                    {!rows.length && <tr><td colSpan={4} className="mut">No logins yet</td></tr>}
                </tbody>
            </table>
        </div>

        {resetRow && <div className="modal-bg" onClick={() => setResetRow(null)}>
            <div className="card modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                <h3>Reset password: {resetRow.username}</h3>
                <label>New password (min 8 chars)</label>
                <input value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" autoComplete="off" />
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button className="btn" disabled={busy || newPw.length < 8} onClick={doReset}>{busy ? 'Saving...' : 'Reset password'}</button>
                    <button className="btn ghost" onClick={() => setResetRow(null)}>Cancel</button>
                </div>
            </div>
        </div>}

        {delRow && <div className="modal-bg" onClick={() => setDelRow(null)}>
            <div className="card modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                <h3>Delete login: {delRow.username}?</h3>
                <p className="mut" style={{ margin: '10px 0 16px' }}>The login is removed permanently. The linked founder record stays - it just loses its sign-in.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn danger" disabled={busy} onClick={doDelete}>{busy ? 'Deleting...' : 'Delete login'}</button>
                    <button className="btn ghost" onClick={() => setDelRow(null)}>Cancel</button>
                </div>
            </div>
        </div>}
    </div>;
}
