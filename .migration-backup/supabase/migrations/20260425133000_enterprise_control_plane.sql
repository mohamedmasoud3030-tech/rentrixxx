-- Enterprise control plane hardening: transaction boundaries, idempotency lifecycle,
-- alert aggregation, financial consistency audit, rate limits, replay isolation, and webhook reliability.

alter table if exists public.journal_entries
  add column if not exists transaction_group_id uuid;

with grouped_legacy_transactions as (
  select
    tenant_id,
    batch_id,
    gen_random_uuid() as transaction_group_id
  from public.journal_entries
  where transaction_group_id is null
    and batch_id is not null
  group by tenant_id, batch_id
)
update public.journal_entries je
set transaction_group_id = glt.transaction_group_id
from grouped_legacy_transactions glt
where je.transaction_group_id is null
  and je.batch_id is not null
  and je.tenant_id = glt.tenant_id
  and je.batch_id = glt.batch_id;

create index if not exists idx_journal_entries_transaction_group_id
  on public.journal_entries (tenant_id, transaction_group_id);

create or replace function public.enforce_transaction_group_integrity()
returns trigger
language plpgsql
as $$
declare
  txn_id uuid;
  txn_count integer;
  debit_total numeric;
  credit_total numeric;
begin
  txn_id := new.transaction_group_id;
  if txn_id is null then
    raise exception 'transaction_group_id is required for financial journal entries';
  end if;

  select count(*),
         coalesce(sum(case when type = 'DEBIT' then amount else 0 end), 0),
         coalesce(sum(case when type = 'CREDIT' then amount else 0 end), 0)
    into txn_count, debit_total, credit_total
  from public.journal_entries
  where tenant_id = new.tenant_id
    and transaction_group_id = txn_id;

  if txn_count < 2 then
    raise exception 'transaction_group_integrity_failed: transaction % has less than two entries', txn_id;
  end if;

  if debit_total <> credit_total then
    raise exception 'transaction_group_integrity_failed: transaction % is unbalanced (debit %, credit %)', txn_id, debit_total, credit_total;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_transaction_group_integrity on public.journal_entries;
create constraint trigger trg_enforce_transaction_group_integrity
after insert on public.journal_entries
deferrable initially deferred
for each row execute function public.enforce_transaction_group_integrity();

alter table if exists public.financial_operation_idempotency
  add column if not exists tenant_id uuid,
  add column if not exists expires_at timestamptz;

update public.financial_operation_idempotency
set expires_at = coalesce(expires_at, created_at + interval '24 hours', now() + interval '24 hours')
where expires_at is null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'financial_operation_idempotency_operation_name_request_id_key'
      and conrelid = 'public.financial_operation_idempotency'::regclass
  ) then
    alter table public.financial_operation_idempotency
      drop constraint financial_operation_idempotency_operation_name_request_id_key;
  end if;
end $$;

alter table public.financial_operation_idempotency
  alter column expires_at set default (now() + interval '24 hours');

drop index if exists public.idx_financial_operation_idempotency_active;
create index if not exists idx_financial_operation_idempotency_active
  on public.financial_operation_idempotency (tenant_id, operation_name, request_id, expires_at);

create unique index if not exists financial_operation_idempotency_tenant_request_unique_idx
  on public.financial_operation_idempotency (tenant_id, operation_name, request_id)
  where tenant_id is not null;

create or replace function public.cleanup_expired_idempotency_rows(p_limit integer default 1000)
returns integer
language plpgsql
as $$
declare
  deleted_count integer;
begin
  with doomed as (
    select ctid
    from public.financial_operation_idempotency
    where expires_at <= now()
    limit greatest(1, p_limit)
  )
  delete from public.financial_operation_idempotency f
  using doomed d
  where f.ctid = d.ctid;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create table if not exists public.operational_alert_aggregates (
  id bigserial primary key,
  alert_type text not null,
  severity text not null,
  time_window_start timestamptz not null,
  count integer not null default 1,
  last_payload jsonb,
  updated_at timestamptz not null default now(),
  unique (alert_type, severity, time_window_start)
);

