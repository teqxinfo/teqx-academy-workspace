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
