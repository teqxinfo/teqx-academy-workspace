# Teqx Academy Founder Workspace - Database Structure v1 (PostgreSQL / Supabase)

All tables: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, human-readable unique code, `created_at` / `updated_at` timestamptz. Soft delete via `deleted_at` where Delete is offered. Every table has Row Level Security ON (frontend talks only through RLS-protected API - no secret keys in frontend).

## 1. founders
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| founder_code | text unique | e.g. FDR-001 |
| full_name | text | Afvan / Razin / Jaleel |
| role_title | text | CMO / COO / Technical & Academic Director |
| department | text | Marketing & Students / Business & Operations / Courses & Technology |
| email | citext unique not null | login email, wired to Supabase Auth |
| auth_user_id | uuid unique -> auth.users | filled when login is created |
| is_active | bool default true | |
| created_at, updated_at | timestamptz | |

## 2. tasks (Module 2)
| Column | Type | Notes |
|---|---|---|
| task_code | text unique | TSK-0001 |
| title | text not null | |
| description | text | |
| remarks | text | |
| priority | enum: low, medium, high, urgent | default medium |
| status | enum: to_do, in_progress, completed, on_hold | brief statuses |
| progress_pct | int 0-100 | |
| created_by | uuid -> founders | |
| assigned_to | uuid -> founders | |
| department | text | owning department |
| deadline | timestamptz | drives Upcoming Deadlines |
| completed_at | timestamptz | |
| created_at, updated_at, deleted_at | | |

## 3. task_updates (progress + audit trail per task)
id, task_id -> tasks, founder_id -> founders, note text, status_from, status_to, progress_from int, progress_to int, created_at.

## 4. study_items (Module 3)
| Column | Type | Notes |
|---|---|---|
| study_code | text unique | STD-0001 |
| founder_id | uuid -> founders | owner of the record |
| topic | text not null | |
| category | text | |
| resource_link | text (url) | |
| start_date, target_date | date | |
| learning_status | enum: not_started, learning, completed, on_hold | |
| key_learnings | text | |
| practical_applications | text | |
| visibility | enum: individual, shared | individual + shared views |
| created_at, updated_at, deleted_at | | |

## 5. documents (Module 4)
| Column | Type | Notes |
|---|---|---|
| doc_code | text unique | DOC-0001 |
| title | text not null | |
| category | enum: business, legal, branding, finance, academic, courses, marketing | brief categories |
| file_path | text | Supabase Storage object path (private bucket) |
| file_name, mime_type | text | |
| file_size_bytes | bigint | |
| responsible_founder | uuid -> founders | |
| status | enum: draft, active, archived | |
| access | enum: shared, restricted | finance + legal default restricted |
| description | text | |
| created_by | uuid -> founders | |
| created_at, updated_at, deleted_at | | |

## 6. document_acl (restricted-document permissions)
document_id -> documents, founder_id -> founders, unique(document_id, founder_id). Restricted doc = visible only to ACL members + uploader. Default proposal: finance/legal restricted to Razin (COO) + uploader, expandable in UI.

## 7. courses (Module 5, Jaleel manages)
| Column | Type | Notes |
|---|---|---|
| course_code | text unique | CRS-0001 |
| name | text not null | |
| category | text | |
| duration | text | e.g. "6 weeks" |
| proposed_fee | numeric(10,2) | |
| target_audience | text | |
| syllabus | text | |
| development_status | enum: proposed, in_development, review, launched, on_hold | |
| created_by | uuid -> founders (Jaleel) | |
| created_at, updated_at, deleted_at | | |

## 8. course_modules (Modules + materials + projects per course)
id, course_id -> courses, module_order int, title, description, learning_materials text, practical_projects text, status enum: not_started, in_progress, done, created_at, updated_at, deleted_at. unique(course_id, module_order).

## 9. weekly_reports (Module 6)
| Column | Type | Notes |
|---|---|---|
| report_code | text unique | RPT-2026-W45-AFV |
| founder_id | uuid -> founders | |
| week_start, week_end | date | unique(founder_id, week_start) |
| completed_tasks, pending_tasks, study_progress | text | |
| achievements, challenges, next_week_plan | text | |
| submitted_at | timestamptz | |
| created_at, updated_at | | |

## 10. decisions (shared with all founders - permission requirement)
id, decision_code unique (DCN-0001), title, details, decision_date date, proposed_by -> founders, status enum: proposed, decided, implemented, created_at, updated_at, deleted_at. Always readable by all founders.

## 11. activity_log (audit history)
id, actor_id -> founders, entity_type text, entity_id uuid, action enum: create, update, delete, login, upload, submit, summary text, meta jsonb, created_at. Append-only; feeds Dashboard "Recent Activities".

## 12. app_settings
key text PK, value jsonb, updated_by -> founders, updated_at. Holds module config (categories, restricted-category list, backup schedule marker).

## Relationships (ER summary)
founders 1-n tasks (created_by, assigned_to) | tasks 1-n task_updates | founders 1-n study_items | founders 1-n documents 1-n document_acl n-1 founders | courses 1-n course_modules | founders 1-n weekly_reports | founders 1-n decisions | founders 1-n activity_log.

## RLS policy outline
- founders: read all (directory), update own row.
- tasks/task_updates/decisions/activity_log: all founders read; create/update own or assigned; delete own-created (soft).
- study_items: read own + shared; write own only.
- documents: read shared; restricted only with ACL row; write per department/responsible founder.
- courses/course_modules: all read; write restricted to Jaleel's founder row (Technical & Academic Director).
- weekly_reports: all read; write own only.
- app_settings: all read; write COO/CMO.
- No passwords or secrets in any table - auth lives in Supabase Auth; frontend holds only the public anon key, safe under RLS.

## Migration-friendliness
Normalized tab-per-entity, uuid PKs, enum-like values in check constraints, JSONB meta for extension. New modules (Marketing, Finance, CRM, Students, LMS) add tables without touching existing ones. Repository-pattern data layer in the app keeps queries swappable.

## 13. expenses (Financial Tracker - added on user approval, Nov 8)
| Column | Type | Notes |
|---|---|---|
| expense_code | text unique | EXP-0001 |
| logged_by | uuid -> founders | who recorded it |
| category | enum: travel, food, software, marketing, operations, other | |
| amount | numeric(12,2) not null | INR |
| spent_on | date | |
| description | text | |
| payment_method | text | optional |
| receipt_path | text | optional, private bucket |
| created_at, updated_at, deleted_at | | |
RLS: all founders read (shared business progress); write = logger + Razin (COO, Business & Operations).

---
Note (v2): docs/schema.sql is now the canonical FULL schema (base + migrations 02-08 folded in). This v1 reference covers the original 13 tables only.
