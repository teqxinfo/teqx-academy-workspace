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
