-- Production hardening: immutable ledger, full audit trail, idempotency registry,
-- reconciliation engine, and frozen-period report snapshots.

alter table public.journal_entries
  add column if not exists linked_original_entry_id uuid,
  add column if not exists is_reversal boolean not null default false,
  add column if not exists source_module text,
  add column if not exists request_id text,
  add column if not exists actor_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'journal_entries_linked_original_entry_fk') then
    alter table public.journal_entries
      add constraint journal_entries_linked_original_entry_fk
      foreign key (linked_original_entry_id) references public.journal_entries(id);
  end if;
end $$;

create table if not exists public.financial_operation_idempotency (
  id uuid primary key default gen_random_uuid(),
  operation_name text not null,
  request_id text not null,
  response_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (operation_name, request_id)
);

create table if not exists public.financial_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid,
  source_module text not null,
  request_id text,
  entity_type text not null,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_financial_audit_log_created_at on public.financial_audit_log(created_at desc);
create index if not exists idx_financial_audit_log_entity on public.financial_audit_log(entity_type, entity_id);

create table if not exists public.reconciliation_reports (
  id uuid primary key default gen_random_uuid(),
  as_of date not null,
  status text not null,
  payload jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.accounting_periods(id),
  report_type text not null,
  snapshot_payload jsonb not null,
  frozen_at timestamptz not null default now(),
  created_by uuid,
  unique (period_id, report_type)
);

create or replace function public.block_journal_entry_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'journal_entries are immutable. Post reversal entries instead.';
end;
$$;

drop trigger if exists trg_block_journal_entry_update on public.journal_entries;
create trigger trg_block_journal_entry_update
before update on public.journal_entries
for each row execute function public.block_journal_entry_mutation();

drop trigger if exists trg_block_journal_entry_delete on public.journal_entries;
create trigger trg_block_journal_entry_delete
before delete on public.journal_entries
for each row execute function public.block_journal_entry_mutation();

create or replace function public.block_financial_snapshot_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'financial_report_snapshots are immutable after freeze.';
end;
$$;

drop trigger if exists trg_block_financial_snapshot_update on public.financial_report_snapshots;
create trigger trg_block_financial_snapshot_update
before update on public.financial_report_snapshots
for each row execute function public.block_financial_snapshot_mutation();

drop trigger if exists trg_block_financial_snapshot_delete on public.financial_report_snapshots;
create trigger trg_block_financial_snapshot_delete
before delete on public.financial_report_snapshots
for each row execute function public.block_financial_snapshot_mutation();

