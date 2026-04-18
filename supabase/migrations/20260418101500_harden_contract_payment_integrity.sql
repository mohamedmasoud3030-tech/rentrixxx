-- Harden integrity checks for contracts and atomic receipt posting.
-- Safe migration: additive constraints are NOT VALID to avoid breaking legacy rows.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_owner_fk') then
    alter table public.properties
      add constraint properties_owner_fk
      foreign key (owner_id) references public.owners(id)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'units_property_fk') then
    alter table public.units
      add constraint units_property_fk
      foreign key (property_id) references public.properties(id)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contracts_unit_fk') then
    alter table public.contracts
      add constraint contracts_unit_fk
      foreign key (unit_id) references public.units(id)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contracts_tenant_fk') then
    alter table public.contracts
      add constraint contracts_tenant_fk
      foreign key (tenant_id) references public.tenants(id)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_contract_fk') then
    alter table public.invoices
      add constraint invoices_contract_fk
      foreign key (contract_id) references public.contracts(id)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'receipts_contract_fk') then
    alter table public.receipts
      add constraint receipts_contract_fk
      foreign key (contract_id) references public.contracts(id)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'receipt_allocations_receipt_fk') then
    alter table public.receipt_allocations
      add constraint receipt_allocations_receipt_fk
      foreign key (receipt_id) references public.receipts(id)
      not valid;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'receipt_allocations_invoice_fk') then
    alter table public.receipt_allocations
      add constraint receipt_allocations_invoice_fk
      foreign key (invoice_id) references public.invoices(id)
      not valid;
  end if;
end $$;

