# Teqx Academy - Founder Workspace

Live: https://teqx-workspace.pages.dev

## Stack
- Frontend: React + Vite + react-router-dom (HashRouter), plain CSS theming (dark/light)
- Backend: Supabase (Postgres + Auth + Storage) - project dizdotnqrabzoujszqjo (ap-south-1)
- Hosting: Cloudflare Pages (project: teqx-workspace)

## Develop
npm install
npm run dev

## Build
npm run build   -> outputs dist/

## Deploy (Cloudflare Pages)
Option A: drag-and-drop the dist/ folder in the Cloudflare Pages dashboard.
Option B: CLOUDFLARE_ACCOUNT_ID=<id> CLOUDFLARE_API_TOKEN=<token> npx wrangler pages deploy dist --project-name teqx-workspace --branch main

## Docs
- docs/schema.sql - full database schema incl. RLS policies
- docs/schema-v1.md - schema reference
- docs/architecture-v1.md - architecture notes

Note: the Supabase anon key embedded in src/lib is a public client key - safe by design; row-level security enforces all access. Never add secret/service keys to this repo.

## If the app stops loading data (paused Supabase project)
Supabase free-tier projects pause after 7 days of LOW database activity. Opening the app does NOT resume a paused project - the app will load but show no data.
To resume: log in to the Supabase Dashboard (supabase.com) with the project's owner account, select project dizdotnqrabzoujszqjo, and click "Resume project". The app works again within a minute or two; no data is lost. To reduce how often this happens, make sure someone actually uses the app (creates/reads data) at least once a week.

## Business Mentor Portal (added Nov 2026)
The same app serves two roles. Sign-in auto-detects the role: founders land on the founder portal, mentors on the violet "Business Mentor Portal".
- Mentor pages: Dashboard, Academy Overview, Founder Monitoring, Task Monitoring, Document Review, Business Progress, Academic Review, Roadmap & Milestones, Recommendations, Weekly Reports, Mentoring Meetings, Financial Overview, Notifications, My Profile, Settings.
- Mentors get read-only access to founder data via RLS (mentor_read_* policies). Financial tables (income, expenses, budgets, contributions, outstanding) are hidden until a founder grants access: founder Settings > Mentor Access > Finance access checkbox.
- Mentor write-backs are limited to their own tables: comments (mentor_comments), document reviews (mentor_reviews), recommendations, milestone progress, mentoring meetings/notes, progress-area notes.
- Founders see mentor comments inside task/document/report detail views, reply to recommendations under "Recommendations", update the roadmap under "Roadmap", and view meetings/action items under "Mentoring".
- Mentor accounts: founders add the mentor in Settings > Mentor Access (name, email, designation). The login itself is provisioned on request (same as founder logins) - an auth user is created in Supabase and linked to the mentor row's auth_user_id.
- DB: migration-09-mentor.sql adds mentors, mentor_permissions, mentor_comments, mentor_reviews, recommendations(+responses), milestones(12 seeded)+updates, mentoring_meetings(+notes), academy_progress(18 seeded areas), mentor_notifications, mentor_activity_log, plus notification triggers between founders and mentors.

## Admin Panel + username logins (added Nov 10, 2026)
- Login is username + password only - no email or Gmail anywhere for users. The admin creates each login in Admin Panel > User Accounts (username, password, and what the login opens: a founder, a mentor, a new admin, or no link).
- Behind the scenes each username maps to a hidden internal email in Supabase Auth (public.resolve_username); users never see or type an email.
- Sign-in auto-detects role: founder portal, mentor portal, or Admin Panel.
- Admin Panel (for admins): Overview counts plus add / edit / delete for every workspace table, grouped People / Work / Marketing / Finance / Mentor Data / System. User Accounts manages logins (create, reset password, delete).
- Safety rails enforced in the database: owner founder record (FDR-001) cannot be deleted, an admin cannot delete their own login, and the last admin can never be removed.
- DB: migration-10-admin.sql (admin_users, is_admin(), admin_all RLS policies on all tables, protection triggers), migration-11-usernames.sql (usernames, resolve_username, admin_create_user / admin_reset_password / admin_delete_user).
- The first admin login: username "admin" (account teqxinfo@gmail.com internally). Its password is set privately and stored in the credentials backup doc.
