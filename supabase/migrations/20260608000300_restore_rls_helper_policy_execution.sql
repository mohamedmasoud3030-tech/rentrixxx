-- Restore RLS policy helper execution without re-exposing browser-facing RPCs.
--
-- The previous hardening migration revoked EXECUTE on public.is_app_user() and
-- public.is_admin_or_manager() from authenticated. Those functions are invoked
-- by RLS policy expressions, which execute for authenticated browser queries.
-- Revoking EXECUTE therefore prevents operational table reads and writes.
--
-- Keep the implementation in a non-exposed schema for policy evaluation and
-- retain locked public wrappers for SECURITY DEFINER functions that still call
-- the historical public helper names internally.

begin;

create schema if not exists app_private;

revoke all on schema app_private from public;
revoke all on schema app_private from anon;
revoke all on schema app_private from authenticated;
grant usage on schema app_private to authenticated, service_role;

do $$
begin
  if to_regprocedure('public.is_app_user()') is null then
    raise exception 'public.is_app_user() must exist before RLS helper repair';
  end if;

  if to_regprocedure('public.is_admin_or_manager()') is null then
    raise exception 'public.is_admin_or_manager() must exist before RLS helper repair';
  end if;

  if to_regprocedure('app_private.is_app_user()') is not null then
    raise exception 'app_private.is_app_user() already exists; inspect partial rollout before continuing';
  end if;

  if to_regprocedure('app_private.is_admin_or_manager()') is not null then
    raise exception 'app_private.is_admin_or_manager() already exists; inspect partial rollout before continuing';
  end if;
end;
$$;

alter function public.is_app_user() set schema app_private;
alter function public.is_admin_or_manager() set schema app_private;

revoke all on function app_private.is_app_user() from public, anon;
revoke all on function app_private.is_admin_or_manager() from public, anon;
grant execute on function app_private.is_app_user() to authenticated, service_role;
grant execute on function app_private.is_admin_or_manager() to authenticated, service_role;

create function public.is_app_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_app_user();
$$;

create function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_admin_or_manager();
$$;

revoke all on function public.is_app_user() from public, anon, authenticated;
revoke all on function public.is_admin_or_manager() from public, anon, authenticated;
grant execute on function public.is_app_user() to service_role;
grant execute on function public.is_admin_or_manager() to service_role;

comment on schema app_private is 'Non-exposed implementation schema for Rentrix RLS policy helpers';
comment on function public.is_app_user() is 'Locked compatibility wrapper for internal SECURITY DEFINER callers';
comment on function public.is_admin_or_manager() is 'Locked compatibility wrapper for internal SECURITY DEFINER callers';

commit;
