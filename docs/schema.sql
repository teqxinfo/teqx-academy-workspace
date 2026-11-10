-- Teqx Academy Founder Workspace - FULL schema v2 (Supabase/Postgres)
-- Base v1 with migrations 02-08 folded in (marketing, finance, meetings, knowledge+notifications, task/doc statuses, report comments).
-- Apply on a fresh project in one go; RLS policies and triggers included.

-- Teqx Academy Founder Workspace - schema v1 (Supabase/Postgres)
create extension if not exists pgcrypto;
create extension if not exists citext;

create table founders (
  id uuid primary key default gen_random_uuid(),
  founder_code text unique not null,
  full_name text not null,
  role_title text not null,
  department text not null,
  email citext unique,
  auth_user_id uuid unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  task_code text unique not null,
  title text not null,
  description text,
  remarks text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'to_do' check (status in ('backlog','to_do','in_progress','under_review','completed','on_hold')),
  progress_pct int not null default 0 check (progress_pct between 0 and 100),
  created_by uuid references founders(id),
  assigned_to uuid references founders(id),
  department text,
  deadline timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  founder_id uuid references founders(id),
  note text,
  status_from text, status_to text,
  progress_from int, progress_to int,
  created_at timestamptz not null default now()
);

create table study_items (
  id uuid primary key default gen_random_uuid(),
  study_code text unique not null,
  founder_id uuid not null references founders(id),
  topic text not null,
  category text,
  resource_link text,
  start_date date, target_date date,
  learning_status text not null default 'not_started' check (learning_status in ('not_started','learning','completed','on_hold')),
  key_learnings text,
  practical_applications text,
  visibility text not null default 'individual' check (visibility in ('individual','shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  doc_code text unique not null,
  title text not null,
  category text not null check (category in ('business','legal','branding','finance','academic','courses','marketing')),
  file_path text, file_name text, mime_type text, file_size_bytes bigint,
  responsible_founder uuid references founders(id),
  status text not null default 'draft' check (status in ('not_started','draft','under_review','approved','published','archived')),
  access text not null default 'shared' check (access in ('shared','restricted')),
  description text,
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table document_acl (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  founder_id uuid not null references founders(id),
  unique(document_id, founder_id)
);

create table courses (
  id uuid primary key default gen_random_uuid(),
  course_code text unique not null,
  name text not null,
  category text,
  duration text,
  proposed_fee numeric(10,2),
  target_audience text,
  syllabus text,
  development_status text not null default 'proposed' check (development_status in ('proposed','in_development','review','launched','on_hold')),
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  module_order int not null,
  title text not null,
  description text,
  learning_materials text,
  practical_projects text,
  status text not null default 'not_started' check (status in ('not_started','in_progress','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(course_id, module_order)
);

create table weekly_reports (
  id uuid primary key default gen_random_uuid(),
  report_code text unique not null,
  founder_id uuid not null references founders(id),
  week_start date not null, week_end date not null,
  completed_tasks text, pending_tasks text, study_progress text,
  achievements text, challenges text, next_week_plan text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(founder_id, week_start)
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  decision_code text unique not null,
  title text not null,
  details text,
  decision_date date not null default current_date,
  proposed_by uuid references founders(id),
  status text not null default 'proposed' check (status in ('proposed','decided','implemented')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz  responsible_person uuid references founders(id),
  meeting_id uuid,
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  expense_code text unique not null,
  logged_by uuid not null references founders(id),
  category text not null default 'other' check (category in ('travel','food','software','marketing','operations','other')),
  amount numeric(12,2) not null check (amount >= 0),
  spent_on date not null default current_date,
  description text,
  payment_method text,
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references founders(id),
  entity_type text not null,
  entity_id uuid,
  action text not null check (action in ('create','update','delete','login','upload','submit')),
  summary text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create table app_settings (
  key text primary key,
  value jsonb,
  updated_by uuid references founders(id),
  updated_at timestamptz not null default now()
);

-- helper functions for RLS
create or replace function my_founder_id() returns uuid
  language sql stable security definer set search_path = public
  as $$ select id from founders where auth_user_id = auth.uid() and is_active $$;

create or replace function is_founder() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists(select 1 from founders where auth_user_id = auth.uid() and is_active) $$;

create or replace function my_department() returns text
  language sql stable security definer set search_path = public
  as $$ select department from founders where auth_user_id = auth.uid() and is_active $$;

-- updated_at trigger
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['founders','tasks','study_items','documents','courses','course_modules','weekly_reports','decisions','expenses','app_settings']
  loop execute format('create trigger trg_touch before update on %I for each row execute function touch_updated_at()', t); end loop;
end $$;

-- RLS
alter table founders enable row level security;
alter table tasks enable row level security;
alter table task_updates enable row level security;
alter table study_items enable row level security;
alter table documents enable row level security;
alter table document_acl enable row level security;
alter table courses enable row level security;
alter table course_modules enable row level security;
alter table weekly_reports enable row level security;
alter table decisions enable row level security;
alter table expenses enable row level security;
alter table activity_log enable row level security;
alter table app_settings enable row level security;

-- founders: directory readable by all founders; update own row
create policy founders_read on founders for select to authenticated using (is_founder());
create policy founders_update_own on founders for update to authenticated using (id = my_founder_id()) with check (id = my_founder_id());

-- tasks: all founders read; create; update own-created or assigned; delete own-created
create policy tasks_read on tasks for select to authenticated using (is_founder());
create policy tasks_insert on tasks for insert to authenticated with check (created_by = my_founder_id());
create policy tasks_update on tasks for update to authenticated using (created_by = my_founder_id() or assigned_to = my_founder_id());
create policy tasks_delete on tasks for delete to authenticated using (created_by = my_founder_id());

create policy task_updates_read on task_updates for select to authenticated using (is_founder());
create policy task_updates_insert on task_updates for insert to authenticated with check (founder_id = my_founder_id());

-- study: read own + shared; write own
create policy study_read on study_items for select to authenticated using (founder_id = my_founder_id() or visibility = 'shared');
create policy study_write_own on study_items for all to authenticated using (founder_id = my_founder_id()) with check (founder_id = my_founder_id());

-- documents: shared readable by all; restricted only with ACL or creator/responsible
create or replace function has_doc_acl(doc_id uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from document_acl a where a.document_id = doc_id and a.founder_id = my_founder_id()) $$;
create or replace function can_write_doc(doc_id uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from documents d where d.id = doc_id and (d.created_by = my_founder_id() or d.responsible_founder = my_founder_id())) $$;
create policy docs_read on documents for select to authenticated using (
  access = 'shared' or created_by = my_founder_id() or responsible_founder = my_founder_id() or has_doc_acl(id));
create policy docs_insert on documents for insert to authenticated with check (created_by = my_founder_id());
create policy docs_update on documents for update to authenticated using (
  created_by = my_founder_id() or responsible_founder = my_founder_id() or has_doc_acl(id));
create policy docs_delete on documents for delete to authenticated using (created_by = my_founder_id());

create policy acl_read on document_acl for select to authenticated using (is_founder());
create policy acl_write on document_acl for all to authenticated
  using (can_write_doc(document_id)) with check (can_write_doc(document_id));

-- courses: all read; write only Technical & Academic department (Jaleel)
create policy courses_read on courses for select to authenticated using (is_founder());
create policy courses_write on courses for all to authenticated
  using (my_department() = 'Courses & Technology') with check (my_department() = 'Courses & Technology');
create policy course_modules_read on course_modules for select to authenticated using (is_founder());
create policy course_modules_write on course_modules for all to authenticated
  using (my_department() = 'Courses & Technology') with check (my_department() = 'Courses & Technology');

-- weekly reports: all read; write own
create policy reports_read on weekly_reports for select to authenticated using (is_founder());
create policy reports_write_own on weekly_reports for all to authenticated
  using (founder_id = my_founder_id()) with check (founder_id = my_founder_id());

-- decisions: all read; create any founder; update/delete proposer or COO
create policy decisions_read on decisions for select to authenticated using (is_founder());
create policy decisions_insert on decisions for insert to authenticated with check (proposed_by = my_founder_id());
create policy decisions_update on decisions for update to authenticated
  using (proposed_by = my_founder_id() or my_department() = 'Business & Operations');
create policy decisions_delete on decisions for delete to authenticated
  using (proposed_by = my_founder_id() or my_department() = 'Business & Operations');

-- expenses: all founders read; insert own; update/delete logger or COO
create policy expenses_read on expenses for select to authenticated using (is_founder());
create policy expenses_insert on expenses for insert to authenticated with check (logged_by = my_founder_id());
create policy expenses_update on expenses for update to authenticated
  using (logged_by = my_founder_id() or my_department() = 'Business & Operations');
create policy expenses_delete on expenses for delete to authenticated
  using (logged_by = my_founder_id() or my_department() = 'Business & Operations');

-- activity log: read all founders; insert own actions
create policy activity_read on activity_log for select to authenticated using (is_founder());
create policy activity_insert on activity_log for insert to authenticated with check (actor_id = my_founder_id());

-- settings: read all founders; write CMO/COO
create policy settings_read on app_settings for select to authenticated using (is_founder());
create policy settings_write on app_settings for all to authenticated
  using (my_department() in ('Marketing & Students','Business & Operations'))
  with check (my_department() in ('Marketing & Students','Business & Operations'));

-- private storage bucket for documents
insert into storage.buckets (id, name, public) values ('documents','documents', false)
on conflict (id) do nothing;

create policy docs_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'documents' and is_founder());
create policy docs_storage_write on storage.objects for insert to authenticated with check (
  bucket_id = 'documents' and is_founder());
create policy docs_storage_update on storage.objects for update to authenticated using (
  bucket_id = 'documents' and is_founder());
create policy docs_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'documents' and is_founder());

-- seed founders (login emails wired later)
insert into founders (founder_code, full_name, role_title, department) values
  ('FDR-001','Afvan','Co-Founder & CMO','Marketing & Students'),
  ('FDR-002','Razin','Co-Founder & COO','Business & Operations'),
  ('FDR-003','Jaleel','Co-Founder & Technical & Academic Director','Courses & Technology');

insert into app_settings (key, value) values
  ('restricted_doc_categories', '["legal","finance"]'),
  ('expense_categories', '["travel","food","software","marketing","operations","other"]'),
  ('weekly_report_reminder', '{"day":"sun","time":"18:00"}');


-- ===== SECTION: Marketing Progress (was migration-02) =====

create table market_research (
  id uuid primary key default gen_random_uuid(),
  research_code text unique not null,
  title text not null,
  kind text not null default 'research' check (kind in ('research','survey')),
  target_audience text,
  findings text,
  report_notes text,
  status text not null default 'planned' check (status in ('planned','in_progress','completed')),
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  competitor_code text unique not null,
  name text not null,
  location text,
  course_categories text,
  pricing_notes text,
  marketing_strategies text,
  strengths text,
  weaknesses text,
  notes text,
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table brand_assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text unique not null,
  asset_type text not null default 'document' check (asset_type in ('guideline','logo','color','typography','positioning','document')),
  title text not null,
  details text,
  file_path text,
  file_name text,
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table content_calendar (
  id uuid primary key default gen_random_uuid(),
  content_code text unique not null,
  title text not null,
  platform text,
  content_type text,
  caption text,
  media_path text,
  assigned_to uuid references founders(id),
  publish_date date,
  status text not null default 'idea' check (status in ('idea','draft','scheduled','published')),
  published_url text,
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_code text unique not null,
  name text not null,
  objective text,
  platform text,
  budget numeric(12,2) check (budget is null or budget >= 0),
  start_date date,
  end_date date,
  target_audience text,
  results text,
  status text not null default 'planned' check (status in ('planned','active','completed','paused')),
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  lead_code text unique not null,
  student_name text not null,
  contact_number text,
  interested_course text,
  source text,
  enquiry_date date not null default current_date,
  assigned_to uuid references founders(id),
  followup_date date,
  status text not null default 'new' check (status in ('new','contacted','interested','demo_scheduled','converted','not_interested')),
  remarks text,
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table lead_followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  founder_id uuid references founders(id),
  note text not null,
  followup_date date,
  created_at timestamptz not null default now()
);

alter table market_research enable row level security;
alter table competitors enable row level security;
alter table brand_assets enable row level security;
alter table content_calendar enable row level security;
alter table campaigns enable row level security;
alter table leads enable row level security;
alter table lead_followups enable row level security;

do $$ declare t text; begin
  foreach t in array array['market_research','competitors','brand_assets','content_calendar','campaigns','leads']
  loop
    execute format('create policy %I on %I for select to authenticated using (is_founder())', t||'_read', t);
    execute format('create policy %I on %I for all to authenticated using (my_department() = ''Marketing & Students'') with check (my_department() = ''Marketing & Students'')', t||'_write', t);
    execute format('create trigger trg_touch_%I before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

create policy lead_followups_read on lead_followups for select to authenticated using (is_founder());
create policy lead_followups_write on lead_followups for all to authenticated
  using (my_department() = 'Marketing & Students') with check (my_department() = 'Marketing & Students');


-- ===== SECTION: Financial Management (was migration-03) =====

create table income (
  id uuid primary key default gen_random_uuid(),
  income_code text unique not null,
  received_on date not null default current_date,
  category text not null default 'other' check (category in ('course_fee','admission_fee','service','consulting','other')),
  course_name text,
  description text,
  amount numeric(12,2) not null check (amount >= 0),
  payment_method text,
  received_from text,
  reference_number text,
  receipt_path text,
  logged_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  budget_code text unique not null,
  category text not null,
  period_month date not null,  -- first day of month
  planned_amount numeric(12,2) not null check (planned_amount >= 0),
  notes text,
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(category, period_month)
);

create table founder_contributions (
  id uuid primary key default gen_random_uuid(),
  contribution_code text unique not null,
  founder_id uuid not null references founders(id),
  contribution_date date not null default current_date,
  amount numeric(12,2) not null check (amount > 0),
  contribution_type text not null default 'capital' check (contribution_type in ('capital','loan','expense_cover','other')),
  reference text,
  remarks text,
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table outstanding_payments (
  id uuid primary key default gen_random_uuid(),
  outstanding_code text unique not null,
  payer text not null,
  description text,
  amount_due numeric(12,2) not null check (amount_due >= 0),
  due_date date,
  status text not null default 'pending' check (status in ('pending','partial','paid')),
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table transaction_edits (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('income','expense')),
  entity_id uuid not null,
  entity_code text,
  edited_by uuid references founders(id),
  old_row jsonb not null,
  new_row jsonb not null,
  created_at timestamptz not null default now()
);

alter table expenses add column if not exists paid_to text;
alter table expenses add column if not exists approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected'));
update expenses set approval_status = 'approved' where approval_status = 'pending';

create or replace function audit_tx_edit() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into transaction_edits (entity, entity_id, entity_code, edited_by, old_row, new_row)
  values (TG_ARGV[0], old.id, coalesce(to_jsonb(old)->>'income_code', to_jsonb(old)->>'expense_code'), my_founder_id(), to_jsonb(old), to_jsonb(new));
  return new;
end $$;

create trigger trg_audit_income before update on income for each row execute function audit_tx_edit('income');
create trigger trg_audit_expense before update on expenses for each row execute function audit_tx_edit('expense');

alter table income enable row level security;
alter table budgets enable row level security;
alter table founder_contributions enable row level security;
alter table outstanding_payments enable row level security;
alter table transaction_edits enable row level security;

do $$ declare t text; begin
  foreach t in array array['income','budgets','founder_contributions','outstanding_payments']
  loop
    execute format('create policy %I on %I for select to authenticated using (is_founder())', t||'_read', t);
    execute format('create policy %I on %I for all to authenticated using (my_department() = ''Business & Operations'') with check (my_department() = ''Business & Operations'')', t||'_write', t);
    execute format('create trigger trg_touch_%I before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

create policy transaction_edits_read on transaction_edits for select to authenticated using (is_founder());


-- ===== SECTION: Meetings + Decision Register (was migration-04) =====

create table meetings (
  id uuid primary key default gen_random_uuid(),
  meeting_code text unique not null,
  title text not null,
  scheduled_at timestamptz not null,
  mode text not null default 'online' check (mode in ('online','in_person','phone')),
  agenda text,
  participants uuid[] not null default '{}',
  discussion_notes text,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  action text not null,
  assigned_to uuid references founders(id),
  deadline date,
  status text not null default 'pending' check (status in ('pending','done')),
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table decision_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  founder_id uuid not null references founders(id),
  acknowledged_at timestamptz not null default now(),
  unique(decision_id, founder_id)
);

alter table meetings enable row level security;
alter table meeting_action_items enable row level security;
alter table decision_acknowledgements enable row level security;

create policy meetings_read on meetings for select to authenticated using (is_founder());
create policy meetings_write on meetings for all to authenticated using (is_founder()) with check (is_founder());
create policy action_items_read on meeting_action_items for select to authenticated using (is_founder());
create policy action_items_write on meeting_action_items for all to authenticated using (is_founder()) with check (is_founder());
create policy ack_read on decision_acknowledgements for select to authenticated using (is_founder());
create policy ack_insert on decision_acknowledgements for insert to authenticated with check (founder_id = my_founder_id());
create policy ack_delete on decision_acknowledgements for delete to authenticated using (founder_id = my_founder_id());

do $$ declare t text; begin
  foreach t in array array['meetings','meeting_action_items']
  loop execute format('create trigger trg_touch_%I before update on %I for each row execute function touch_updated_at()', t, t); end loop;
end $$;


-- ===== SECTION: Knowledge Hub + Notifications (was migration-05) =====

create table knowledge_items (
  id uuid primary key default gen_random_uuid(),
  item_code text unique not null,
  category text not null check (category in ('shared_notes','learning_resources','research_materials','founder_presentations','training_materials','recorded_sessions','shared_documents')),
  title text not null,
  body text,
  link text,
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table knowledge_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references knowledge_items(id) on delete cascade,
  founder_id uuid references founders(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table knowledge_sessions (
  id uuid primary key default gen_random_uuid(),
  session_code text unique not null,
  month date not null, -- first day of the month; monthly knowledge-sharing schedule
  topic text not null,
  presenter uuid references founders(id),
  department text,
  status text not null default 'planned' check (status in ('planned','done','cancelled')),
  created_by uuid references founders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founders(id) on delete cascade, -- recipient
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on notifications (founder_id, read, created_at desc);

alter table knowledge_items enable row level security;
alter table knowledge_comments enable row level security;
alter table knowledge_sessions enable row level security;
alter table notifications enable row level security;

create policy knowledge_read on knowledge_items for select to authenticated using (is_founder());
create policy knowledge_write on knowledge_items for all to authenticated using (is_founder()) with check (is_founder());
create policy kcomments_read on knowledge_comments for select to authenticated using (is_founder());
create policy kcomments_insert on knowledge_comments for insert to authenticated with check (founder_id = my_founder_id());
create policy kcomments_delete on knowledge_comments for delete to authenticated using (founder_id = my_founder_id());
create policy ksessions_read on knowledge_sessions for select to authenticated using (is_founder());
create policy ksessions_write on knowledge_sessions for all to authenticated using (is_founder()) with check (is_founder());

create policy notifications_read_own on notifications for select to authenticated using (founder_id = my_founder_id());
create policy notifications_update_own on notifications for update to authenticated using (founder_id = my_founder_id()) with check (founder_id = my_founder_id());
create policy notifications_delete_own on notifications for delete to authenticated using (founder_id = my_founder_id());

do $$ declare t text; begin
  foreach t in array array['knowledge_items','knowledge_sessions']
  loop execute format('create trigger trg_touch_%I before update on %I for each row execute function touch_updated_at()', t, t); end loop;
end $$;

create or replace function notify_founders(p_recipients uuid[], p_type text, p_title text, p_body text default null, p_link text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (founder_id, type, title, body, link)
  select r, p_type, p_title, p_body, p_link from unnest(p_recipients) r where r is not null;
end $$;

create or replace function other_founders(p_exclude uuid)
returns uuid[] language sql security definer set search_path = public stable as $$
  select coalesce(array_agg(id), '{}') from founders where is_active and id is distinct from p_exclude;
$$;

create or replace function trg_notify_task() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.assigned_to is not null then
    perform notify_founders(array[new.assigned_to], 'task_assigned', 'New task assigned: ' || new.title, null, '/tasks');
  elsif tg_op = 'UPDATE' and new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to then
    perform notify_founders(array[new.assigned_to], 'task_assigned', 'Task reassigned to you: ' || new.title, null, '/tasks');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_task on tasks;
create trigger trg_notify_task after insert or update on tasks for each row execute function trg_notify_task();

create or replace function trg_notify_document() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform notify_founders(other_founders(new.created_by), 'document_shared', 'Document shared: ' || new.title, null, '/documents');
  elsif tg_op = 'UPDATE' and new.status = 'active' and old.status is distinct from 'active' then
    perform notify_founders(other_founders(new.created_by), 'document_approved', 'Document approved: ' || new.title, null, '/documents');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_document on documents;
create trigger trg_notify_document after insert or update on documents for each row execute function trg_notify_document();

create or replace function trg_notify_meeting() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify_founders(new.participants, 'meeting_scheduled', 'Meeting scheduled: ' || new.title, to_char(new.scheduled_at, 'DD Mon YYYY HH24:MI'), '/meetings');
  return new;
end $$;
drop trigger if exists trg_notify_meeting on meetings;
create trigger trg_notify_meeting after insert on meetings for each row execute function trg_notify_meeting();

create or replace function trg_notify_decision() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify_founders(other_founders(new.created_by), 'decision_recorded', 'New decision: ' || new.title, null, '/meetings');
  return new;
end $$;
drop trigger if exists trg_notify_decision on decisions;
create trigger trg_notify_decision after insert on decisions for each row execute function trg_notify_decision();

create or replace function trg_notify_report() returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select full_name into v_name from founders where id = new.founder_id;
  perform notify_founders(other_founders(new.founder_id), 'weekly_report', coalesce(v_name,'A founder') || ' submitted a weekly report', 'Week of ' || to_char(new.week_start, 'DD Mon YYYY'), '/reports');
  return new;
end $$;
drop trigger if exists trg_notify_report on weekly_reports;
create trigger trg_notify_report after insert on weekly_reports for each row execute function trg_notify_report();

create or replace function trg_notify_course() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform notify_founders(other_founders(new.created_by), 'course_update', 'New course proposed: ' || new.name, null, '/courses');
  elsif tg_op = 'UPDATE' and new.development_status is distinct from old.development_status then
    perform notify_founders(other_founders(new.created_by), 'course_update', 'Course ' || new.name || ' is now ' || replace(new.development_status,'_',' '), null, '/courses');
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_course on courses;
create trigger trg_notify_course after insert or update on courses for each row execute function trg_notify_course();

create or replace function trg_notify_outstanding() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify_founders(other_founders(null), 'financial_alert', 'Outstanding payment recorded: ' || new.payer, '₹' || trim(to_char(new.amount_due, '999G999G990')) || ' due' || coalesce(' on ' || to_char(new.due_date, 'DD Mon YYYY'), ''), '/expenses');
  return new;
end $$;
drop trigger if exists trg_notify_outstanding on outstanding_payments;
create trigger trg_notify_outstanding after insert on outstanding_payments for each row execute function trg_notify_outstanding();

create or replace function trg_notify_knowledge() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify_founders(other_founders(new.created_by), 'knowledge_shared', 'Knowledge hub: ' || new.title, null, '/knowledge');
  return new;
end $$;
drop trigger if exists trg_notify_knowledge on knowledge_items;
create trigger trg_notify_knowledge after insert on knowledge_items for each row execute function trg_notify_knowledge();


-- ===== SECTION: Report comments (was migration-08) =====

create table report_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references weekly_reports(id) on delete cascade,
  founder_id uuid references founders(id),
  body text not null,
  created_at timestamptz not null default now()
);
alter table report_comments enable row level security;
create policy rcomments_read on report_comments for select to authenticated using (is_founder());
create policy rcomments_insert on report_comments for insert to authenticated with check (founder_id = my_founder_id());
create policy rcomments_delete on report_comments for delete to authenticated using (founder_id = my_founder_id());

-- ============================================================
-- migration-09: Business Mentor Portal (applied Nov 8, 2026)
-- REMOVED Nov 10, 2026 (user request) by migration-12 below.
-- The mentor sector (portal, tables, policies, functions) no longer exists.
-- Backup of schema + data: Drive file "teqx-mentor-sector-backup-2026-11-10.txt".
-- ============================================================

-- MIGRATION 10: Admin panel (admin_users, is_admin(), admin_all policies,
-- owner/last-admin protection triggers)
-- =====================================================================
-- migration-10: Admin Panel role
-- Adds admin_users, is_admin(), full-access admin policies on every public table,
-- and protection for the owner founder record (FDR-001) and the last admin.

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null,
  email citext unique,
  full_name text not null default 'Admin',
  created_at timestamptz not null default now()
);
alter table admin_users enable row level security;

create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists(select 1 from admin_users where auth_user_id = auth.uid()) $$;

-- admins and founders can read the admin list; only admins manage it
create policy admin_users_read on admin_users for select to authenticated
  using (is_admin() or is_founder());
create policy admin_users_insert on admin_users for insert to authenticated
  with check (is_admin());
create policy admin_users_update on admin_users for update to authenticated
  using (is_admin()) with check (is_admin());
create policy admin_users_delete on admin_users for delete to authenticated
  using (is_admin());

-- never delete the last admin account
create or replace function protect_last_admin() returns trigger language plpgsql as $$
begin
  if (select count(*) from admin_users) <= 1 then
    raise exception 'Cannot delete the last admin account';
  end if;
  return old;
end $$;
create trigger admin_users_protect_last before delete on admin_users
  for each row execute function protect_last_admin();

-- admin full access on every existing public table
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'admin_users'
  loop
    execute format('create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- protect the owner founder record (FDR-001, Afvan) from deletion
create or replace function protect_owner_founder() returns trigger language plpgsql as $$
begin
  if old.founder_code = 'FDR-001' then
    raise exception 'The owner founder record (FDR-001) cannot be deleted';
  end if;
  return old;
end $$;
create trigger founders_protect_owner before delete on founders
  for each row execute function protect_owner_founder();

-- =====================================================================
-- MIGRATION 11: Username-based login (no email for users)
-- usernames table, resolve_username, admin_create_user / admin_reset_password
-- / admin_delete_user
-- =====================================================================
-- migration-11: Username + password accounts managed from the Admin Panel
-- Admin creates username/password logins (no Gmail needed). Internally each username
-- maps to <username>@users.teqxacademy.in in Supabase Auth; the login page resolves it.

create extension if not exists pgcrypto;

create table if not exists usernames (
  username citext primary key,
  auth_user_id uuid unique not null,
  created_at timestamptz not null default now()
);
alter table usernames enable row level security;
create policy usernames_admin on usernames for all to authenticated
  using (is_admin()) with check (is_admin());

-- login page (pre-auth) resolves a username to the internal email
create or replace function resolve_username(p_username text) returns text
  language sql stable security definer set search_path = public, auth
  as $$
    select u.email::text from auth.users u
    join public.usernames un on un.auth_user_id = u.id
    where un.username = lower(trim(p_username))
  $$;
grant execute on function resolve_username(text) to anon, authenticated;

-- admin: create a username+password login, optionally linked to a founder/mentor/admin record
create or replace function admin_create_user(p_username text, p_password text, p_full_name text, p_link_type text default null, p_link_id uuid default null)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_uid uuid := gen_random_uuid(); v_email text;
begin
  if not is_admin() then raise exception 'Admin only'; end if;
  p_username := lower(trim(p_username));
  if p_username !~ '^[a-z0-9_.-]{3,30}$' then raise exception 'Username must be 3-30 characters: a-z, 0-9, _, ., -'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  if exists(select 1 from usernames where username = p_username) then raise exception 'Username already taken'; end if;
  v_email := p_username || '@users.teqxacademy.in';
  if exists(select 1 from auth.users where email = v_email) then raise exception 'Username already taken'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change,
                          email_change_token_current, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
          crypt(p_password, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}',
          jsonb_build_object('full_name', coalesce(nullif(p_full_name,''), p_username)), now(), now(),
          '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, 'email', v_uid::text,
          jsonb_build_object('sub', v_uid::text, 'email', v_email), now(), now(), now());
  insert into usernames (username, auth_user_id) values (p_username, v_uid);
  if p_link_type = 'founder' then
    if exists(select 1 from founders where id = p_link_id and auth_user_id is not null) then
      raise exception 'That founder already has a linked login'; end if;
    update founders set auth_user_id = v_uid where id = p_link_id;
  elsif p_link_type = 'mentor' then
    if exists(select 1 from mentors where id = p_link_id and auth_user_id is not null) then
      raise exception 'That mentor already has a linked login'; end if;
    update mentors set auth_user_id = v_uid where id = p_link_id;
  elsif p_link_type = 'admin' then
    insert into admin_users (auth_user_id, email, full_name)
    values (v_uid, v_email, coalesce(nullif(p_full_name,''),'Teqx Admin'));
  end if;
  return v_uid;
end $$;
revoke all on function admin_create_user(text,text,text,text,uuid) from public, anon;
grant execute on function admin_create_user(text,text,text,text,uuid) to authenticated;

-- admin: reset a username account's password
create or replace function admin_reset_password(p_username text, p_password text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_uid uuid;
begin
  if not is_admin() then raise exception 'Admin only'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  select auth_user_id into v_uid from usernames where username = lower(trim(p_username));
  if v_uid is null then raise exception 'Username not found'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = v_uid;
end $$;
revoke all on function admin_reset_password(text,text) from public, anon;
grant execute on function admin_reset_password(text,text) to authenticated;

-- admin: delete a username account (never yourself, never the account linked to owner FDR-001)
create or replace function admin_delete_user(p_username text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_uid uuid;
begin
  if not is_admin() then raise exception 'Admin only'; end if;
  select auth_user_id into v_uid from usernames where username = lower(trim(p_username));
  if v_uid is null then raise exception 'Username not found'; end if;
  if v_uid = auth.uid() then raise exception 'You cannot delete the account you are signed in with'; end if;
  if exists(select 1 from founders where auth_user_id = v_uid and founder_code = 'FDR-001') then
    raise exception 'The owner (FDR-001) login is protected and cannot be deleted'; end if;
  update founders set auth_user_id = null where auth_user_id = v_uid;
  update mentors set auth_user_id = null where auth_user_id = v_uid;
  delete from admin_users where auth_user_id = v_uid;
  delete from usernames where auth_user_id = v_uid;
  delete from auth.users where id = v_uid;
end $$;
revoke all on function admin_delete_user(text) from public, anon;
grant execute on function admin_delete_user(text) to authenticated;
-- migration-12: remove the mentor sector entirely (user request, Nov 10 2026)
-- Backup before removal: Drive file "teqx-mentor-sector-backup-2026-11-10.txt"
-- (Academy folder) - schema + all data + function definitions.

-- founder-side triggers that notified mentors
drop trigger if exists trg_mnotify_document on documents;
drop trigger if exists trg_mnotify_report on weekly_reports;
drop trigger if exists trg_mnotify_task_update on task_updates;

-- mentor-owned tables (policies and triggers on them go with the tables)
drop table if exists recommendation_responses, recommendations, milestone_updates,
  milestones, academy_progress, mentoring_meeting_notes, mentoring_meetings,
  mentor_reviews, mentor_comments, mentor_notifications, mentor_activity_log,
  mentor_permissions, mentors;

-- mentor functions; CASCADE drops dependent mentor_read_* policies and triggers
do $$ declare r record;
begin
  for r in select p.oid::regprocedure::text as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname ilike '%mentor%'
           or p.proname in ('trg_mnotify_document','trg_mnotify_report','trg_mnotify_task_update',
                            'trg_notify_recommendation','trg_mnotify_milestone'))
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;
-- migration-13: drop mentor link branches from the user-account functions
-- (mentors table no longer exists after migration-12)

create or replace function admin_create_user(p_username text, p_password text, p_full_name text, p_link_type text default null, p_link_id uuid default null)
returns uuid language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_uid uuid := gen_random_uuid(); v_email text;
begin
  if not is_admin() then raise exception 'Admin only'; end if;
  p_username := lower(trim(p_username));
  if p_username !~ '^[a-z0-9_.-]{3,30}$' then raise exception 'Username must be 3-30 characters: a-z, 0-9, _, ., -'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  if exists(select 1 from usernames where username = p_username) then raise exception 'Username already taken'; end if;
  v_email := p_username || '@users.teqxacademy.in';
  if exists(select 1 from auth.users where email = v_email) then raise exception 'Username already taken'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change,
                          email_change_token_current, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
          crypt(p_password, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}',
          jsonb_build_object('full_name', coalesce(nullif(p_full_name,''), p_username)), now(), now(),
          '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, 'email', v_uid::text,
          jsonb_build_object('sub', v_uid::text, 'email', v_email), now(), now(), now());
  insert into usernames (username, auth_user_id) values (p_username, v_uid);
  if p_link_type = 'founder' then
    if exists(select 1 from founders where id = p_link_id and auth_user_id is not null) then
      raise exception 'That founder already has a linked login'; end if;
    update founders set auth_user_id = v_uid where id = p_link_id;
  elsif p_link_type = 'admin' then
    insert into admin_users (auth_user_id, email, full_name)
    values (v_uid, v_email, coalesce(nullif(p_full_name,''),'Teqx Admin'));
  end if;
  return v_uid;
end $$;
revoke all on function admin_create_user(text,text,text,text,uuid) from public, anon;
grant execute on function admin_create_user(text,text,text,text,uuid) to authenticated;

create or replace function admin_delete_user(p_username text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_uid uuid;
begin
  if not is_admin() then raise exception 'Admin only'; end if;
  select auth_user_id into v_uid from usernames where username = lower(trim(p_username));
  if v_uid is null then raise exception 'Username not found'; end if;
  if v_uid = auth.uid() then raise exception 'You cannot delete the account you are signed in with'; end if;
  if exists(select 1 from founders where auth_user_id = v_uid and founder_code = 'FDR-001') then
    raise exception 'The owner (FDR-001) login is protected and cannot be deleted'; end if;
  update founders set auth_user_id = null where auth_user_id = v_uid;
  delete from admin_users where auth_user_id = v_uid;
  delete from usernames where auth_user_id = v_uid;
  delete from auth.users where id = v_uid;
end $$;
revoke all on function admin_delete_user(text) from public, anon;
grant execute on function admin_delete_user(text) to authenticated;

-- cleanup: orphan trigger function left over from the mentor sector
drop function if exists public.trg_mnotify_rec_response() cascade;
