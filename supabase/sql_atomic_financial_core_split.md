### Block 1 — post_receipt_atomic function

```sql
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
  v_invoice_id uuid;
begin
  v_receipt := coalesce(payload->'receipt', '{}'::jsonb);
  v_allocations := coalesce(payload->'allocations', '[]'::jsonb);
  v_journal_entries := coalesce(payload->'journal_entries', '[]'::jsonb);
  v_request_id := nullif(coalesce(payload->>'request_id', v_receipt->>'request_id'), '');

  if v_request_id is null then
    raise exception 'معرّف الطلب مطلوب لضمان عدم التكرار.';
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

  for v_invoice_id in
    select (value->>'invoice_id')::uuid
    from jsonb_array_elements(v_allocations)
  loop
    if not exists (select 1 from public.invoices where id = v_invoice_id) then
      raise exception 'فاتورة غير موجودة: %', v_invoice_id;
    end if;
  end loop;

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
```

### Block 2 — grant for post_receipt_atomic

```sql
grant execute on function public.post_receipt_atomic(jsonb) to authenticated;
```

### Block 3 — renew_contract_atomic function

```sql
create or replace function public.renew_contract_atomic(
  old_contract_id uuid,
  new_contract_data jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_unit_id uuid;
  v_active_count integer;
begin
  select unit_id
    into v_unit_id
  from public.contracts
  where id = old_contract_id
    and status = 'ACTIVE'
    and deleted_at is null;

  if not found then
    raise exception 'Original contract is not ACTIVE';
  end if;

  select count(*)
    into v_active_count
  from public.contracts
  where unit_id = v_unit_id
    and status = 'ACTIVE'
    and deleted_at is null
    and id <> old_contract_id;

  if v_active_count > 0 then
    raise exception 'Unit already has another ACTIVE contract';
  end if;

  update public.contracts
  set
    status = 'ENDED',
    ended_at = now(),
    updated_at = (extract(epoch from now()) * 1000)::bigint
  where id = old_contract_id;

  insert into public.contracts (
    id,
    no,
    unit_id,
    tenant_id,
    rent_amount,
    due_day,
    start_date,
    end_date,
    deposit,
    status,
    sponsor_name,
    sponsor_id,
    sponsor_phone,
    is_demo,
    created_at,
    updated_at,
    deleted_at
  )
  select
    coalesce(r.id, gen_random_uuid()),
    r.no,
    r.unit_id,
    r.tenant_id,
    r.rent_amount,
    r.due_day,
    r.start_date,
    r.end_date,
    coalesce(r.deposit, 0),
    'ACTIVE',
    r.sponsor_name,
    r.sponsor_id,
    r.sponsor_phone,
    coalesce(r.is_demo, false),
    coalesce(r.created_at, (extract(epoch from now()) * 1000)::bigint),
    r.updated_at,
    null
  from jsonb_populate_record(null::public.contracts, new_contract_data) as r
  returning id into v_new_id;

  return jsonb_build_object(
    'success', true,
    'old_contract_id', old_contract_id,
    'new_contract_id', v_new_id
  );
end;
$$;
```

### Block 4 — grant for renew_contract_atomic

```sql
grant execute on function public.renew_contract_atomic(uuid, jsonb) to authenticated;
```

### Block 5 — alter contracts table

```sql
alter table if exists public.contracts
  add column if not exists deleted_at timestamptz;
```

### Block 6 — guard_contract_delete function

```sql
create or replace function public.guard_contract_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_count integer;
begin
  select count(*) into v_invoice_count
  from public.invoices
  where contract_id = old.id;

  if v_invoice_count > 0 then
    raise exception 'لا يمكن حذف العقد لوجود فواتير مرتبطة به. استخدم الحذف الناعم.';
  end if;

  return old;
end;
$$;
```

### Block 7 — trigger creation

```sql
drop trigger if exists before_contract_hard_delete on public.contracts;
create trigger before_contract_hard_delete
before delete on public.contracts
for each row
execute function public.guard_contract_delete();
```
