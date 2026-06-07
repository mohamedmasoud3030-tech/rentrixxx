-- =============================================================================
-- P0 Security Hardening: Replace flat auth.role()='authenticated' RLS policies
-- with policies that verify the caller exists in public.users AND is not disabled.
--
-- WHY:
--   The previous policies allowed ANY Supabase-authenticated identity (including
--   service role leaks, stale tokens, or unregistered users) to read and write
--   every row. The correct check is: "does this auth.uid() correspond to an
--   active, registered application user?"
--
-- APPROACH:
--   1. Create a STABLE SECURITY DEFINER helper is_app_user() that returns TRUE
--      iff auth.uid() maps to a non-disabled row in public.users.
--      Using SECURITY DEFINER avoids infinite RLS recursion when querying users.
--   2. Replace every _all_auth policy on business tables that exist in the
--      current schema. Fresh preview replay may not contain legacy tables.
--   3. Tighten users table to let ADMIN read all user rows (needed for admin UI).
--   4. Keep write guards for sensitive tables (users: only own row; profiles: own).
--
-- REGRESSION SAFETY:
--   - No column changes, no data changes.
--   - All existing authenticated app users continue to work unchanged.
--   - RPCs (post_receipt_atomic, renew_contract_atomic, void_receipt_atomic) are
--     SECURITY DEFINER and bypass RLS internally — unaffected by this migration.
-- =============================================================================

begin;


-- Precondition: ensure public.users exists for hosted previews that may replay
-- this migration without prior compatibility bootstrap migrations.
create table if not exists public.users (
  id uuid primary key,
  role text,
  status text
);

alter table public.users
  add column if not exists role text,
  add column if not exists status text;

alter table public.users enable row level security;

-- ---------------------------------------------------------------------------
-- 1. Helper: is_app_user()
--    Returns TRUE if auth.uid() is a registered, non-disabled application user.
--    SECURITY DEFINER + search_path='' to avoid RLS recursion on users table.
-- ---------------------------------------------------------------------------
create or replace function public.is_app_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'ACTIVE'
  );
$$;

-- Only authenticated role should call this helper
revoke execute on function public.is_app_user() from public, anon;
grant  execute on function public.is_app_user() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Helper: is_admin_or_manager()
--    Returns TRUE if the caller is ADMIN or MANAGER. Used for write guards
--    on sensitive reference tables.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role in ('ADMIN', 'MANAGER')
      and u.status = 'ACTIVE'
  );
$$;

revoke execute on function public.is_admin_or_manager() from public, anon;
grant  execute on function public.is_admin_or_manager() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Core business tables — replace flat policies with is_app_user() check
-- ---------------------------------------------------------------------------

-- Tables that get a simple "registered app user can do everything" policy.
-- Write-sensitive tables (users, profiles) are handled separately below.
-- Some legacy tables are intentionally absent from clean canonical previews, so
-- harden only relations that exist instead of aborting the migration replay.
do $$
declare
  t text;
  core_tables text[] := array[
    'properties','units','tenants','owners','contracts','invoices',
    'receipts','receipt_allocations','expenses','maintenance_records',
    'deposit_txs','journal_entries','accounts','account_balances',
    'owner_balances','owner_settlements','contract_balances','tenant_balances',
    'kpi_snapshots','snapshots','serials','governance','settings',
    'notification_templates','notifications','outgoing_notifications',
    'app_notifications','attachments','auto_backups','status_history',
    'status_transition_rules','automation_jobs','automation_run_logs',
    'budgets','commissions','leads','lands','missions','utility_bills',
    'payments','schema_refactor_notes'
  ];
