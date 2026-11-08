# Teqx Academy Founder Workspace - System Architecture v1

## Stack (100% free, no expiry, user-owned)
- **Frontend:** React + Vite SPA, premium SaaS UI (sidebar, cards, tables, light/dark). Hosted free on **Cloudflare Pages** (or Vercel free) under the founder's own account.
- **Backend/API:** **Supabase free tier** - PostgREST auto API + RPC functions, all behind Row Level Security. Frontend holds only the public anon key (safe by design; RLS enforces every rule). No custom server to pay for or maintain.
- **Auth:** Supabase Auth email/password, one login per founder. Sessions via JWT; password reset built in. Founder emails wired in later through secure collection.
- **Database:** Supabase Postgres (schema-v1). Private by default; no public sharing anywhere.
- **Files:** Supabase Storage **private bucket** for Document Management uploads; downloads via short-lived signed URLs issued only after an RLS-checked request.
- **Backups:** scheduled export (weekly) of all tables to CSV/JSON, saved to the Academy's private Google Drive backup folder (integration already connected) + Supabase's own daily backups on free tier. Data survives even if the app is lost.

## Request flow
Browser -> Supabase Auth (login, JWT) -> PostgREST/RPC with JWT -> RLS policies decide every row -> Storage signed URLs for files. No Instinct dependency at runtime; the founders' own accounts own everything.

## Layering (migration-friendly)
UI screens -> repository modules (tasksRepo, studyRepo, docsRepo, coursesRepo, reportsRepo, decisionsRepo) -> Supabase client. Swapping the client for another Postgres driver later touches only the repository layer. New phase modules (Marketing, Finance, CRM, Students, LMS) = new tables + new repository + new route; no rebuild.

## Module map
1. Dashboard: aggregates tasks, deadlines, founder progress, recent activity (activity_log), current projects (active courses + key tasks).
2. Task Management: kanban/table, CRUD, priorities, deadlines, remarks, progress, task_updates history.
3. Study Tracker: per-founder + shared views, status, key learnings, practical applications.
4. Document Management: 7 categories, upload to private bucket, responsible founder, restricted ACL for finance/legal, search + filters.
5. Course Development: Jaleel-managed courses, modules, materials, practical projects, development status.
6. Weekly Reports: per-founder weekly form + shared read view.
7. Settings: profile, categories, theme, restricted-category config, backup status.

## Security checklist
- RLS ON every table; deny-by-default.
- Anon key only in frontend; service key never shipped.
- Soft deletes; activity_log append-only audit.
- Storage bucket private; signed URL expiry 5 min.
- Founder accounts created only after emails arrive via secure vault link.

## Open dependencies
1. Supabase account + project credentials (user creating now; arrive via vault link).
2. Founder login emails for Razin/Jaleel/Afvan - collected later via vault.
3. Real Teqx Academy logo asset for branding (requested from main).
4. Free hosting account (Cloudflare/Vercel) - can be created at deploy time.

## Known limitation
Supabase free-tier projects pause after 7 days of LOW database activity (opening the app alone may not count as database activity and does NOT resume a paused project). When paused, the app loads but shows no data. Restore from the Supabase Dashboard: log in at supabase.com, select the project, click "Resume project" - the app works again within a couple of minutes, with no data loss. Weekly backup keeps a copy regardless. Alternative if he outgrows it: self-host Postgres later - schema is plain PostgreSQL.
