-- Harden remaining Supabase function advisors discovered on the PR #536
-- preview branch after the first RPC hardening pass.
--
-- This migration intentionally excludes public.custom_access_token_hook(jsonb).
-- That function is an Auth custom access token hook. Its execution should be
-- limited to supabase_auth_admin, but changing it must be verified against the
-- Auth hook configuration to avoid breaking login/custom claims.

begin;

-- Fix mutable search_path warning for common trigger helper.
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'alter function public.set_updated_at() set search_path = public, pg_temp';
  end if;
end $$;

-- Legacy/app-facing RPC overloads remain callable by authenticated users,
-- but should not run with definer privileges.
do $$
declare
  fn text;
  invoker_functions text[] := array[
    'public.generate_invoices_from_active_contracts()',
    'public.post_receipt_atomic(uuid,numeric,public.payment_method,date,text)',
    'public.renew_contract_atomic(uuid,date,date,numeric)',
    'public.rpt_financial_summary(integer,integer)',
    'public.prevent_active_contract_overlap()',
    'public.prevent_payment_mutation()',
    'public.validate_property_owner_active_totals()'
  ];
begin
  foreach fn in array invoker_functions loop
    if to_regprocedure(fn) is not null then
      execute format('alter function %s security invoker', fn);
    end if;
  end loop;
end $$;

commit;
