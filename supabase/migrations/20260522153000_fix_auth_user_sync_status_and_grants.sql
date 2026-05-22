-- Ensure auth.users -> public.users sync matches actual public.users schema.
-- public.users is guaranteed to contain: id, role, status.

begin;

create table if not exists public.users (
  id uuid primary key,
  role text,
  status text
);

create or replace function public.sync_auth_user_to_public_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, role, status)
  values (new.id, 'USER', 'ACTIVE')
  on conflict (id) do update
    set role = coalesce(public.users.role, excluded.role),
        status = coalesce(public.users.status, excluded.status);

  return new;
end;
$$;

revoke execute on function public.sync_auth_user_to_public_users() from public, anon, authenticated;
grant execute on function public.sync_auth_user_to_public_users() to service_role;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant execute on function public.sync_auth_user_to_public_users() to supabase_auth_admin';
  end if;
end $$;

drop trigger if exists on_auth_user_created_sync_public_users on auth.users;
create trigger on_auth_user_created_sync_public_users
  after insert on auth.users
  for each row execute function public.sync_auth_user_to_public_users();

insert into public.users (id, role, status)
select au.id, 'USER', 'ACTIVE'
from auth.users au
on conflict (id) do update
  set role = coalesce(public.users.role, excluded.role),
      status = coalesce(public.users.status, excluded.status);

commit;
