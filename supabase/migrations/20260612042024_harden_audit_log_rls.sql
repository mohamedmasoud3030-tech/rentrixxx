-- Harden RLS on public.audit_log
--
-- Issue: the live policy `audit_log_all` grants ALL (select/insert/update/
-- delete) to any authenticated user via `auth.uid() IS NOT NULL`. For a
-- governance/audit table this means any signed-in USER can tamper with or
-- erase audit history, which defeats the purpose of the audit log.
--
-- Fix:
--   - SELECT: any authenticated app user (read-only governance view,
--     matches the "قراءة فقط" framing already shown in the UI).
--   - INSERT/UPDATE/DELETE: ADMIN/MANAGER only via the API. Nothing in the
--     application currently writes to this table; this closes the gap
--     without blocking any existing feature.
--
-- Idempotent: safe to re-run.

drop policy if exists audit_log_all on public.audit_log;
drop policy if exists audit_log_select on public.audit_log;
drop policy if exists audit_log_insert on public.audit_log;
drop policy if exists audit_log_write on public.audit_log;

alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

create policy audit_log_select
  on public.audit_log for select to authenticated
  using (app_private.is_app_user());

create policy audit_log_write
  on public.audit_log for all to authenticated
  using (app_private.is_admin_or_manager())
  with check (app_private.is_admin_or_manager());
