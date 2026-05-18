-- Harden Supabase RPC execution posture after PR #535 advisor review.
--
-- Supabase database linter 0029 flags SECURITY DEFINER functions that are
-- executable by the authenticated role. These functions are intentionally
-- callable from the application, so keep authenticated execution but remove
-- SECURITY DEFINER elevation where possible. This preserves app RPC access
-- while making execution follow the caller's privileges/RLS context.
--
-- Also add the missing covering index for automation_run_logs.job_id reported
-- by the performance advisor when that table exists. Existing "unused index"
-- hints are intentionally not dropped here because this project is still being
-- built out and many indexes support required FK/reporting/query paths even if
-- they have not yet appeared in pg_stat_user_indexes.
--
-- PostgreSQL does not support `ALTER FUNCTION IF EXISTS ...`, so each function
-- is resolved with to_regprocedure before applying ALTER/REVOKE/GRANT.

begin;

do $$
declare
  rpc_signature text;
  rpc_functions text[] := array[
    'public.post_receipt_atomic(jsonb)',
    'public.renew_contract_atomic(uuid,jsonb)',
    'public.void_receipt_atomic(uuid,bigint,jsonb,jsonb)',
    'public.rpt_aged_receivables(date)',
    'public.rpt_balance_sheet(date)',
    'public.rpt_daily_collection(date,date)',
    'public.rpt_financial_summary(date,date)',
    'public.rpt_income_statement(date,date)',
    'public.rpt_overdue_invoices(date)',
    'public.rpt_owner_statement(uuid,date,date)',
    'public.rpt_rent_roll(date)',
    'public.rpt_tenant_statement(uuid)',
    'public.rpt_trial_balance(date)'
  ];
begin
  foreach rpc_signature in array rpc_functions loop
    if to_regprocedure(rpc_signature) is not null then
      execute format('alter function %s security invoker', rpc_signature);
      execute format('revoke execute on function %s from public', rpc_signature);
      execute format('grant execute on function %s to authenticated', rpc_signature);
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.automation_run_logs') is not null then
    create index if not exists idx_automation_run_logs_job_id
      on public.automation_run_logs(job_id);
  end if;
end $$;

commit;
