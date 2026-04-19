-- Enterprise evolution: hash chain, event sourcing, multi-tenant isolation, and scaling projections.

alter table public.journal_entries
  add column if not exists tenant_id uuid,
  add column if not exists batch_id text,
  add column if not exists entry_hash text;

alter table public.receipts add column if not exists tenant_id uuid;
alter table public.invoices add column if not exists tenant_id uuid;
alter table public.receipt_allocations add column if not exists tenant_id uuid;
alter table public.contracts add column if not exists tenant_id uuid;

update public.contracts
set tenant_id = coalesce(tenant_id, organization_id)
where tenant_id is null;

update public.receipts r
set tenant_id = c.tenant_id
from public.contracts c
where r.contract_id = c.id
  and r.tenant_id is null;

update public.invoices i
set tenant_id = c.tenant_id
from public.contracts c
where i.contract_id = c.id
  and i.tenant_id is null;

update public.receipt_allocations ra
set tenant_id = r.tenant_id
from public.receipts r
where ra.receipt_id = r.id
  and ra.tenant_id is null;

update public.journal_entries je
set tenant_id = r.tenant_id
from public.receipts r
where je.source_id = r.id::text
  and je.tenant_id is null;

create index if not exists idx_journal_entries_tenant_date_account on public.journal_entries(tenant_id, date, account_id);
create index if not exists idx_journal_entries_batch on public.journal_entries(batch_id);
create index if not exists idx_receipts_tenant_date on public.receipts(tenant_id, date_time);
create index if not exists idx_invoices_tenant_due_date on public.invoices(tenant_id, due_date);

create table if not exists public.ledger_hash_chain (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  batch_id text not null,
  batch_hash text not null,
  previous_batch_hash text,
  entry_count integer not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, batch_id)
);

create index if not exists idx_ledger_hash_chain_tenant_created on public.ledger_hash_chain(tenant_id, created_at);

create table if not exists public.financial_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  event_type text not null,
  event_version integer not null default 1,
  request_id text,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_financial_events_tenant_created on public.financial_events(tenant_id, created_at);
create index if not exists idx_financial_events_type on public.financial_events(event_type, created_at);

create or replace function public.block_financial_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'financial_events are append-only.';
end;
$$;

drop trigger if exists trg_block_financial_events_update on public.financial_events;
create trigger trg_block_financial_events_update
before update on public.financial_events
for each row execute function public.block_financial_event_mutation();

drop trigger if exists trg_block_financial_events_delete on public.financial_events;
create trigger trg_block_financial_events_delete
before delete on public.financial_events
for each row execute function public.block_financial_event_mutation();

