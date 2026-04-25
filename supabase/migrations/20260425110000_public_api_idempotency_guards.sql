-- Harden request-level idempotency and duplicate financial-write protections.
-- Safety layer: discover duplicates, preserve a cleanup report, and neutralize duplicates before unique indexes.

create table if not exists public.request_id_dedup_audit (
  id bigserial primary key,
  table_name text not null,
  duplicate_key text not null,
  kept_record_id text,
  duplicate_record_id text,
  original_record jsonb,
  kept_record jsonb,
  removed_records jsonb,
  reason text,
  generated_fix_sql text not null,
  logged_at timestamptz not null default now()
);

-- journal_entries duplicate scan + cleanup
with ranked as (
  select
    id,
    tenant_id::text as tenant_id,
    request_id,
    row_number() over (
      partition by tenant_id, request_id
      order by created_at asc nulls last, id asc
    ) as rn,
    first_value(id) over (
      partition by tenant_id, request_id
      order by created_at asc nulls last, id asc
    ) as keeper_id
  from public.journal_entries
  where request_id is not null
)
insert into public.request_id_dedup_audit (table_name, duplicate_key, kept_record_id, duplicate_record_id, generated_fix_sql)
select
  'journal_entries',
  tenant_id || ':' || request_id,
  keeper_id::text,
  id::text,
  'update public.journal_entries set request_id = null where id = ''' || id::text || ''';'
from ranked
where rn > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by tenant_id, request_id
      order by created_at asc nulls last, id asc
    ) as rn
  from public.journal_entries
  where request_id is not null
)
update public.journal_entries j
set request_id = null
from ranked r
where j.id = r.id
  and r.rn > 1;

-- financial_events duplicate scan + cleanup
with ranked as (
  select
    id,
    tenant_id::text as tenant_id,
    request_id,
    row_number() over (
      partition by tenant_id, request_id
      order by created_at asc nulls last, id asc
    ) as rn,
    first_value(id) over (
      partition by tenant_id, request_id
      order by created_at asc nulls last, id asc
    ) as keeper_id
  from public.financial_events
  where request_id is not null
)
insert into public.request_id_dedup_audit (table_name, duplicate_key, kept_record_id, duplicate_record_id, generated_fix_sql)
select
  'financial_events',
  tenant_id || ':' || request_id,
  keeper_id::text,
  id::text,
  'update public.financial_events set request_id = null where id = ''' || id::text || ''';'
from ranked
where rn > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by tenant_id, request_id
      order by created_at asc nulls last, id asc
    ) as rn
  from public.financial_events
  where request_id is not null
)
update public.financial_events e
set request_id = null
from ranked r
where e.id = r.id
  and r.rn > 1;

-- financial_audit_log duplicate scan + cleanup
with ranked as (
  select
    id,
    request_id,
    action,
    row_number() over (
      partition by request_id, action
      order by created_at asc nulls last, id asc
    ) as rn,
    first_value(id) over (
      partition by request_id, action
      order by created_at asc nulls last, id asc
    ) as keeper_id
  from public.financial_audit_log
  where request_id is not null
)
insert into public.request_id_dedup_audit (table_name, duplicate_key, kept_record_id, duplicate_record_id, generated_fix_sql)
select
  'financial_audit_log',
  request_id || ':' || action,
  keeper_id::text,
  id::text,
  'update public.financial_audit_log set request_id = null where id = ''' || id::text || ''';'
from ranked
where rn > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by request_id, action
      order by created_at asc nulls last, id asc
    ) as rn
  from public.financial_audit_log
  where request_id is not null
)
update public.financial_audit_log a
set request_id = null
from ranked r
where a.id = r.id
  and r.rn > 1;

create unique index if not exists journal_entries_tenant_request_id_unique_idx
  on public.journal_entries (tenant_id, request_id)
  where request_id is not null;

create unique index if not exists financial_events_tenant_request_id_unique_idx
  on public.financial_events (tenant_id, request_id)
  where request_id is not null;

create unique index if not exists financial_audit_log_request_id_action_unique_idx
  on public.financial_audit_log (request_id, action)
  where request_id is not null;
