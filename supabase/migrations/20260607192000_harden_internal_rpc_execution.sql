-- Restrict internal helper routines from direct browser RPC execution and
-- stabilize the existing browser-facing void receipt RPC search_path.
--
-- Browser-facing facades intentionally remain callable by authenticated:
--   public.record_invoice_payment_atomic(jsonb)
--   public.renew_contract_atomic(uuid, jsonb)
--   public.void_receipt_atomic(uuid)

begin;

do $$
declare
  routine_signature text;
  internal_routines text[] := array[
    'public.assign_contract_number_from_serials()',
    'public.find_payment_account_id(text)',
    'public.increment_serial(text)',
    'public.sync_payment_reference_columns()'
  ];
begin
  foreach routine_signature in array internal_routines loop
    if to_regprocedure(routine_signature) is not null then
      execute format(
        'revoke all on function %s from public, anon, authenticated',
        routine_signature
      );
    end if;
  end loop;
end $$;

do $$
begin
  if to_regprocedure('public.void_receipt_atomic(uuid)') is not null then
    execute 'alter function public.void_receipt_atomic(uuid) set search_path = public, pg_temp';
    execute 'revoke all on function public.void_receipt_atomic(uuid) from public, anon';
    execute 'grant execute on function public.void_receipt_atomic(uuid) to authenticated';
  end if;
end $$;

commit;
