-- Harden Supabase RPC execution posture after PR #535 advisor review.
--
-- Supabase database linter 0029 flags SECURITY DEFINER functions that are
-- executable by the authenticated role. These functions are intentionally
-- callable from the application, so keep authenticated execution but remove
-- SECURITY DEFINER elevation where possible. This preserves app RPC access
-- while making execution follow the caller's privileges/RLS context.
--
-- Also add the missing covering index for automation_run_logs.job_id reported
-- by the performance advisor. Existing "unused index" hints are intentionally
-- not dropped here because this project is still being built out and many
-- indexes support required FK/reporting/query paths even if they have not yet
-- appeared in pg_stat_user_indexes.

begin;

-- Mutation RPCs
alter function if exists public.post_receipt_atomic(jsonb) security invoker;
alter function if exists public.renew_contract_atomic(uuid, jsonb) security invoker;
alter function if exists public.void_receipt_atomic(uuid, bigint, jsonb, jsonb) security invoker;

-- Report RPCs
alter function if exists public.rpt_aged_receivables(date) security invoker;
alter function if exists public.rpt_balance_sheet(date) security invoker;
alter function if exists public.rpt_daily_collection(date, date) security invoker;
alter function if exists public.rpt_financial_summary(date, date) security invoker;
alter function if exists public.rpt_income_statement(date, date) security invoker;
alter function if exists public.rpt_overdue_invoices(date) security invoker;
alter function if exists public.rpt_owner_statement(uuid, date, date) security invoker;
alter function if exists public.rpt_rent_roll(date) security invoker;
alter function if exists public.rpt_tenant_statement(uuid) security invoker;
alter function if exists public.rpt_trial_balance(date) security invoker;

-- Keep RPCs callable only by expected runtime roles, not PUBLIC/anonymous by default.
revoke execute on function public.post_receipt_atomic(jsonb) from public;
revoke execute on function public.renew_contract_atomic(uuid, jsonb) from public;
revoke execute on function public.void_receipt_atomic(uuid, bigint, jsonb, jsonb) from public;
revoke execute on function public.rpt_aged_receivables(date) from public;
revoke execute on function public.rpt_balance_sheet(date) from public;
revoke execute on function public.rpt_daily_collection(date, date) from public;
revoke execute on function public.rpt_financial_summary(date, date) from public;
revoke execute on function public.rpt_income_statement(date, date) from public;
revoke execute on function public.rpt_overdue_invoices(date) from public;
revoke execute on function public.rpt_owner_statement(uuid, date, date) from public;
revoke execute on function public.rpt_rent_roll(date) from public;
revoke execute on function public.rpt_tenant_statement(uuid) from public;
revoke execute on function public.rpt_trial_balance(date) from public;

-- Authenticated app users still need these RPCs, now without SECURITY DEFINER elevation.
grant execute on function public.post_receipt_atomic(jsonb) to authenticated;
grant execute on function public.renew_contract_atomic(uuid, jsonb) to authenticated;
grant execute on function public.void_receipt_atomic(uuid, bigint, jsonb, jsonb) to authenticated;
grant execute on function public.rpt_aged_receivables(date) to authenticated;
grant execute on function public.rpt_balance_sheet(date) to authenticated;
grant execute on function public.rpt_daily_collection(date, date) to authenticated;
grant execute on function public.rpt_financial_summary(date, date) to authenticated;
grant execute on function public.rpt_income_statement(date, date) to authenticated;
grant execute on function public.rpt_overdue_invoices(date) to authenticated;
grant execute on function public.rpt_owner_statement(uuid, date, date) to authenticated;
grant execute on function public.rpt_rent_roll(date) to authenticated;
grant execute on function public.rpt_tenant_statement(uuid) to authenticated;
grant execute on function public.rpt_trial_balance(date) to authenticated;

-- Cover FK automation_run_logs.job_id.
create index if not exists idx_automation_run_logs_job_id
  on public.automation_run_logs(job_id);

commit;
