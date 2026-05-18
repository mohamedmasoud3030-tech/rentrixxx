-- Retry migration for Supabase preview branch apply.
--
-- The earlier migration filename had already been seen by Supabase Branching
-- after a failed attempt, so this new filename ensures the guarded version is
-- picked up as a new migration file.

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
