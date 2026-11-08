import React, { createContext, useContext, useEffect, useState } from 'react';
import { Routes, Route, NavLink, Link } from 'react-router-dom';
import { getSession, signOut, store } from './lib/sb';
import { loadFounders, myFounder, myMentor, initials, Founder, Mentor } from './lib/data';
import { MentorShell } from './mentor/MentorShell';
import { Login } from './views/Login';
import logoUrl from './assets/logo.png';
import { Dashboard } from './views/Dashboard';
import { Tasks } from './views/Tasks';
import { Study } from './views/Study';
import { Documents } from './views/Documents';
import { Courses } from './views/Courses';
import { Reports } from './views/Reports';
import { Finance } from './views/Finance';
import { Marketing } from './views/Marketing';
import { Meetings } from './views/Meetings';
import { Founders } from './views/Founders';
import { KnowledgeHub } from './views/KnowledgeHub';
import { Notifications } from './views/Notifications';
import { Settings } from './views/Settings';
import { Recommendations } from './views/Recommendations';
import { Roadmap } from './views/Roadmap';
import { Mentoring } from './views/Mentoring';

type Ctx = { me: Founder; founders: Founder[]; refresh: () => Promise<void>; dark: boolean; toggleTheme: () => void };
export const AppCtx = createContext<Ctx>(null as any);
export const useApp = () => useContext(AppCtx);

const NAV = [
    ['/', 'Dashboard'], ['/founders', 'Founders & Roles'], ['/study', 'Study Tracker'],
    ['/tasks', 'Task Management'], ['/documents', 'Document Tracker'], ['/courses', 'Course Development'],
    ['/marketing', 'Marketing Progress'], ['/expenses', 'Financial Management'], ['/reports', 'Weekly Reports'],
    ['/meetings', 'Founder Meetings'], ['/recommendations', 'Recommendations'], ['/roadmap', 'Roadmap'], ['/mentoring', 'Mentoring'],
    ['/knowledge', 'Knowledge Hub'], ['/notifications', 'Notifications'], ['/settings', 'Settings'],
];

function Shell({ me, founders, refresh, dark, toggleTheme }: any) {
    const [menu, setMenu] = useState(false);
    const doSignOut = async () => { await signOut(); location.reload(); };
    return <div className="app">
        <div className="mob-top">
            <button className="btn ghost sm" onClick={() => setMenu(!menu)}>Menu</button>
            <img src={logoUrl} alt="Teqx Academy" className="brandimg" style={{ height: 22 }} />
        </div>
        <aside className={`side${menu ? ' open' : ''}`}>
            <div className="brandbox"><img src={logoUrl} alt="Teqx Academy" className="brandimg" /></div>
            {NAV.map(([to, lbl]) => <NavLink key={to} to={to} end={to === '/' ? true : undefined} className="nav" onClick={() => setMenu(false)}><span className="dot" />{lbl}</NavLink>)}
            <div className="userbox">
                <div className="avatar">{initials(me.full_name)}</div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{me.full_name}</div>
                    <small>{me.role_title}</small>
                    <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={doSignOut}>Sign out</button>
                </div>
            </div>
        </aside>
        <main className="main">
            <AppCtx.Provider value={{ me, founders, refresh, dark, toggleTheme }}>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/study" element={<Study />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/marketing" element={<Marketing />} />
                    <Route path="/meetings" element={<Meetings />} />
                    <Route path="/founders" element={<Founders />} />
                    <Route path="/knowledge" element={<KnowledgeHub />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/recommendations" element={<Recommendations />} />
                    <Route path="/roadmap" element={<Roadmap />} />
                    <Route path="/mentoring" element={<Mentoring />} />
                    <Route path="/expenses" element={<Finance />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </AppCtx.Provider>
        </main>
    </div>;
}

export function App() {
    const [state, setState] = useState<'loading' | 'login' | 'ready' | 'unlinked'>('loading');
    const [me, setMe] = useState<Founder | null>(null);
    const [mentor, setMentor] = useState<Mentor | null>(null);
    const [founders, setFounders] = useState<Founder[]>([]);
    const [dark, setDark] = useState(() => store.get('teqx_theme') !== 'light');

    useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light'); store.set('teqx_theme', dark ? 'dark' : 'light'); }, [dark]);

    const refresh = async () => {
        const f = await loadFounders();
        setFounders(f);
        const m = await myFounder();
        if (m) { setMe(m); setMentor(null); setState('ready'); return; }
        const mt = await myMentor();
        if (mt && mt.is_active) { setMentor(mt); setMe(null); setState('ready'); return; }
        setMe(null); setMentor(null); setState('unlinked');
    };

    useEffect(() => {
        (async () => {
            if (!getSession()) { setState('login'); return; }
            try { await refresh(); } catch { setState('login'); }
        })();
    }, []);

    if (state === 'loading') return <div className="login-wrap"><div className="mut">Loading workspace...</div></div>;
    if (state === 'login') return <Login onDone={() => refresh()} />;
    if (state === 'unlinked') return <div className="login-wrap"><div className="login-card">
        <div className="brandbox"><img src={logoUrl} alt="Teqx Academy" className="brandimg" /></div>
        <p className="mut small" style={{ marginTop: 12 }}>This login is not linked to a founder account yet. Ask Afvan to link your email in Settings.</p>
        <button className="btn ghost" style={{ marginTop: 16 }} onClick={async () => { await signOut(); location.reload(); }}>Sign out</button>
    </div></div>;
    if (mentor) return <MentorShell me={mentor} founders={founders} refresh={refresh} dark={dark} toggleTheme={() => setDark(!dark)} />;
    return <Shell me={me} founders={founders} refresh={refresh} dark={dark} toggleTheme={() => setDark(!dark)} />;
}