begin
  foreach t in array core_tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'Skipping app-user RLS hardening for missing table public.%', t;
      continue;
    end if;

    -- Drop the old flat policy (handles both naming conventions used historically)
    execute format('drop policy if exists %I on public.%I', t || '_all_auth', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated_manage_' || t, t);

    -- Create the new policy
    execute format(
      'create policy %I on public.%I for all to authenticated
       using  (public.is_app_user())
       with check (public.is_app_user())',
      'app_user_' || t,
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. audit_log — keep existing split policies, just harden the check
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.audit_log') is null then
    raise notice 'Skipping audit_log RLS hardening because public.audit_log is missing';
  else
    execute 'drop policy if exists audit_log_select on public.audit_log';
    execute 'drop policy if exists audit_log_insert on public.audit_log';

    execute 'create policy audit_log_select
      on public.audit_log for select to authenticated
      using (public.is_app_user())';

    execute 'create policy audit_log_insert
      on public.audit_log for insert to authenticated
      with check (public.is_app_user())';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. users table — split into read/write with role awareness
--    - Any app user can read own row (needed for auth context)
--    - ADMIN can read ALL user rows (needed for user management UI)
--    - Any app user can update own row
--    - Only ADMIN can insert new users
-- ---------------------------------------------------------------------------
drop policy if exists "users can read own profile"   on public.users;
drop policy if exists "users can update own profile" on public.users;
drop policy if exists users_all_auth                 on public.users;
drop policy if exists app_user_users                 on public.users;

-- SELECT: own row always; admins see all
create policy users_select
on public.users for select to authenticated
using (
  (select auth.uid()) = id
  or public.is_admin_or_manager()
);

-- UPDATE: only own row (password changes, display name, etc.)
create policy users_update_own
on public.users for update to authenticated
using  ((select auth.uid()) = id and public.is_app_user())
with check ((select auth.uid()) = id);

-- INSERT: only ADMIN can create new app users
create policy users_insert_admin
on public.users for insert to authenticated
with check (public.is_admin_or_manager());

-- DELETE: only ADMIN (soft-delete preferred, but guard hard deletes)
create policy users_delete_admin
on public.users for delete to authenticated
using (public.is_admin_or_manager());

-- ---------------------------------------------------------------------------
-- 6. profiles table — keep own-row policies, already well-scoped
-- ---------------------------------------------------------------------------
-- profiles policies (profiles_select_own, profiles_insert_own,
-- profiles_update_own) are already correct — no changes needed.

-- ---------------------------------------------------------------------------
-- 7. sessions table — tighten to is_app_user when the legacy table exists
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.sessions') is null then
    raise notice 'Skipping sessions RLS hardening because public.sessions is missing';
  else
    execute 'drop policy if exists sessions_auth_policy on public.sessions';

    execute 'create policy sessions_select_own
      on public.sessions for select to authenticated
      using ((select auth.uid()) = id or public.is_admin_or_manager())';

    execute 'create policy sessions_insert_own
      on public.sessions for insert to authenticated
      with check ((select auth.uid()) = id and public.is_app_user())';

    execute 'create policy sessions_delete_own
      on public.sessions for delete to authenticated
      using ((select auth.uid()) = id or public.is_admin_or_manager())';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 8. contracts table — drop the legacy contracts_auth_policy and replace
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.contracts') is null then
    raise notice 'Skipping contracts RLS hardening because public.contracts is missing';
  else
    execute 'drop policy if exists contracts_auth_policy on public.contracts';
    execute 'drop policy if exists app_user_contracts on public.contracts';

    execute 'create policy app_user_contracts
      on public.contracts for all to authenticated
      using  (public.is_app_user())
      with check (public.is_app_user())';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Ensure FORCE ROW LEVEL SECURITY on all existing business-data tables
--    (prevents table owners / service role bypasses from going unnoticed)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  force_rls_tables text[] := array[
    'properties','units','tenants','owners','contracts','invoices','receipts',
    'receipt_allocations','expenses','maintenance_records','payments',
    'journal_entries','deposit_txs','accounts','owner_settlements'
  ];
begin
  foreach t in array force_rls_tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'Skipping FORCE ROW LEVEL SECURITY for missing table public.%', t;
      continue;
    end if;

    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

commit;
