-- Anti-Mistake Engine RPCs

create or replace function public.sync_unit_status(p_unit_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  next_status text;
begin
  if exists (select 1 from contracts where unit_id = p_unit_id and status = 'ACTIVE') then
    next_status := 'RENTED';
  elsif exists (select 1 from maintenance_records where unit_id = p_unit_id and status in ('NEW','IN_PROGRESS')) then
    next_status := 'MAINTENANCE';
  else
    next_status := 'AVAILABLE';
  end if;

  update units set status = next_status where id = p_unit_id;
  return next_status;
end;
$$;

create or replace function public.post_receipt_atomic(
  p_receipt jsonb,
  p_allocations jsonb,
  p_invoice_updates jsonb,
  p_journal_entries jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  r jsonb;
begin
  insert into receipts (id, no, contract_id, date_time, channel, amount, ref, notes, status, created_at, check_number, check_bank, check_date, check_status)
  values (
    (p_receipt->>'id')::uuid,
    p_receipt->>'no',
    (p_receipt->>'contract_id')::uuid,
    p_receipt->>'date_time',
    p_receipt->>'channel',
    (p_receipt->>'amount')::numeric,
    p_receipt->>'ref',
    p_receipt->>'notes',
    p_receipt->>'status',
    (p_receipt->>'created_at')::bigint,
    nullif(p_receipt->>'check_number',''),
    nullif(p_receipt->>'check_bank',''),
    nullif(p_receipt->>'check_date',''),
    nullif(p_receipt->>'check_status','')
  );

  insert into receipt_allocations (id, receipt_id, invoice_id, amount, created_at)
  select
    (x->>'id')::uuid,
    (x->>'receipt_id')::uuid,
    (x->>'invoice_id')::uuid,
    (x->>'amount')::numeric,
    (x->>'created_at')::bigint
  from jsonb_array_elements(p_allocations) x;

  for r in select * from jsonb_array_elements(p_invoice_updates)
  loop
    update invoices
    set paid_amount = (r->>'paid_amount')::numeric,
        status = r->>'status',
        updated_at = (extract(epoch from now()) * 1000)::bigint
    where id = (r->>'id')::uuid;
  end loop;

  insert into journal_entries (id, no, date, account_id, amount, type, source_id, entity_type, entity_id, created_at)
  select
    (x->>'id')::uuid,
    x->>'no',
    x->>'date',
    x->>'account_id',
    (x->>'amount')::numeric,
    x->>'type',
    x->>'source_id',
    nullif(x->>'entity_type',''),
    nullif(x->>'entity_id','')::uuid,
    (x->>'created_at')::bigint
  from jsonb_array_elements(p_journal_entries) x;

  return jsonb_build_object('ok', true, 'allocations', jsonb_array_length(p_allocations), 'journals', jsonb_array_length(p_journal_entries));
end;
$$;

create or replace function public.void_receipt_atomic(
  p_receipt_id uuid,
  p_voided_at bigint,
  p_invoice_updates jsonb,
  p_reverse_entries jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  r jsonb;
begin
  update receipts set status = 'VOID', voided_at = p_voided_at where id = p_receipt_id;

  for r in select * from jsonb_array_elements(p_invoice_updates)
  loop
    update invoices
    set paid_amount = greatest(0, (r->>'paid_amount')::numeric),
        status = r->>'status',
        updated_at = (extract(epoch from now()) * 1000)::bigint
    where id = (r->>'id')::uuid;
  end loop;

  delete from receipt_allocations where receipt_id = p_receipt_id;

  insert into journal_entries (id, no, date, account_id, amount, type, source_id, entity_type, entity_id, created_at)
  select
    (x->>'id')::uuid,
    x->>'no',
    x->>'date',
    x->>'account_id',
    (x->>'amount')::numeric,
    x->>'type',
    x->>'source_id',
    nullif(x->>'entity_type',''),
    nullif(x->>'entity_id','')::uuid,
    (x->>'created_at')::bigint
  from jsonb_array_elements(p_reverse_entries) x;

  return jsonb_build_object('ok', true, 'reversals', jsonb_array_length(p_reverse_entries));
end;
$$;

create or replace function public.renew_contract_atomic(
  p_old_contract_id uuid,
  p_new_contract jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_unit_id uuid;
  v_tenant_id uuid;
  v_new_id uuid;
begin
  select unit_id, tenant_id into v_unit_id, v_tenant_id from contracts where id = p_old_contract_id and status = 'ACTIVE';
  if v_unit_id is null then
    raise exception 'old contract is not active or not found';
  end if;

  if exists (select 1 from maintenance_records where unit_id = v_unit_id and status in ('NEW','IN_PROGRESS')) then
    raise exception 'unit has blocking maintenance';
  end if;

  update contracts set status = 'ENDED', updated_at = (extract(epoch from now()) * 1000)::bigint where id = p_old_contract_id;

  if exists (select 1 from contracts where status = 'ACTIVE' and id <> p_old_contract_id and (unit_id = v_unit_id or tenant_id = v_tenant_id)) then
    raise exception 'overlapping active contract detected';
  end if;

  v_new_id := (p_new_contract->>'id')::uuid;
  insert into contracts (id, no, unit_id, tenant_id, rent_amount, due_day, start_date, end_date, deposit, status, sponsor_name, sponsor_id, sponsor_phone, created_at)
  values (
    v_new_id,
    p_new_contract->>'no',
    (p_new_contract->>'unit_id')::uuid,
    (p_new_contract->>'tenant_id')::uuid,
    (p_new_contract->>'rent_amount')::numeric,
    (p_new_contract->>'due_day')::int,
    p_new_contract->>'start_date',
    p_new_contract->>'end_date',
    (p_new_contract->>'deposit')::numeric,
    'ACTIVE',
    p_new_contract->>'sponsor_name',
    p_new_contract->>'sponsor_id',
    p_new_contract->>'sponsor_phone',
    (p_new_contract->>'created_at')::bigint
  );

  perform sync_unit_status(v_unit_id);

  return jsonb_build_object('ok', true, 'new_contract_id', v_new_id);
end;
$$;
