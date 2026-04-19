-- Add period management and enforce closed-period + double-entry posting invariants.

create table if not exists public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  period_code text not null unique,
  start_date date not null,
  end_date date not null,
  status text not null default 'OPEN',
  closed_at timestamptz,
  closed_by uuid,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date <= end_date),
  check (status in ('OPEN','CLOSED'))
);

create table if not exists public.closing_entries (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.accounting_periods(id),
  source_account_id uuid not null,
  retained_earnings_account_id uuid not null,
  amount numeric not null check (amount > 0),
  side text not null check (side in ('DEBIT','CREDIT')),
  source_voucher_no text,
  created_at timestamptz not null default now()
);

create index if not exists idx_accounting_periods_date_range on public.accounting_periods (start_date, end_date, status);
create index if not exists idx_closing_entries_period on public.closing_entries (period_id);

create or replace function public.guard_closed_period_journal_entries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date;
begin
  v_date := coalesce(new.date, current_date);
  if exists (
    select 1
    from public.accounting_periods p
    where p.status = 'CLOSED'
      and p.start_date <= v_date
      and p.end_date >= v_date
  ) then
    raise exception 'الفترة المحاسبية مغلقة (%).', v_date;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_closed_period_journal_entries on public.journal_entries;
create trigger trg_guard_closed_period_journal_entries
before insert or update on public.journal_entries
for each row execute function public.guard_closed_period_journal_entries();

create or replace function public.close_accounting_period(
  p_period_id uuid,
  p_retained_earnings_account_id uuid,
  p_closed_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period record;
  v_now timestamptz := now();
  v_source text := 'CLOSE-' || substring(p_period_id::text from 1 for 8);
  v_rows_inserted integer := 0;
  v_batch_no text;
  r record;
begin
  select *
    into v_period
  from public.accounting_periods p
  where p.id = p_period_id
  for update;

  if v_period.id is null then
    raise exception 'الفترة غير موجودة.';
  end if;

  if v_period.status = 'CLOSED' then
    return jsonb_build_object('success', true, 'already_closed', true, 'period_id', p_period_id);
  end if;

  for r in
    with period_sums as (
      select
        je.account_id,
        a.type as account_type,
        sum(case when je.type = 'DEBIT' then je.amount else 0 end) as debits,
        sum(case when je.type = 'CREDIT' then je.amount else 0 end) as credits
      from public.journal_entries je
      join public.accounts a on a.id = je.account_id
      where je.date >= v_period.start_date
        and je.date <= v_period.end_date
        and a.type in ('REVENUE','EXPENSE')
      group by je.account_id, a.type
    )
    select
      account_id,
      account_type,
      case
        when account_type = 'REVENUE' then greatest(coalesce(credits, 0) - coalesce(debits, 0), 0)
        else greatest(coalesce(debits, 0) - coalesce(credits, 0), 0)
      end as amount
    from period_sums
    where case
      when account_type = 'REVENUE' then greatest(coalesce(credits, 0) - coalesce(debits, 0), 0)
      else greatest(coalesce(debits, 0) - coalesce(credits, 0), 0)
    end > 0.001
  loop
    v_batch_no := 'CLS-' || to_char(v_now, 'YYYYMMDDHH24MISS');

    if r.account_type = 'REVENUE' then
      insert into public.journal_entries (id, no, date, account_id, amount, type, source_id, entity_type, entity_id, created_at)
      values (gen_random_uuid(), v_batch_no, v_period.end_date, r.account_id, r.amount, 'DEBIT', v_source, 'CONTRACT', null, (extract(epoch from v_now) * 1000)::bigint);

      insert into public.journal_entries (id, no, date, account_id, amount, type, source_id, entity_type, entity_id, created_at)
      values (gen_random_uuid(), v_batch_no, v_period.end_date, p_retained_earnings_account_id, r.amount, 'CREDIT', v_source, 'CONTRACT', null, (extract(epoch from v_now) * 1000)::bigint);

      insert into public.closing_entries (period_id, source_account_id, retained_earnings_account_id, amount, side, source_voucher_no)
      values (p_period_id, r.account_id, p_retained_earnings_account_id, r.amount, 'CREDIT', v_batch_no);
    else
      insert into public.journal_entries (id, no, date, account_id, amount, type, source_id, entity_type, entity_id, created_at)
      values (gen_random_uuid(), v_batch_no, v_period.end_date, p_retained_earnings_account_id, r.amount, 'DEBIT', v_source, 'CONTRACT', null, (extract(epoch from v_now) * 1000)::bigint);

      insert into public.journal_entries (id, no, date, account_id, amount, type, source_id, entity_type, entity_id, created_at)
      values (gen_random_uuid(), v_batch_no, v_period.end_date, r.account_id, r.amount, 'CREDIT', v_source, 'CONTRACT', null, (extract(epoch from v_now) * 1000)::bigint);

      insert into public.closing_entries (period_id, source_account_id, retained_earnings_account_id, amount, side, source_voucher_no)
      values (p_period_id, r.account_id, p_retained_earnings_account_id, r.amount, 'DEBIT', v_batch_no);
    end if;

    v_rows_inserted := v_rows_inserted + 1;
  end loop;

  update public.accounting_periods
  set status = 'CLOSED',
      closed_at = v_now,
      closed_by = p_closed_by,
      updated_at = v_now
  where id = p_period_id;

  return jsonb_build_object(
    'success', true,
    'period_id', p_period_id,
    'closed_entries_count', v_rows_inserted,
    'source_id', v_source
  );
end;
$$;

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
  v_receipt_date date;
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
