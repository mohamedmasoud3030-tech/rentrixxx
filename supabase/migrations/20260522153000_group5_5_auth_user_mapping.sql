-- Group 5.5: ensure every authenticated Supabase user has a matching public.users row
-- so RLS helpers (is_app_user / is_admin_or_manager) evaluate correctly.

insert into public.users (id, email, role, is_active, created_at, updated_at)
select
  au.id,
  coalesce(au.email, ''),
  case
    when upper(coalesce(p.role::text, '')) in ('ADMIN', 'MANAGER') then upper(p.role::text)::public.user_role
    else 'USER'::public.user_role
  end,
  true,
  timezone('utc', now()),
  timezone('utc', now())
from auth.users au
left join public.profiles p on p.id = au.id
left join public.users u on u.id = au.id
where u.id is null;

create or replace function public.sync_app_user_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.users (id, email, role, is_active, created_at, updated_at)
  values (
    new.id,
    coalesce(new.email, ''),
    'USER'::public.user_role,
    true,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

revoke execute on function public.sync_app_user_from_auth() from public, anon;
grant execute on function public.sync_app_user_from_auth() to service_role;

drop trigger if exists trg_sync_app_user_from_auth on auth.users;
create trigger trg_sync_app_user_from_auth
after insert or update of email on auth.users
for each row
execute function public.sync_app_user_from_auth();
