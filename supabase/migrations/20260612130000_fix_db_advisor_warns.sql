-- Fix two Supabase Advisor WARNs reported after PR #850.
--
-- WARN-1: public.audit_log — Multiple Permissive Policies
--   audit_log_write used FOR ALL, which implicitly covers SELECT.
--   Both audit_log_select and audit_log_write then applied to SELECT
--   for authenticated, triggering the "multiple permissive policies" advisor.
--   Fix: replace audit_log_write (FOR ALL) with three explicit single-action
--   policies (INSERT, UPDATE, DELETE). SELECT stays as audit_log_select only.
--
-- WARN-2: public.financial_operation_idempotency — Duplicate Index
--   The UNIQUE constraint on (operation, request_id) is backed by a unique
--   index named financial_operation_idempotency_operation_request_uidx.
--   The PRIMARY KEY on (operation, request_id) is backed by a separate index
--   named financial_operation_idempotency_pkey.
--   Both indexes cover exactly the same column set, making one redundant.
--   Fix: the PRIMARY KEY already enforces uniqueness and NOT NULL, so the
--   separate UNIQUE constraint (and its index) is dropped.
--
-- Both fixes are idempotent and safe to re-run.

-- ── WARN-1: audit_log RLS ─────────────────────────────────────────────────────

-- Drop the over-broad write policy created in 20260612042024_harden_audit_log_rls.sql
drop policy if exists audit_log_write on public.audit_log;

-- Restore audit_log_select (idempotent in case it was dropped by prior run)
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select
  on public.audit_log for select to authenticated
  using (app_private.is_app_user());

-- Replace FOR ALL with three narrow single-action policies
create policy audit_log_insert
  on public.audit_log for insert to authenticated
  with check (app_private.is_admin_or_manager());

create policy audit_log_update
  on public.audit_log for update to authenticated
  using  (app_private.is_admin_or_manager())
  with check (app_private.is_admin_or_manager());

create policy audit_log_delete
  on public.audit_log for delete to authenticated
  using (app_private.is_admin_or_manager());

-- ── WARN-2: financial_operation_idempotency duplicate index ───────────────────

-- The UNIQUE constraint is redundant because the PRIMARY KEY already covers
-- the same columns (operation, request_id) with a UNIQUE + NOT NULL guarantee.
alter table public.financial_operation_idempotency
  drop constraint if exists financial_operation_idempotency_operation_request_uidx;
