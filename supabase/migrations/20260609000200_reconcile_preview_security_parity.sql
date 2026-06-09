-- =============================================================================
-- 20260609000200_reconcile_preview_security_parity.sql
--
-- Recreate security objects that exist on live but are absent after a clean
-- Supabase Preview replay because their historical versions are tracked locally
-- as foreign-migration stubs. This migration is additive and guarded.
-- =============================================================================

begin;

-- profiles: preserve the live own-row RLS contract on clean previews.
do $$
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles enable row level security;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'profiles'
        and policyname = 'profiles_select_own'
    ) then
      execute 'create policy profiles_select_own
        on public.profiles for select to authenticated
        using ((select auth.uid()) = id)';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'profiles'
        and policyname = 'profiles_insert_own'
    ) then
      execute 'create policy profiles_insert_own
        on public.profiles for insert to authenticated
        with check ((select auth.uid()) = id)';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'profiles'
        and policyname = 'profiles_update_own'
    ) then
      execute 'create policy profiles_update_own
        on public.profiles for update to authenticated
        using ((select auth.uid()) = id)
        with check ((select auth.uid()) = id)';
    end if;
  end if;
end;
$$;

-- financial_operation_idempotency: add the live deny-direct-access marker on
-- clean previews. Earlier rollout migrations already revoke table privileges.
do $$
begin
  if to_regclass('public.financial_operation_idempotency') is not null
     and not exists (
       select 1 from pg_policies
       where schemaname = 'public'
         and tablename = 'financial_operation_idempotency'
         and policyname = 'financial_operation_idempotency_no_direct_access'
     ) then
    execute 'create policy financial_operation_idempotency_no_direct_access
      on public.financial_operation_idempotency for all to anon, authenticated
      using (false) with check (false)';
  end if;
end;
$$;

-- Match the verified live posture for the browser-facing JSON renewal facade.
do $$
begin
  if to_regprocedure('public.renew_contract_atomic(uuid,jsonb)') is not null then
    alter function public.renew_contract_atomic(uuid, jsonb) security invoker;
    alter function public.renew_contract_atomic(uuid, jsonb)
      set search_path = public, pg_temp;
  end if;
end;
$$;

commit;
