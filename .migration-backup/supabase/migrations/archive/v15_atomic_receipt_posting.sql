create or replace function post_receipt_atomic(
  p_receipt jsonb,
  p_allocations jsonb,
  p_journal_entries jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_receipt_id uuid;
begin
  insert into receipts (
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
    created_at
  )
  values (
    (p_receipt->>'id')::uuid,
    p_receipt->>'no',
    (p_receipt->>'contract_id')::uuid,
    p_receipt->>'date_time',
    p_receipt->>'channel',
    (p_receipt->>'amount')::numeric,
    coalesce(p_receipt->>'ref', ''),
    coalesce(p_receipt->>'notes', ''),
    p_receipt->>'status',
    nullif(p_receipt->>'check_number', ''),
    nullif(p_receipt->>'check_bank', ''),
    nullif(p_receipt->>'check_date', ''),
    nullif(p_receipt->>'check_status', ''),
    (p_receipt->>'created_at')::bigint
  )
  returning id into v_receipt_id;

  insert into receipt_allocations (id, receipt_id, invoice_id, amount, created_at)
  select
    (a->>'id')::uuid,
    v_receipt_id,
    (a->>'invoice_id')::uuid,
    (a->>'amount')::numeric,
    (a->>'created_at')::bigint
  from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) as a;

  with alloc_totals as (
    select
      (a->>'invoice_id')::uuid as invoice_id,
      sum((a->>'amount')::numeric) as total_allocated
    from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) as a
    group by 1
  )
  update invoices i
  set
    paid_amount = coalesce(i.paid_amount, 0) + alloc_totals.total_allocated,
    status = case
      when (coalesce(i.paid_amount, 0) + alloc_totals.total_allocated) >= (coalesce(i.amount, 0) + coalesce(i.tax_amount, 0)) - 0.001 then 'PAID'
      when (coalesce(i.paid_amount, 0) + alloc_totals.total_allocated) > 0 then 'PARTIALLY_PAID'
      else i.status
    end
  from alloc_totals
  where i.id = alloc_totals.invoice_id;

  insert into journal_entries (
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
  from jsonb_array_elements(coalesce(p_journal_entries, '[]'::jsonb)) as j;

  return jsonb_build_object('success', true, 'receipt_id', v_receipt_id);
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', sqlerrm,
      'detail', sqlstate
    );
end;
$$;

grant execute on function post_receipt_atomic(jsonb, jsonb, jsonb) to authenticated;
