-- Enterprise financial hardening: deterministic idempotency, immutable ledger, anomaly visibility,
-- and replay/alert operational controls.

alter table if exists public.financial_operation_idempotency
  add column if not exists source_table text,
  add column if not exists source_record_id text;

create unique index if not exists contracts_tenant_request_id_unique_idx
  on public.contracts (tenant_id, request_id)
  where request_id is not null;

create unique index if not exists invoices_tenant_request_id_unique_idx
  on public.invoices (tenant_id, request_id)
  where request_id is not null;

create table if not exists public.operational_alerts (
  id bigserial primary key,
  alert_type text not null,
  severity text not null default 'WARNING',
  task_name text,
  tenant_id uuid,
  request_id text,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  dedup_key text,
  dedup_window_start timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists operational_alerts_dedup_idx
  on public.operational_alerts (dedup_key, dedup_window_start)
  where dedup_key is not null and dedup_window_start is not null;

create table if not exists public.operational_alert_delivery_queue (
  id bigserial primary key,
  alert_type text not null,
  payload jsonb not null,
  status text not null default 'pending',
  retry_count integer not null default 0,
  last_error text,
  next_retry_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists operational_alert_delivery_queue_pending_idx
  on public.operational_alert_delivery_queue (status, next_retry_at);

create table if not exists public.automation_replay_queue (
  id uuid primary key,
  task_name text not null,
  replay_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  replayed_at timestamptz
);

create index if not exists automation_replay_queue_status_idx
  on public.automation_replay_queue (status, created_at asc);

alter table if exists public.request_id_dedup_audit
  add column if not exists original_record jsonb,
  add column if not exists kept_record jsonb,
  add column if not exists removed_records jsonb,
  add column if not exists reason text;

update public.request_id_dedup_audit
set reason = coalesce(reason, 'duplicate_request_id_cleanup')
where reason is null;

create or replace function public.enforce_double_entry_balance()
returns trigger
language plpgsql
as $$
declare
  debit_total numeric := 0;
  credit_total numeric := 0;
begin
  if new.batch_id is null then
    return new;
  end if;

  select coalesce(sum(amount), 0) into debit_total
  from public.journal_entries
  where tenant_id = new.tenant_id
    and batch_id = new.batch_id
    and type = 'DEBIT';

  select coalesce(sum(amount), 0) into credit_total
  from public.journal_entries
  where tenant_id = new.tenant_id
    and batch_id = new.batch_id
    and type = 'CREDIT';

  if debit_total <> credit_total then
    raise exception 'double_entry_validation_failed for batch %, debit %, credit %', new.batch_id, debit_total, credit_total;
  end if;

  return new;
end;
$$;

-- Deferrable trigger validates at commit time, allowing multi-row insert in one transaction.
drop trigger if exists trg_enforce_double_entry_balance on public.journal_entries;
create constraint trigger trg_enforce_double_entry_balance
after insert on public.journal_entries
deferrable initially deferred
for each row execute function public.enforce_double_entry_balance();

create or replace view public.v_operational_failure_rate as
select
  date_trunc('hour', created_at) as hour,
  count(*) filter (where status_code >= 500)::numeric / nullif(count(*), 0) as failure_rate,
  count(*) as total_requests
from public.platform_api_request_log
group by 1;

create or replace view public.v_replay_queue_size as
select status, count(*) as queue_size
from public.automation_replay_queue
group by status;

create or replace view public.v_alert_counts as
select severity, alert_type, count(*) as alert_count
from public.operational_alerts
group by severity, alert_type;

create or replace view public.v_financial_volume as
select tenant_id, date_trunc('day', created_at) as day, count(*) as events_count
from public.financial_events
group by tenant_id, date_trunc('day', created_at);
