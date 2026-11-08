import React, { createContext, useContext, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { signOut } from '../lib/sb';
import { initials, Mentor, Founder } from '../lib/data';
import logoUrl from '../assets/logo.png';
import { MentorDashboard } from './Dashboard';
import { MentorNotifications } from './Notifications';
import { MentorProfile } from './Profile';
import { FounderMonitoring } from './Founders';
import { TaskMonitoring } from './Tasks';
import { DocumentReview } from './Documents';
import { MentorWeeklyReports } from './Reports';
import { MentorRecommendations } from './Recommendations';
import { MentorMilestones } from './Milestones';
import { MentorMeetings } from './Meetings';
import { AcademyOverview, BusinessProgress } from './AcademyOverview';
import { AcademicReview } from './Academic';
import { FinancialOverview } from './Finance';
import { MentorSettings } from './Settings';

type Ctx = { me: Mentor; founders: Founder[]; refresh: () => Promise<void>; dark: boolean; toggleTheme: () => void };
export const MentorCtx = createContext<Ctx>(null as any);
export const useMentor = () => useContext(MentorCtx);

const NAV = [
    ['/', 'Mentor Dashboard'],
    ['/academy', 'Academy Overview'],
    ['/founders', 'Founder Monitoring'],
    ['/tasks', 'Task Monitoring'],
    ['/documents', 'Document Review'],
    ['/business', 'Business Progress'],
    ['/academic', 'Academic Review'],
    ['/milestones', 'Roadmap & Milestones'],
    ['/recommendations', 'Recommendations'],
    ['/reports', 'Weekly Reports'],
    ['/meetings', 'Mentoring Meetings'],
    ['/finance', 'Financial Overview'],
    ['/notifications', 'Notifications'],
    ['/profile', 'My Profile'],
    ['/settings', 'Settings'],
];

export function MentorShell({ me, founders, refresh, dark, toggleTheme }: any) {
    const [menu, setMenu] = useState(false);
    const doSignOut = async () => { await signOut(); location.reload(); };
    return <div className="app mentor">
        <div className="mob-top">
            <button className="btn ghost sm" onClick={() => setMenu(!menu)}>Menu</button>
            <img src={logoUrl} alt="Teqx Academy" className="brandimg" style={{ height: 22 }} />
        </div>
        <aside className={`side${menu ? ' open' : ''}`}>
            <div className="brandbox">
                <img src={logoUrl} alt="Teqx Academy" className="brandimg" />
                <div className="mentor-tag">Business Mentor Portal</div>
            </div>
            {NAV.map(([to, lbl]) => <NavLink key={to} to={to} end={to === '/' ? true : undefined} className="nav" onClick={() => setMenu(false)}><span className="dot" />{lbl}</NavLink>)}
            <div className="userbox">
                <div className="avatar">{initials(me.full_name)}</div>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{me.full_name}</div>
                    <small>{me.designation || 'Business Mentor'}</small>
                    <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={doSignOut}>Sign out</button>
                </div>
            </div>
        </aside>
        <main className="main">
            <MentorCtx.Provider value={{ me, founders, refresh, dark, toggleTheme }}>
                <Routes>
                    <Route path="/" element={<MentorDashboard />} />
                    <Route path="/founders" element={<FounderMonitoring />} />
                    <Route path="/tasks" element={<TaskMonitoring />} />
                    <Route path="/documents" element={<DocumentReview />} />
                    <Route path="/milestones" element={<MentorMilestones />} />
                    <Route path="/recommendations" element={<MentorRecommendations />} />
                    <Route path="/reports" element={<MentorWeeklyReports />} />
                    <Route path="/meetings" element={<MentorMeetings />} />
                    <Route path="/academy" element={<AcademyOverview />} />
                    <Route path="/business" element={<BusinessProgress />} />
                    <Route path="/academic" element={<AcademicReview />} />
                    <Route path="/finance" element={<FinancialOverview />} />
                    <Route path="/notifications" element={<MentorNotifications />} />
                    <Route path="/profile" element={<MentorProfile />} />
                    <Route path="/settings" element={<MentorSettings />} />
                </Routes>
            </MentorCtx.Provider>
        </main>
    </div>;
}
