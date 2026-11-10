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
