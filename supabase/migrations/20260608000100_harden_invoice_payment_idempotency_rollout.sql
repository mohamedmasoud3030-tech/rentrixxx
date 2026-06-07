-- Harden the browser-facing invoice payment idempotency rollout without editing
-- already-versioned migrations. This migration is safe for databases that have
-- already recorded 20260604020300 and for clean preview replays.

begin;

create table if not exists public.financial_operation_idempotency (
  operation_name text not null,
  request_id text not null,
  response_payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (operation_name, request_id)
);

alter table public.financial_operation_idempotency
  add column if not exists operation_name text,
  add column if not exists request_id text,
  add column if not exists response_payload jsonb,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

do $$
begin
  if exists (
    select 1
    from public.financial_operation_idempotency
    where operation_name is null
       or request_id is null
       or response_payload is null
       or created_at is null
  ) then
    raise exception 'financial_operation_idempotency contains null key or payload values; migration cannot proceed safely';
  end if;

  if exists (
    select 1
    from public.financial_operation_idempotency
    group by operation_name, request_id
    having count(*) > 1
  ) then
    raise exception 'financial_operation_idempotency contains duplicate operation/request pairs; migration cannot proceed safely';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.financial_operation_idempotency'::regclass
      and contype = 'p'
  ) then
    alter table public.financial_operation_idempotency
      add constraint financial_operation_idempotency_pkey
      primary key (operation_name, request_id);
  end if;
end;
$$;

alter table public.financial_operation_idempotency
  alter column operation_name set not null,
  alter column request_id set not null,
  alter column response_payload set not null,
  alter column created_at set default timezone('utc', now()),
  alter column created_at set not null;

alter table public.financial_operation_idempotency enable row level security;
revoke all on table public.financial_operation_idempotency from public, anon, authenticated;

alter table if exists public.receipts
  add column if not exists request_id text;

do $$
declare
  duplicate_request_id text;
  duplicate_count bigint;
begin
  if to_regclass('public.receipts') is null then
    raise notice 'Skipping receipts.request_id index because public.receipts does not exist';
    return;
  end if;

  select request_id, count(*)
    into duplicate_request_id, duplicate_count
  from public.receipts
  where request_id is not null
  group by request_id
  having count(*) > 1
  order by count(*) desc, request_id
  limit 1;

  if duplicate_request_id is not null then
    raise exception 'Duplicate receipts.request_id value % appears % times; migration cannot create receipts_request_id_uidx safely', duplicate_request_id, duplicate_count;
  end if;

  create unique index if not exists receipts_request_id_uidx
    on public.receipts(request_id)
    where request_id is not null;
end;
$$;

