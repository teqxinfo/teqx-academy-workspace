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

## Business Mentor Portal (added Nov 8, REMOVED Nov 10, 2026)
The mentor sector was fully removed on user request: no mentor role, portal, logins option, admin Mentor Data group, or mentor tables (migration-12-remove-mentor.sql). Pre-removal backup (schema + data): Drive file "teqx-mentor-sector-backup-2026-11-10.txt" in the Academy folder.

## Admin Panel + username logins (added Nov 10, 2026)
- Login is username + password only - no email or Gmail anywhere for users. The admin creates each login in Admin Panel > User Accounts (username, password, and what the login opens: a founder, a mentor, a new admin, or no link).
- Behind the scenes each username maps to a hidden internal email in Supabase Auth (public.resolve_username); users never see or type an email.
- Sign-in auto-detects role: founder portal or Admin Panel.
- Admin Panel (for admins): Overview counts plus add / edit / delete for every workspace table, grouped People / Work / Marketing / Finance / System. User Accounts manages logins (create, reset password, delete).
- Safety rails enforced in the database: owner founder record (FDR-001) cannot be deleted, an admin cannot delete their own login, and the last admin can never be removed.
- DB: migration-10-admin.sql (admin_users, is_admin(), admin_all RLS policies on all tables, protection triggers), migration-11-usernames.sql (usernames, resolve_username, admin_create_user / admin_reset_password / admin_delete_user; mentor link branch dropped by migration-13).
- The first admin login: username "admin" (account teqxinfo@gmail.com internally). Its password is set privately and stored in the credentials backup doc.
