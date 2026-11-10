import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { signOut } from '../lib/sb';
import { initials, AdminUser } from '../lib/data';
import logoUrl from '../assets/logo.png';
import { ENTITIES, AdminEntity, AdminHome } from './Admin';
import { AdminUsers } from './Users';

export function AdminShell({ me, dark, toggleTheme }: { me: AdminUser; dark: boolean; toggleTheme: () => void }) {
    const [menu, setMenu] = useState(false);
    const doSignOut = async () => { await signOut(); location.reload(); };
    const groups = [...new Set(ENTITIES.map(e => e.group))];
    return <div className="app">
        <div className="mob-top">
            <button className="btn ghost sm" onClick={() => setMenu(!menu)}>Menu</button>
            <img src={logoUrl} alt="Teqx Academy" className="brandimg" style={{ height: 22 }} />
        </div>
        <aside className={`side${menu ? ' open' : ''}`}>
            <div className="brandbox">
                <img src={logoUrl} alt="Teqx Academy" className="brandimg" />
                <div className="mentor-tag">Admin Panel</div>
            </div>
            <NavLink to="/" end className="nav" onClick={() => setMenu(false)}><span className="dot" />Overview</NavLink>
            <NavLink to="/users" className="nav" onClick={() => setMenu(false)}><span className="dot" />User Accounts</NavLink>
            {groups.map(g => <React.Fragment key={g}>
                <div className="navgroup">{g}</div>
                {ENTITIES.filter(e => e.group === g).map(e =>
                    <NavLink key={e.key} to={'/e/' + e.key} className="nav" onClick={() => setMenu(false)}><span className="dot" />{e.label}</NavLink>)}
            </React.Fragment>)}
            <div className="userbox">
                <div className="avatar">{initials(me.full_name)}</div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{me.full_name}</div>
                    <small>Administrator</small>
                    <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={doSignOut}>Sign out</button>
                </div>
            </div>
        </aside>
        <main className="main">
            <Routes>
                <Route path="/" element={<AdminHome />} />
                <Route path="/users" element={<AdminUsers />} />
                {ENTITIES.map(e => <Route key={e.key} path={'/e/' + e.key} element={<AdminEntity entity={e} />} />)}
                <Route path="*" element={<AdminHome />} />
            </Routes>
        </main>
    </div>;
}