create or replace function public.find_payment_account_id(account_role text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  searchable_expression text;
  account_match_sql text;
  matched_count bigint;
  matched_account_id uuid;
begin
  if to_regclass('public.accounts') is null then
    return null;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'accounts'
      and column_name = 'id'
  ) then
    return null;
  end if;

  select string_agg(format('coalesce(%I::text, '''')', column_name), ' || '' '' || ')
    into searchable_expression
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'accounts'
    and column_name in ('code', 'account_code', 'name', 'account_name', 'type', 'account_type', 'category');

  if searchable_expression is null then
    searchable_expression := '''''';
  end if;

  account_match_sql := case account_role
    when 'cash' then format('lower(%s) ~ %L', searchable_expression, '(cash|bank|bank_transfer|receivable_cash|asset|نقد|بنك)')
    when 'receivable' then format('lower(%s) ~ %L', searchable_expression, '(receivable|accounts receivable|tenant|contract|ذمم|مدين)')
    else 'false'
  end;

  execute format(
    'select count(*)::bigint, min(id::text)::uuid from public.accounts where %s',
    account_match_sql
  ) into matched_count, matched_account_id;

  if coalesce(matched_count, 0) = 0 then
    return null;
  end if;

  if matched_count > 1 then
    raise exception 'Multiple % payment accounts matched; configure accounting accounts unambiguously', account_role;
  end if;

  return matched_account_id;
end;
$$;

create or replace function public.record_invoice_payment_atomic(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid;
  v_invoice_id uuid;
  v_amount numeric;
  v_method text;
  v_date date;
  v_reference text;
  v_request_id text;
  v_invoice jsonb;
  v_contract jsonb;
  v_total_due numeric;
  v_paid_amount numeric;
  v_outstanding numeric;
  v_receipt_id uuid := gen_random_uuid();
  v_allocation_id uuid := gen_random_uuid();
  v_payment_id uuid := gen_random_uuid();
  v_debit_account_id uuid;
  v_credit_account_id uuid;
  v_internal_payload jsonb;
  v_internal_result jsonb;
  v_existing_result jsonb;
  v_payment_columns text[];
  v_payment_insert_columns text;
  v_payment_insert_values text;
  v_result jsonb;
begin
  actor_id := auth.uid();
  if actor_id is null then
    raise exception 'Authentication is required to record invoice payments';
  end if;

  if not coalesce(public.is_admin_or_manager(), false) then
    raise exception 'ADMIN or MANAGER role is required to record invoice payments'
      using errcode = '42501';
  end if;

  v_request_id := nullif(payload->>'request_id', '');
  if v_request_id is null then
    raise exception 'request_id is required for idempotent payment recording';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'record_invoice_payment_atomic:' || v_request_id,
      0
    )
  );

  select response_payload
    into v_existing_result
  from public.financial_operation_idempotency
  where operation_name = 'record_invoice_payment_atomic'
    and request_id = v_request_id
  for update;

  if v_existing_result is not null then
    return v_existing_result;
  end if;

  v_invoice_id := nullif(payload->>'invoice_id', '')::uuid;
  v_amount := coalesce((payload->>'amount')::numeric, 0);
  v_method := nullif(payload->>'method', '');
  v_date := coalesce(nullif(payload->>'date', '')::date, current_date);
  v_reference := nullif(payload->>'reference', '');

  if v_invoice_id is null then
    raise exception 'invoice_id is required';
  end if;

  if v_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  select to_jsonb(i)
    into v_invoice
  from public.invoices i
  where i.id = v_invoice_id
    and coalesce((to_jsonb(i)->>'deleted_at')::timestamptz, null) is null
  for update;

  if v_invoice is null then
    raise exception 'Invoice not found';
  end if;

  select to_jsonb(c)
    into v_contract
  from public.contracts c
  where c.id = (v_invoice->>'contract_id')::uuid
    and coalesce((to_jsonb(c)->>'deleted_at')::timestamptz, null) is null
  for update;

  if v_contract is null then
    raise exception 'Contract for invoice not found';
  end if;

  v_total_due := coalesce((v_invoice->>'amount')::numeric, 0) + coalesce((v_invoice->>'tax_amount')::numeric, 0);
  v_paid_amount := coalesce((v_invoice->>'paid_amount')::numeric, 0);
  v_outstanding := v_total_due - v_paid_amount;

  if v_amount > v_outstanding + 0.001 then
    raise exception 'Payment amount exceeds outstanding invoice balance';
  end if;

  v_debit_account_id := public.find_payment_account_id('cash');
  v_credit_account_id := public.find_payment_account_id('receivable');

  if v_debit_account_id is null or v_credit_account_id is null then
    raise exception 'Payment accounting accounts are not configured';
  end if;

  v_internal_payload := jsonb_build_object(
    'request_id', v_request_id,
    'receipt', jsonb_build_object(
      'id', v_receipt_id,
      'contract_id', v_invoice->>'contract_id',
      'date_time', v_date::text,
      'channel', v_method,
      'amount', v_amount,
      'ref', coalesce(v_reference, v_request_id),
      'notes', 'Invoice payment ' || v_invoice_id::text,
      'status', 'POSTED',
      'created_at', timezone('utc', now()),
      'request_id', v_request_id
    ),
    'allocations', jsonb_build_array(jsonb_build_object(
      'id', v_allocation_id,
      'invoice_id', v_invoice_id,
      'amount', v_amount,
      'created_at', timezone('utc', now())
    )),
    'journal_entries', jsonb_build_array(
      jsonb_build_object(
        'id', gen_random_uuid(),
        'no', 'PAY-' || left(replace(v_request_id, '-', ''), 12) || '-D',
        'date', v_date::text,
        'account_id', v_debit_account_id,
        'amount', v_amount,
        'type', 'DEBIT',
        'source_id', v_receipt_id,
        'entity_type', 'contract',
        'entity_id', v_invoice->>'contract_id',
        'created_at', timezone('utc', now())
      ),
      jsonb_build_object(
        'id', gen_random_uuid(),
        'no', 'PAY-' || left(replace(v_request_id, '-', ''), 12) || '-C',
        'date', v_date::text,
        'account_id', v_credit_account_id,
        'amount', v_amount,
        'type', 'CREDIT',
        'source_id', v_receipt_id,
        'entity_type', 'contract',
        'entity_id', v_invoice->>'contract_id',
        'created_at', timezone('utc', now())
      )
    )
  );

  v_internal_result := public.post_receipt_atomic(v_internal_payload);
  v_payment_id := coalesce(nullif(v_internal_result->>'payment_id', '')::uuid, v_payment_id);

  if v_internal_result ? 'payment_id' then
    v_payment_id := (v_internal_result->>'payment_id')::uuid;
  else
    select array_agg(column_name order by ordinal_position)
      into v_payment_columns
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'payments'
      and column_name in ('id', 'invoice_id', 'amount', 'payment_method', 'payment_date', 'reference_number', 'payment_reference');

    v_payment_insert_columns := array_to_string(v_payment_columns, ', ');
    v_payment_insert_values := array_to_string(array(
      select case column_name
        when 'id' then quote_literal(v_payment_id)
        when 'invoice_id' then quote_literal(v_invoice_id)
        when 'amount' then quote_literal(round(v_amount, 2))
        when 'payment_method' then quote_literal(v_method)
        when 'payment_date' then quote_literal(v_date)
        when 'reference_number' then quote_nullable(v_reference)
        when 'payment_reference' then quote_nullable(v_reference)
      end
      from unnest(v_payment_columns) as column_name
    ), ', ');

    execute format('insert into public.payments (%s) values (%s)', v_payment_insert_columns, v_payment_insert_values);
  end if;

  v_result := coalesce(v_internal_result, '{}'::jsonb)
    || jsonb_build_object(
      'status', 'recorded',
      'request_id', v_request_id,
      'invoice_id', v_invoice_id,
      'payment_id', v_payment_id,
      'receipt_id', coalesce(nullif(v_internal_result->>'receipt_id', '')::uuid, v_receipt_id)
    );

  insert into public.financial_operation_idempotency(operation_name, request_id, response_payload)
  values ('record_invoice_payment_atomic', v_request_id, v_result)
  on conflict (operation_name, request_id) do nothing;

  return v_result;
end;
$$;

revoke all on function public.find_payment_account_id(text) from public, anon, authenticated;
revoke all on function public.record_invoice_payment_atomic(jsonb) from public, anon;
grant execute on function public.record_invoice_payment_atomic(jsonb) to authenticated;

do $$
begin
  if to_regprocedure('public.post_receipt_atomic(jsonb)') is not null then
    execute 'revoke all on function public.post_receipt_atomic(jsonb) from public, anon, authenticated';
    execute 'grant execute on function public.post_receipt_atomic(jsonb) to service_role';
  end if;
end;
$$;

commit;