create or replace function public.append_financial_event(
  p_event_type text,
  p_tenant_id uuid,
  p_request_id text,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.financial_events (
    tenant_id, event_type, request_id, entity_type, entity_id, payload, metadata
  ) values (
    p_tenant_id, p_event_type, p_request_id, p_entity_type, p_entity_id, coalesce(p_payload, '{}'::jsonb), coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.calculate_journal_batch_hash(
  p_batch_id text,
  p_tenant_id uuid default null
)
returns text
language sql
security definer
set search_path = public
as $$
  with batch_payload as (
    select string_agg(
      concat_ws('|', je.id::text, coalesce(je.no,''), coalesce(je.date::text,''), coalesce(je.account_id::text,''),
                coalesce(je.type,''), coalesce(je.amount::text,''), coalesce(je.source_id,''), coalesce(je.entity_type,''), coalesce(je.entity_id,''), coalesce(je.request_id,'')),
      '||' order by je.id
    ) as payload
    from public.journal_entries je
    where je.batch_id = p_batch_id
      and (p_tenant_id is null or je.tenant_id = p_tenant_id)
  )
  select encode(digest(coalesce(payload, ''), 'sha256'), 'hex')
  from batch_payload;
$$;

create or replace function public.seal_ledger_batch(
  p_batch_id text,
  p_tenant_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
  v_prev_hash text;
  v_hash text;
  v_count integer;
begin
  if p_batch_id is null or btrim(p_batch_id) = '' then
    raise exception 'batch_id is required';
  end if;

  select * into v_existing
  from public.ledger_hash_chain
  where batch_id = p_batch_id
    and tenant_id is not distinct from p_tenant_id;

  if v_existing.id is not null then
    return jsonb_build_object('sealed', true, 'already_sealed', true, 'batch_hash', v_existing.batch_hash);
  end if;

  select count(*) into v_count
  from public.journal_entries
  where batch_id = p_batch_id
    and (p_tenant_id is null or tenant_id = p_tenant_id);

  if v_count = 0 then
    raise exception 'no journal entries found for batch_id %', p_batch_id;
  end if;

  select batch_hash into v_prev_hash
  from public.ledger_hash_chain
  where tenant_id is not distinct from p_tenant_id
  order by created_at desc
  limit 1
  for update;

  v_hash := encode(digest(coalesce(v_prev_hash, '') || '::' || public.calculate_journal_batch_hash(p_batch_id, p_tenant_id), 'sha256'), 'hex');

  insert into public.ledger_hash_chain (tenant_id, batch_id, batch_hash, previous_batch_hash, entry_count)
  values (p_tenant_id, p_batch_id, v_hash, v_prev_hash, v_count);

  update public.journal_entries
  set entry_hash = v_hash
  where batch_id = p_batch_id
    and (p_tenant_id is null or tenant_id = p_tenant_id);

  return jsonb_build_object('sealed', true, 'batch_hash', v_hash, 'previous_batch_hash', v_prev_hash, 'entry_count', v_count);
end;
$$;

create or replace function public.verify_ledger_integrity(
  p_tenant_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_prev text := null;
  v_expected text;
  v_batch_hash text;
  v_broken integer := 0;
begin
  for r in
    select *
    from public.ledger_hash_chain
    where (p_tenant_id is null or tenant_id = p_tenant_id)
    order by created_at asc
  loop
    v_batch_hash := public.calculate_journal_batch_hash(r.batch_id, r.tenant_id);
    v_expected := encode(digest(coalesce(v_prev, '') || '::' || v_batch_hash, 'sha256'), 'hex');

    if r.previous_batch_hash is distinct from v_prev or r.batch_hash <> v_expected then
      v_broken := v_broken + 1;
    end if;

    v_prev := r.batch_hash;
  end loop;

  return jsonb_build_object(
    'tenant_id', p_tenant_id,
    'is_valid', v_broken = 0,
    'broken_links', v_broken
  );
end;
$$;

alter table public.journal_entries enable row level security;
alter table public.receipts enable row level security;
alter table public.invoices enable row level security;
alter table public.financial_events enable row level security;

drop policy if exists tenant_isolation_journal_entries on public.journal_entries;
create policy tenant_isolation_journal_entries on public.journal_entries
for all
using (
  current_setting('request.jwt.claim.tenant_id', true) is null
  or current_setting('request.jwt.claim.tenant_id', true) = ''
  or tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
)
with check (
  current_setting('request.jwt.claim.tenant_id', true) is null
  or current_setting('request.jwt.claim.tenant_id', true) = ''
  or tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
);

drop policy if exists tenant_isolation_receipts on public.receipts;
create policy tenant_isolation_receipts on public.receipts
for all
using (
  current_setting('request.jwt.claim.tenant_id', true) is null
  or current_setting('request.jwt.claim.tenant_id', true) = ''
  or tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
)
with check (
  current_setting('request.jwt.claim.tenant_id', true) is null
  or current_setting('request.jwt.claim.tenant_id', true) = ''
  or tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
);

drop policy if exists tenant_isolation_invoices on public.invoices;
create policy tenant_isolation_invoices on public.invoices
for all
using (
  current_setting('request.jwt.claim.tenant_id', true) is null
  or current_setting('request.jwt.claim.tenant_id', true) = ''
  or tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
)
with check (
  current_setting('request.jwt.claim.tenant_id', true) is null
  or current_setting('request.jwt.claim.tenant_id', true) = ''
  or tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
);

drop policy if exists tenant_isolation_financial_events on public.financial_events;
create policy tenant_isolation_financial_events on public.financial_events
for all
using (
  current_setting('request.jwt.claim.tenant_id', true) is null
  or current_setting('request.jwt.claim.tenant_id', true) = ''
  or tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
)
with check (
  current_setting('request.jwt.claim.tenant_id', true) is null
  or current_setting('request.jwt.claim.tenant_id', true) = ''
  or tenant_id::text = current_setting('request.jwt.claim.tenant_id', true)
);

create materialized view if not exists public.mv_financial_daily_tenant_account as
select
  tenant_id,
  date,
  account_id,
  sum(case when type = 'DEBIT' then amount else 0 end) as debit_total,
  sum(case when type = 'CREDIT' then amount else 0 end) as credit_total,
  count(*) as entry_count
from public.journal_entries
group by tenant_id, date, account_id;

create unique index if not exists idx_mv_financial_daily_tenant_account_key
on public.mv_financial_daily_tenant_account(tenant_id, date, account_id);

create or replace function public.refresh_mv_financial_daily_tenant_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.mv_financial_daily_tenant_account;
end;
$$;

create or replace function public.rebuild_financial_state(
  p_tenant_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger jsonb;
  v_events_count bigint;
begin
  select public.verify_ledger_integrity(p_tenant_id) into v_ledger;

  select count(*) into v_events_count
  from public.financial_events
  where p_tenant_id is null or tenant_id = p_tenant_id;

  perform public.refresh_mv_financial_daily_tenant_account();

  return jsonb_build_object(
    'tenant_id', p_tenant_id,
    'ledger_integrity', v_ledger,
    'events_replayed_count', v_events_count,
    'projection_refreshed', true
  );
end;
$$;

-- Refresh atomic function definitions with tenant/event/hash integration.
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
  v_existing_result jsonb;
  v_receipt_contract_id uuid;
  v_receipt_amount numeric;
  v_total_allocations numeric := 0;
  v_receipt_date date;
  v_tenant_id uuid;
  v_batch_id text;
  v_invoice_id uuid;
  v_invoice_contract_id uuid;
  v_invoice_total numeric;
  v_invoice_paid numeric;
  v_allocation_amount numeric;
  v_duplicate_count integer;
  v_journal_debits numeric := 0;
  v_journal_credits numeric := 0;
begin
  v_receipt := coalesce(payload->'receipt', '{}'::jsonb);
  v_allocations := coalesce(payload->'allocations', '[]'::jsonb);
  v_journal_entries := coalesce(payload->'journal_entries', '[]'::jsonb);
  v_request_id := nullif(coalesce(payload->>'request_id', v_receipt->>'request_id'), '');
  v_receipt_contract_id := (v_receipt->>'contract_id')::uuid;
  v_receipt_amount := coalesce((v_receipt->>'amount')::numeric, 0);
  v_receipt_date := (v_receipt->>'date_time')::date;

  if v_request_id is null then
    raise exception 'معرّف الطلب مطلوب لضمان عدم التكرار.';
  end if;
  select response_payload
    into v_existing_result
  from public.financial_operation_idempotency
  where operation_name = 'post_receipt_atomic'
    and request_id = v_request_id
  for update;

  if v_existing_result is not null then
    return v_existing_result;
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
  select c.organization_id into v_tenant_id
  from public.contracts c
  where c.id = v_receipt_contract_id;
  v_batch_id := coalesce(v_request_id, v_receipt->>'id');
  if exists (
    select 1
    from public.accounting_periods p
    where p.status = 'CLOSED'
      and p.start_date <= v_receipt_date
      and p.end_date >= v_receipt_date
  ) then
    raise exception 'الفترة المحاسبية مغلقة ولا تسمح بترحيل قيود جديدة.';
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
    where i.id = v_invoice_id
    for update;
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

  select
    coalesce(sum(case when (j->>'type') = 'DEBIT' then (j->>'amount')::numeric else 0 end), 0),
    coalesce(sum(case when (j->>'type') = 'CREDIT' then (j->>'amount')::numeric else 0 end), 0)
  into v_journal_debits, v_journal_credits
  from jsonb_array_elements(v_journal_entries) as j;

  if abs(v_journal_debits - v_journal_credits) > 0.001 then
    raise exception 'القيود المحاسبية غير متوازنة.';
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
    request_id,
    tenant_id
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
    v_request_id,
    v_tenant_id
  )
  returning id into v_receipt_id;

  insert into public.receipt_allocations (id, receipt_id, invoice_id, amount, created_at, tenant_id)
  select
    (a->>'id')::uuid,
    v_receipt_id,
    (a->>'invoice_id')::uuid,
    (a->>'amount')::numeric,
    (a->>'created_at')::bigint,
    v_tenant_id
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
    created_at,
    tenant_id,
    batch_id,
    request_id,
    source_module
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
    (j->>'created_at')::bigint,
    v_tenant_id,
    v_batch_id,
    v_request_id,
    'RECEIPTS'
  from jsonb_array_elements(v_journal_entries) as j;

  perform public.seal_ledger_batch(v_batch_id, v_tenant_id);

  v_existing_result := jsonb_build_object(
    'success', true,
    'idempotent', false,
    'request_id', v_request_id,
    'receipt_id', v_receipt_id
  );

  insert into public.financial_operation_idempotency (operation_name, request_id, response_payload)
  values ('post_receipt_atomic', v_request_id, v_existing_result)
  on conflict (operation_name, request_id) do nothing;

  insert into public.financial_audit_log (
    action,
    actor_id,
    source_module,
    request_id,
    entity_type,
    entity_id,
    before_state,
    after_state,
    metadata
  ) values (
    'POST_RECEIPT',
    null,
    'RECEIPTS',
    v_request_id,
    'RECEIPT',
    v_receipt_id,
    null,
    jsonb_build_object('receipt_id', v_receipt_id, 'contract_id', v_receipt_contract_id),
    jsonb_build_object('allocations_count', jsonb_array_length(v_allocations), 'tenant_id', v_tenant_id, 'batch_id', v_batch_id)
  );

  perform public.append_financial_event(
    'RECEIPT_POSTED',
    v_tenant_id,
    v_request_id,
    'RECEIPT',
    v_receipt_id,
    jsonb_build_object('batch_id', v_batch_id, 'contract_id', v_receipt_contract_id, 'amount', v_receipt_amount)
  );

  return v_existing_result;
end;
$$;


-- Refresh contract renewal atomic function with idempotency + events.
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
  v_request_id text;
  v_existing jsonb;
  v_tenant_id uuid;
begin
  v_request_id := nullif(new_contract_data->>'request_id', '');

  if v_request_id is not null then
    select response_payload
      into v_existing
    from public.financial_operation_idempotency
    where operation_name = 'renew_contract_atomic'
      and request_id = v_request_id
    for update;

    if v_existing is not null then
      return v_existing;
    end if;
  end if;

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

  select organization_id into v_tenant_id
  from public.contracts
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

  v_existing := jsonb_build_object(
    'success', true,
    'old_contract_id', old_contract_id,
    'new_contract_id', v_new_id
  );

  if v_request_id is not null then
    insert into public.financial_operation_idempotency (operation_name, request_id, response_payload)
    values ('renew_contract_atomic', v_request_id, v_existing)
    on conflict (operation_name, request_id) do nothing;
  end if;

  insert into public.financial_audit_log (
    action,
    actor_id,
    source_module,
    request_id,
    entity_type,
    entity_id,
    before_state,
    after_state,
    metadata
  ) values (
    'RENEW_CONTRACT',
    null,
    'CONTRACTS',
    v_request_id,
    'CONTRACT',
    v_new_id,
    jsonb_build_object('old_contract_id', old_contract_id),
    jsonb_build_object('new_contract_id', v_new_id),
    jsonb_build_object('function', 'renew_contract_atomic')
  );

  perform public.append_financial_event(
    'CONTRACT_RENEWED',
    v_tenant_id,
    v_request_id,
    'CONTRACT',
    v_new_id,
    jsonb_build_object('old_contract_id', old_contract_id, 'new_contract_id', v_new_id)
  );

  return v_existing;
end;
$$;