create or replace function public.aggregate_operational_alert()
returns trigger
language plpgsql
as $$
declare
  window_start timestamptz;
begin
  window_start := date_trunc('minute', new.created_at) - make_interval(mins => extract(minute from new.created_at)::int % 5);

  insert into public.operational_alert_aggregates (alert_type, severity, time_window_start, count, last_payload, updated_at)
  values (new.alert_type, coalesce(new.severity, 'WARNING'), window_start, 1, new.details, now())
  on conflict (alert_type, severity, time_window_start)
  do update set
    count = public.operational_alert_aggregates.count + 1,
    last_payload = excluded.last_payload,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_aggregate_operational_alert on public.operational_alerts;
create trigger trg_aggregate_operational_alert
after insert on public.operational_alerts
for each row execute function public.aggregate_operational_alert();

create table if not exists public.financial_consistency_audit_violations (
  id bigserial primary key,
  tenant_id uuid not null,
  transaction_group_id uuid,
  debit_total numeric not null,
  credit_total numeric not null,
  violation_reason text not null,
  flagged_at timestamptz not null default now()
);

create or replace function public.run_financial_consistency_audit()
returns integer
language plpgsql
as $$
declare
  violation_count integer := 0;
  rec record;
begin
  for rec in
    select
      tenant_id,
      transaction_group_id,
      coalesce(sum(case when type = 'DEBIT' then amount else 0 end), 0) as debit_total,
      coalesce(sum(case when type = 'CREDIT' then amount else 0 end), 0) as credit_total
    from public.journal_entries
    where transaction_group_id is not null
    group by tenant_id, transaction_group_id
    having coalesce(sum(case when type = 'DEBIT' then amount else 0 end), 0)
        <> coalesce(sum(case when type = 'CREDIT' then amount else 0 end), 0)
  loop
    insert into public.financial_consistency_audit_violations (
      tenant_id,
      transaction_group_id,
      debit_total,
      credit_total,
      violation_reason
    ) values (
      rec.tenant_id,
      rec.transaction_group_id,
      rec.debit_total,
      rec.credit_total,
      'debit_credit_mismatch'
    );

    insert into public.operational_alerts (
      alert_type,
      severity,
      tenant_id,
      message,
      details,
      dedup_key,
      dedup_window_start
    ) values (
      'financial_consistency_violation',
      'CRITICAL',
      rec.tenant_id,
      'Financial consistency audit detected unbalanced transaction group',
      jsonb_build_object('transaction_group_id', rec.transaction_group_id, 'debit_total', rec.debit_total, 'credit_total', rec.credit_total),
      rec.tenant_id::text || ':financial_consistency_violation:' || rec.transaction_group_id::text,
      date_trunc('hour', now())
    ) on conflict do nothing;

    violation_count := violation_count + 1;
  end loop;

  return violation_count;
end;
$$;

create table if not exists public.api_rate_limit_counters (
  id bigserial primary key,
  scope text not null,
  scope_key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (scope, scope_key, window_start)
);

create or replace function public.enforce_api_rate_limit(
  p_api_key_id text,
  p_source_ip text,
  p_request_id text
)
returns jsonb
language plpgsql
as $$
declare
  v_window_start timestamptz := date_trunc('minute', now());
  api_count integer;
  ip_count integer;
  req_count integer;
  api_limit integer := coalesce(nullif(current_setting('app.rate_limit_api_key_per_minute', true), ''), '240')::integer;
  ip_limit integer := coalesce(nullif(current_setting('app.rate_limit_ip_per_minute', true), ''), '600')::integer;
  req_limit integer := coalesce(nullif(current_setting('app.rate_limit_request_id_per_minute', true), ''), '30')::integer;
