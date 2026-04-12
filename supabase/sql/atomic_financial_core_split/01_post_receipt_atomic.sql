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
