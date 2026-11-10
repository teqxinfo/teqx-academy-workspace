-- migration-14: owner founder protection now keys on the row id, not the code
-- (admin can rename founder codes through the panel; FDR-001 was renamed to 001,
--  which silently disabled the code-based protection)

create or replace function public.protect_owner_founder() returns trigger language plpgsql as $$
begin
  if old.id = '4d6b81cc-d3b9-445e-b06e-d645d7805e8b'::uuid then
    raise exception 'The owner founder record (Afvan) cannot be deleted';
  end if;
  return old;
end $$;