create or replace function public.create_journal_reversal(
  p_original_entry_id uuid,
  p_request_id text,
  p_actor_id uuid default null,
  p_reason text default 'manual_reversal'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original public.journal_entries%rowtype;
  v_existing jsonb;
  v_reversal_id uuid;
  v_now_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if p_request_id is null or btrim(p_request_id) = '' then
    raise exception 'request_id is required for reversal idempotency.';
  end if;

  select response_payload
    into v_existing
  from public.financial_operation_idempotency
  where operation_name = 'create_journal_reversal'
    and request_id = p_request_id
  for update;

  if v_existing is not null then
    return v_existing;
  end if;

  select * into v_original
  from public.journal_entries
  where id = p_original_entry_id;

  if v_original.id is null then
    raise exception 'original journal entry not found';
  end if;

  if v_original.is_reversal then
    raise exception 'cannot reverse a reversal entry';
  end if;

  insert into public.journal_entries (
    id, no, date, account_id, amount, type, source_id,
    entity_type, entity_id, created_at, linked_original_entry_id,
    is_reversal, source_module, request_id, actor_id, metadata
  ) values (
    gen_random_uuid(),
    coalesce(v_original.no, 'REV'),
    v_original.date,
    v_original.account_id,
    v_original.amount,
    case when v_original.type = 'DEBIT' then 'CREDIT' else 'DEBIT' end,
    coalesce(v_original.source_id, v_original.id::text) || ':REV',
    v_original.entity_type,
    v_original.entity_id,
    v_now_ms,
    v_original.id,
    true,
    coalesce(v_original.source_module, 'REVERSAL'),
    p_request_id,
    p_actor_id,
    jsonb_build_object('reason', p_reason)
  ) returning id into v_reversal_id;

  v_existing := jsonb_build_object('success', true, 'original_entry_id', p_original_entry_id, 'reversal_entry_id', v_reversal_id);

  insert into public.financial_operation_idempotency (operation_name, request_id, response_payload)
  values ('create_journal_reversal', p_request_id, v_existing)
  on conflict (operation_name, request_id) do nothing;

  insert into public.financial_audit_log (
    action, actor_id, source_module, request_id, entity_type, entity_id,
    before_state, after_state, metadata
  ) values (
    'CREATE_REVERSAL', p_actor_id, 'JOURNAL', p_request_id, 'JOURNAL_ENTRY', v_reversal_id,
    to_jsonb(v_original),
    (select to_jsonb(j) from public.journal_entries j where j.id = v_reversal_id),
    jsonb_build_object('reason', p_reason)
  );

  return v_existing;
end;
$$;

create or replace function public.run_financial_reconciliation(
  p_as_of date,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_missing_receipt_journal integer;
  v_missing_invoice_journal integer;
  v_unbalanced_sources integer;
  v_orphan_allocations integer;
  v_result jsonb;
begin
  select count(*) into v_missing_receipt_journal
  from public.receipts r
  where r.status = 'POSTED'
    and r.date_time::date <= p_as_of
    and not exists (
      select 1 from public.journal_entries je
      where je.source_id = r.id::text
    );

  select count(*) into v_missing_invoice_journal
  from public.invoices i
  where i.due_date <= p_as_of
    and not exists (
      select 1 from public.journal_entries je
      where je.source_id = i.id::text
    );

  select count(*) into v_unbalanced_sources
  from (
    select source_id,
           sum(case when type = 'DEBIT' then amount else 0 end) as debits,
           sum(case when type = 'CREDIT' then amount else 0 end) as credits
    from public.journal_entries
    where source_id is not null and btrim(source_id) <> ''
    group by source_id
  ) t
  where abs(coalesce(t.debits,0) - coalesce(t.credits,0)) > 0.001;

  select count(*) into v_orphan_allocations
  from public.receipt_allocations ra
  left join public.receipts r on r.id = ra.receipt_id
  left join public.invoices i on i.id = ra.invoice_id
  where r.id is null or i.id is null or r.contract_id <> i.contract_id;

  v_result := jsonb_build_object(
    'as_of', p_as_of,
    'missing_receipt_journal', v_missing_receipt_journal,
    'missing_invoice_journal', v_missing_invoice_journal,
    'unbalanced_sources', v_unbalanced_sources,
    'orphan_allocations', v_orphan_allocations,
    'status', case
      when v_missing_receipt_journal = 0
       and v_missing_invoice_journal = 0
       and v_unbalanced_sources = 0
       and v_orphan_allocations = 0 then 'OK'
      else 'ISSUES_FOUND'
    end
  );

  insert into public.reconciliation_reports (as_of, status, payload, created_by)
  values (p_as_of, v_result->>'status', v_result, p_actor_id);

  return v_result;
end;
$$;

create or replace function public.freeze_closed_period_reports(
  p_period_id uuid,
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period record;
  v_trial jsonb;
  v_income jsonb;
  v_balance jsonb;
begin
  select * into v_period
  from public.accounting_periods
  where id = p_period_id;

  if v_period.id is null then
    raise exception 'period not found';
  end if;

  if v_period.status <> 'CLOSED' then
    raise exception 'period must be CLOSED before freeze';
  end if;

  select jsonb_build_object(
    'total_debit', coalesce(sum(case when type='DEBIT' then amount else 0 end),0),
    'total_credit', coalesce(sum(case when type='CREDIT' then amount else 0 end),0)
  ) into v_trial
  from public.journal_entries
  where date <= v_period.end_date;

  select jsonb_build_object(
    'total_revenue', coalesce(sum(case when a.type='REVENUE' and je.type='CREDIT' then je.amount when a.type='REVENUE' and je.type='DEBIT' then -je.amount else 0 end),0),
    'total_expense', coalesce(sum(case when a.type='EXPENSE' and je.type='DEBIT' then je.amount when a.type='EXPENSE' and je.type='CREDIT' then -je.amount else 0 end),0)
  ) into v_income
  from public.journal_entries je
  join public.accounts a on a.id = je.account_id
  where je.date >= v_period.start_date and je.date <= v_period.end_date;

  select jsonb_build_object(
    'assets', coalesce(sum(case when a.type='ASSET' then case when je.type='DEBIT' then je.amount else -je.amount end else 0 end),0),
    'liabilities', coalesce(sum(case when a.type='LIABILITY' then case when je.type='CREDIT' then je.amount else -je.amount end else 0 end),0),
    'equity', coalesce(sum(case when a.type='EQUITY' then case when je.type='CREDIT' then je.amount else -je.amount end else 0 end),0)
  ) into v_balance
  from public.journal_entries je
  join public.accounts a on a.id = je.account_id
  where je.date <= v_period.end_date;

  insert into public.financial_report_snapshots (period_id, report_type, snapshot_payload, created_by)
  values
    (p_period_id, 'TRIAL_BALANCE', v_trial, p_actor_id),
    (p_period_id, 'INCOME_STATEMENT', v_income, p_actor_id),
    (p_period_id, 'BALANCE_SHEET', v_balance, p_actor_id)
  on conflict (period_id, report_type) do nothing;

  return jsonb_build_object('success', true, 'period_id', p_period_id);
end;
$$;

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

  insert into public.contracts (
    id, no, unit_id, tenant_id, rent_amount, due_day, start_date, end_date,
    deposit, status, sponsor_name, sponsor_id, sponsor_phone, is_demo,
    created_at, updated_at, deleted_at
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

  v_existing := jsonb_build_object('success', true, 'old_contract_id', old_contract_id, 'new_contract_id', v_new_id);

  if v_request_id is not null then
    insert into public.financial_operation_idempotency (operation_name, request_id, response_payload)
    values ('renew_contract_atomic', v_request_id, v_existing)
    on conflict (operation_name, request_id) do nothing;
  end if;

  insert into public.financial_audit_log (
    action, source_module, request_id, entity_type, entity_id, before_state, after_state, metadata
  ) values (
    'RENEW_CONTRACT', 'CONTRACTS', v_request_id, 'CONTRACT', v_new_id,
    jsonb_build_object('old_contract_id', old_contract_id),
    jsonb_build_object('new_contract_id', v_new_id),
    jsonb_build_object('function', 'renew_contract_atomic')
  );

  return v_existing;
end;
$$;