begin
  insert into public.api_rate_limit_counters (scope, scope_key, window_start, count)
  values ('api_key', p_api_key_id, v_window_start, 1)
  on conflict (scope, scope_key, window_start)
  do update set count = public.api_rate_limit_counters.count + 1, updated_at = now();

  insert into public.api_rate_limit_counters (scope, scope_key, window_start, count)
  values ('source_ip', p_source_ip, v_window_start, 1)
  on conflict (scope, scope_key, window_start)
  do update set count = public.api_rate_limit_counters.count + 1, updated_at = now();

  insert into public.api_rate_limit_counters (scope, scope_key, window_start, count)
  values ('request_id', p_request_id, v_window_start, 1)
  on conflict (scope, scope_key, window_start)
  do update set count = public.api_rate_limit_counters.count + 1, updated_at = now();

  select count into api_count from public.api_rate_limit_counters where scope = 'api_key' and scope_key = p_api_key_id and window_start = v_window_start;
  select count into ip_count from public.api_rate_limit_counters where scope = 'source_ip' and scope_key = p_source_ip and window_start = v_window_start;
  select count into req_count from public.api_rate_limit_counters where scope = 'request_id' and scope_key = p_request_id and window_start = v_window_start;

  if api_count > api_limit then
    return jsonb_build_object('scope', 'api_key', 'limit', api_limit, 'current', api_count, 'exceeded', true);
  end if;

  if ip_count > ip_limit then
    return jsonb_build_object('scope', 'source_ip', 'limit', ip_limit, 'current', ip_count, 'exceeded', true);
  end if;

  if req_count > req_limit then
    return jsonb_build_object('scope', 'request_id', 'limit', req_limit, 'current', req_count, 'exceeded', true);
  end if;

  return jsonb_build_object(
    'scope', 'api_key',
    'limit', api_limit,
    'current', api_count,
    'exceeded', false
  );
end;
$$;

alter table if exists public.automation_replay_queue
  add column if not exists processing_mode text not null default 'isolated';

create index if not exists idx_automation_replay_isolated_pending
  on public.automation_replay_queue (processing_mode, status, created_at)
  where processing_mode = 'isolated';

alter table if exists public.operational_alert_delivery_queue
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.process_operational_alert_delivery_queue(p_limit integer default 100)
returns integer
language plpgsql
as $$
declare
  updated_count integer := 0;
begin
  update public.operational_alert_delivery_queue q
  set
    retry_count = q.retry_count + 1,
    next_retry_at = now() + make_interval(secs => least(3600, (2 ^ greatest(0, q.retry_count))::int)),
    status = case when q.retry_count >= 8 then 'dead_letter' else 'pending' end,
    updated_at = now()
  where q.id in (
    select id
    from public.operational_alert_delivery_queue
    where status = 'pending'
      and next_retry_at <= now()
    order by created_at asc
    limit greatest(1, p_limit)
  );

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function public.run_control_plane_maintenance(
  batch_size integer default 1000,
  retry_limit integer default 200
)
returns jsonb
language plpgsql
as $$
declare
  cleaned integer := 0;
  violations integer := 0;
  retried integer := 0;
begin
  cleaned := public.cleanup_expired_idempotency_rows(batch_size);
  violations := public.run_financial_consistency_audit();
  retried := public.process_operational_alert_delivery_queue(retry_limit);

  return jsonb_build_object(
    'cleaned_idempotency_rows', cleaned,
    'consistency_violations', violations,
    'retried_alert_deliveries', retried,
    'executed_at', now()
  );
end;
$$;

create table if not exists public.ledger_corrections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  transaction_group_id uuid not null,
  reversal_transaction_group_id uuid not null,
  correction_transaction_group_id uuid,
  reason text not null,
  created_at timestamptz not null default now()
);

create or replace view public.v_anomaly_frequency as
select alert_type, severity, date_trunc('hour', created_at) as hour, count(*) as anomaly_count
from public.operational_alerts
group by alert_type, severity, date_trunc('hour', created_at);

create or replace function public.trigger_control_plane_maintenance(
  p_batch_size integer default 1000,
  p_retry_limit integer default 200
)
returns jsonb
language sql
as $$
  select public.run_control_plane_maintenance(p_batch_size, p_retry_limit);
$$;

-- Optional scheduler wiring when pg_cron is enabled in the environment.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'control-plane-maintenance-every-5m',
      '*/5 * * * *',
      $$select public.run_control_plane_maintenance(1000, 200);$$
    );
  end if;
exception
  when undefined_function or invalid_schema_name then
    -- pg_cron not available in this environment; schedule externally.
    null;
end;
$$;