create or replace function public.post_receipt_atomic(
  payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt jsonb;
  v_allocations jsonb;
  v_journal_entries jsonb;
  v_request_id text;
  v_receipt_id uuid;
  v_existing_receipt_id uuid;
  v_receipt_contract_id uuid;
  v_receipt_amount numeric;
  v_total_allocations numeric := 0;
  v_invoice_id uuid;
  v_invoice_contract_id uuid;
  v_invoice_total numeric;
  v_invoice_paid numeric;
  v_allocation_amount numeric;
  v_duplicate_count integer;
begin
  v_receipt := coalesce(payload->'receipt', '{}'::jsonb);
  v_allocations := coalesce(payload->'allocations', '[]'::jsonb);
  v_journal_entries := coalesce(payload->'journal_entries', '[]'::jsonb);
  v_request_id := nullif(coalesce(payload->>'request_id', v_receipt->>'request_id'), '');
  v_receipt_contract_id := (v_receipt->>'contract_id')::uuid;
  v_receipt_amount := coalesce((v_receipt->>'amount')::numeric, 0);

  if v_request_id is null then
    raise exception 'معرّف الطلب مطلوب لضمان عدم التكرار.';
  end if;
  if v_receipt_contract_id is null then
    raise exception 'العقد المرتبط بسند القبض مطلوب.';
  end if;
  if v_receipt_amount <= 0 then
    raise exception 'مبلغ سند القبض يجب أن يكون أكبر من صفر.';
  end if;
  if not exists (
    select 1
    from public.contracts c
    where c.id = v_receipt_contract_id
      and c.deleted_at is null
  ) then
    raise exception 'العقد غير موجود أو محذوف.';
  end if;

  select r.id
    into v_existing_receipt_id
  from public.receipts r
  where r.request_id = v_request_id
  limit 1;

  if v_existing_receipt_id is not null then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'request_id', v_request_id,
      'receipt_id', v_existing_receipt_id
    );
  end if;

  select count(*)
    into v_duplicate_count
  from (
    select (value->>'invoice_id')::uuid as invoice_id
    from jsonb_array_elements(v_allocations)
    group by 1
    having count(*) > 1
  ) duplicates;
  if coalesce(v_duplicate_count, 0) > 0 then
    raise exception 'لا يمكن تكرار نفس الفاتورة داخل نفس سند القبض.';
  end if;

  for v_invoice_id, v_allocation_amount in
    select (value->>'invoice_id')::uuid, coalesce((value->>'amount')::numeric, 0)
    from jsonb_array_elements(v_allocations)
  loop
    if v_allocation_amount <= 0 then
      raise exception 'مبلغ التخصيص يجب أن يكون أكبر من صفر.';
    end if;
    select i.contract_id, (coalesce(i.amount, 0) + coalesce(i.tax_amount, 0)), coalesce(i.paid_amount, 0)
      into v_invoice_contract_id, v_invoice_total, v_invoice_paid
    from public.invoices i
    where i.id = v_invoice_id;
    if v_invoice_contract_id is null then
      raise exception 'فاتورة غير موجودة: %', v_invoice_id;
    end if;
    if v_invoice_contract_id <> v_receipt_contract_id then
      raise exception 'الفاتورة % لا تتبع نفس العقد.', v_invoice_id;
    end if;
    if (v_invoice_paid + v_allocation_amount) > (v_invoice_total + 0.001) then
      raise exception 'قيمة التخصيص تتجاوز رصيد الفاتورة %.', v_invoice_id;
    end if;
    v_total_allocations := v_total_allocations + v_allocation_amount;
  end loop;

  if abs(v_total_allocations - v_receipt_amount) > 0.001 then
    raise exception 'مجموع التخصيصات يجب أن يساوي مبلغ السند.';
  end if;

  insert into public.receipts (
    id,
    no,
    contract_id,
    date_time,
    channel,
    amount,
    ref,
    notes,
    status,
    check_number,
    check_bank,
    check_date,
    check_status,
    created_at,
    request_id
  )
  values (
    (v_receipt->>'id')::uuid,
    v_receipt->>'no',
    (v_receipt->>'contract_id')::uuid,
    v_receipt->>'date_time',
    v_receipt->>'channel',
    (v_receipt->>'amount')::numeric,
    coalesce(v_receipt->>'ref', ''),
    coalesce(v_receipt->>'notes', ''),
    v_receipt->>'status',
    nullif(v_receipt->>'check_number', ''),
    nullif(v_receipt->>'check_bank', ''),
    nullif(v_receipt->>'check_date', ''),
    nullif(v_receipt->>'check_status', ''),
    (v_receipt->>'created_at')::bigint,
    v_request_id
  )
  returning id into v_receipt_id;

  insert into public.receipt_allocations (id, receipt_id, invoice_id, amount, created_at)
  select
    (a->>'id')::uuid,
    v_receipt_id,
    (a->>'invoice_id')::uuid,
    (a->>'amount')::numeric,
    (a->>'created_at')::bigint
  from jsonb_array_elements(v_allocations) as a;

  with alloc_totals as (
    select
      (a->>'invoice_id')::uuid as invoice_id,
      sum((a->>'amount')::numeric) as total_allocated
    from jsonb_array_elements(v_allocations) as a
    group by 1
  )
  update public.invoices i
  set
    paid_amount = coalesce(i.paid_amount, 0) + alloc_totals.total_allocated,
    status = case
      when (coalesce(i.paid_amount, 0) + alloc_totals.total_allocated) >= (coalesce(i.amount, 0) + coalesce(i.tax_amount, 0)) - 0.001 then 'PAID'
      when (coalesce(i.paid_amount, 0) + alloc_totals.total_allocated) > 0 then 'PARTIALLY_PAID'
      else i.status
    end
  from alloc_totals
  where i.id = alloc_totals.invoice_id;

  insert into public.journal_entries (
    id,
    no,
    date,
    account_id,
    amount,
    type,
    source_id,
    entity_type,
    entity_id,
    created_at
  )
  select
    (j->>'id')::uuid,
    j->>'no',
    j->>'date',
    j->>'account_id',
    (j->>'amount')::numeric,
    j->>'type',
    j->>'source_id',
    nullif(j->>'entity_type', ''),
    nullif(j->>'entity_id', ''),
    (j->>'created_at')::bigint
  from jsonb_array_elements(v_journal_entries) as j;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'request_id', v_request_id,
    'receipt_id', v_receipt_id
  );
end;
$$;
