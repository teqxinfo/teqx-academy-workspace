import React from 'react';
import { useApp } from '../App';
import { initials } from '../lib/data';

const PERMS: Record<string, string[]> = {
    'Marketing & Students': ['Full access to Marketing', 'Own tasks and study records', 'View access to Operations and Academic modules', 'Shared access to documents and meetings', 'Finance view access'],
    'Business & Operations': ['Full access to Operations', 'Full operational management of Finance', 'Own tasks and study records', 'View access to Marketing and Academic modules', 'Shared access to documents and meetings'],
    'Courses & Technology': ['Full access to Academic and Course Development', 'Assigned technical management features', 'Own tasks and study records', 'View access to Marketing and Operations', 'Shared access to documents and meetings'],
};
const SHARED = ['Individual login', 'Personal dashboard', 'Shared workspace', 'Shared knowledge hub', 'Shared meeting records', 'Cross-department task collaboration'];

export function Founders() {
    const { founders } = useApp();
    return <>
        <div className="topbar"><div><h1>Founders & Roles</h1><p>The three founders, their departments and backend-enforced permissions.</p></div></div>
        <div className="grid cards3">
            {founders.map(f => <div key={f.id} className="card">
                <div className="row" style={{ marginBottom: 10 }}>
                    <div className="avatar" style={{ width: 40, height: 40, fontSize: 15 }}>{initials(f.full_name)}</div>
                    <div>
                        <b style={{ fontSize: 15 }}>{f.full_name}</b>
                        <div className="mut small">{f.role_title} - {f.department}</div>
                    </div>
                </div>
                <table style={{ fontSize: 12, marginBottom: 10 }}><tbody>
                    <tr><td className="mut">Founder ID</td><td style={{ textAlign: 'right' }}><b>{f.founder_code}</b></td></tr>
                    <tr><td className="mut">Email</td><td style={{ textAlign: 'right' }}>{f.email || 'Not collected'}</td></tr>
                    <tr><td className="mut">Login</td><td style={{ textAlign: 'right' }}>{f.auth_user_id ? <span className="pill p-completed">Active</span> : <span className="pill p-on_hold">Not set up</span>}</td></tr>
                </tbody></table>
                <div className="mut" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 6 }}>Permissions (enforced in the database)</div>
                <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(PERMS[f.department] || []).map(p => <li key={p}>{p}</li>)}
                </ul>
            </div>)}
        </div>
        <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 10 }}>All founders</h3>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {SHARED.map(s => <span key={s} className="badge">{s}</span>)}
            </div>
            <p className="mut small" style={{ marginTop: 12 }}>Permissions are enforced by row-level security in the database, not just hidden buttons. Every change is recorded in the audit log (Settings - Recent Activity).</p>
        </div>
    </>;
}
