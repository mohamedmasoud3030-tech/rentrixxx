-- Bank-grade security + deterministic control-plane enforcement.

create table if not exists public.bank_security_events (
  id bigserial primary key,
  event_type text not null,
  actor_role text,
  actor_id uuid,
  request_id text,
  object_name text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.prevent_bank_security_events_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'bank_security_events is immutable';
end;
$$;

drop trigger if exists trg_prevent_bank_security_events_mutation on public.bank_security_events;
create trigger trg_prevent_bank_security_events_mutation
before update or delete on public.bank_security_events
for each row execute function public.prevent_bank_security_events_mutation();

-- Strict deny-by-default grants.
revoke all on schema public from public;
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on all tables in schema public from service_role;
revoke all on all tables in schema public from internal_worker;
revoke all on all sequences in schema public from anon;
revoke all on all sequences in schema public from authenticated;
revoke all on all sequences in schema public from service_role;
revoke all on all sequences in schema public from internal_worker;

-- Explicit table grants for controlled system operations.
grant usage on schema public to authenticated, service_role, internal_worker;
grant select, insert, update on table public.automation_jobs to internal_worker, service_role;
grant select, insert on table public.automation_run_logs to internal_worker, service_role;
grant select, insert, update on table public.status_history to internal_worker, service_role;
grant select on table public.status_transition_rules to internal_worker, service_role;
grant select, insert, update on table public.operational_alert_delivery_queue to internal_worker, service_role;
grant select, insert on table public.operational_alerts to internal_worker, service_role;
grant select, insert, update on table public.automation_replay_queue to internal_worker, service_role;
grant select, insert on table public.platform_api_request_log to service_role, internal_worker;
grant select, insert on table public.bank_security_events to service_role, internal_worker;

grant usage, select, update on all sequences in schema public to service_role, internal_worker;

-- Critical tables: strict RLS + explicit worker/service policies.
alter table if exists public.automation_jobs enable row level security;
alter table if exists public.automation_jobs force row level security;
alter table if exists public.automation_run_logs enable row level security;
alter table if exists public.automation_run_logs force row level security;
alter table if exists public.status_history enable row level security;
alter table if exists public.status_history force row level security;
alter table if exists public.status_transition_rules enable row level security;
alter table if exists public.status_transition_rules force row level security;
alter table if exists public.operational_alert_delivery_queue enable row level security;
alter table if exists public.operational_alert_delivery_queue force row level security;
alter table if exists public.operational_alerts enable row level security;
alter table if exists public.operational_alerts force row level security;
alter table if exists public.automation_replay_queue enable row level security;
alter table if exists public.automation_replay_queue force row level security;
alter table if exists public.platform_api_request_log enable row level security;
alter table if exists public.platform_api_request_log force row level security;

-- Policy reset helper.
do $$
declare
  p record;
  t text;
begin
  foreach t in array array[
    'automation_jobs',
    'automation_run_logs',
    'status_history',
    'status_transition_rules',
    'operational_alert_delivery_queue',
    'operational_alerts',
    'automation_replay_queue',
    'platform_api_request_log'
  ]
  loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      for p in select policyname from pg_policies where schemaname='public' and tablename=t
      loop
        execute format('drop policy if exists %I on public.%I', p.policyname, t);
      end loop;
    end if;
  end loop;
end;
$$;

create policy automation_jobs_worker_rw on public.automation_jobs
for all to internal_worker
using ((select auth.role()) = 'internal_worker')
with check ((select auth.role()) = 'internal_worker');

create policy automation_jobs_service_rw on public.automation_jobs
for all to service_role
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

create policy automation_run_logs_worker_rw on public.automation_run_logs
for all to internal_worker
using ((select auth.role()) = 'internal_worker')
with check ((select auth.role()) = 'internal_worker');

create policy automation_run_logs_service_rw on public.automation_run_logs
for all to service_role
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

create policy status_history_worker_rw on public.status_history
for all to internal_worker
using ((select auth.role()) = 'internal_worker')
with check ((select auth.role()) = 'internal_worker');

create policy status_history_service_rw on public.status_history
for all to service_role
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

create policy status_transition_rules_worker_read on public.status_transition_rules
for select to internal_worker
using ((select auth.role()) = 'internal_worker');

create policy status_transition_rules_service_read on public.status_transition_rules
for select to service_role
using ((select auth.role()) = 'service_role');

create policy alert_queue_worker_rw on public.operational_alert_delivery_queue
for all to internal_worker
using ((select auth.role()) = 'internal_worker')
with check ((select auth.role()) = 'internal_worker');

create policy alert_queue_service_rw on public.operational_alert_delivery_queue
for all to service_role
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

create policy operational_alerts_worker_rw on public.operational_alerts
for all to internal_worker
using ((select auth.role()) = 'internal_worker')
with check ((select auth.role()) = 'internal_worker');

create policy operational_alerts_service_rw on public.operational_alerts
for all to service_role
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

create policy replay_queue_worker_rw on public.automation_replay_queue
for all to internal_worker
using ((select auth.role()) = 'internal_worker')
with check ((select auth.role()) = 'internal_worker');

create policy replay_queue_service_rw on public.automation_replay_queue
for all to service_role
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

create policy api_request_log_service_insert on public.platform_api_request_log
for insert to service_role
with check ((select auth.role()) = 'service_role');

create policy api_request_log_worker_insert on public.platform_api_request_log
for insert to internal_worker
with check ((select auth.role()) = 'internal_worker');

create policy api_request_log_service_select on public.platform_api_request_log
for select to service_role
using ((select auth.role()) = 'service_role');

create policy api_request_log_worker_select on public.platform_api_request_log
for select to internal_worker
using ((select auth.role()) = 'internal_worker');

-- Service role audit hooks.
create or replace function public.audit_service_role_actions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  req_id text := nullif(current_setting('request.jwt.claim.request_id', true), '');
begin
  if auth.role() = 'service_role' then
    insert into public.bank_security_events(
      event_type,
      actor_role,
      actor_id,
      request_id,
      object_name,
      before_state,
      after_state,
      metadata
    ) values (
      tg_op,
      auth.role(),
      auth.uid(),
      req_id,
      tg_table_name,
      to_jsonb(old),
      to_jsonb(new),
      jsonb_build_object('trigger', tg_name)
    );
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['automation_jobs','automation_run_logs','status_history','platform_api_request_log','operational_alerts','operational_alert_delivery_queue','automation_replay_queue']
  loop
    if exists (select 1 from pg_tables where schemaname='public' and tablename=t) then
      execute format('drop trigger if exists trg_audit_service_role_%I on public.%I', t, t);
      execute format('create trigger trg_audit_service_role_%I after insert or update or delete on public.%I for each row execute function public.audit_service_role_actions()', t, t);
    end if;
  end loop;
end;
$$;

-- Bank-grade bucketed, partitioned rate limit tables.
create table if not exists public.rate_limit_api_key_buckets (
  api_key text not null,
  window_start timestamptz not null,
  shard smallint not null,
  count integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (api_key, window_start, shard)
) partition by range (window_start);

create table if not exists public.rate_limit_ip_buckets (
  ip_key text not null,
  window_start timestamptz not null,
  shard smallint not null,
  count integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (ip_key, window_start, shard)
) partition by range (window_start);

create table if not exists public.rate_limit_request_id_buckets (
  request_id_key text not null,
  window_start timestamptz not null,
  shard smallint not null,
  count integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (request_id_key, window_start, shard)
) partition by range (window_start);

create table if not exists public.rate_limit_api_key_buckets_default partition of public.rate_limit_api_key_buckets default;
create table if not exists public.rate_limit_ip_buckets_default partition of public.rate_limit_ip_buckets default;
create table if not exists public.rate_limit_request_id_buckets_default partition of public.rate_limit_request_id_buckets default;

create index if not exists idx_rate_limit_api_key_lookup on public.rate_limit_api_key_buckets (api_key, window_start);
create index if not exists idx_rate_limit_ip_lookup on public.rate_limit_ip_buckets (ip_key, window_start);
create index if not exists idx_rate_limit_request_id_lookup on public.rate_limit_request_id_buckets (request_id_key, window_start);

create or replace function public.ensure_rate_limit_partitions(p_ts timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  start_ts timestamptz := date_trunc('day', p_ts);
  end_ts timestamptz := start_ts + interval '1 day';
  suffix text := to_char(start_ts, 'YYYYMMDD');
begin
  execute format('create table if not exists public.rate_limit_api_key_buckets_%s partition of public.rate_limit_api_key_buckets for values from (%L) to (%L)', suffix, start_ts, end_ts);
  execute format('create table if not exists public.rate_limit_ip_buckets_%s partition of public.rate_limit_ip_buckets for values from (%L) to (%L)', suffix, start_ts, end_ts);
  execute format('create table if not exists public.rate_limit_request_id_buckets_%s partition of public.rate_limit_request_id_buckets for values from (%L) to (%L)', suffix, start_ts, end_ts);
end;
$$;

create or replace function public.cleanup_rate_limit_buckets(p_limit integer default 50000)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  d1 integer := 0;
  d2 integer := 0;
  d3 integer := 0;
begin
  with doomed as (
    select ctid from public.rate_limit_api_key_buckets where expires_at <= now() limit greatest(1,p_limit)
  ) delete from public.rate_limit_api_key_buckets t using doomed d where t.ctid=d.ctid;
  get diagnostics d1 = row_count;

  with doomed as (
    select ctid from public.rate_limit_ip_buckets where expires_at <= now() limit greatest(1,p_limit)
  ) delete from public.rate_limit_ip_buckets t using doomed d where t.ctid=d.ctid;
  get diagnostics d2 = row_count;

  with doomed as (
    select ctid from public.rate_limit_request_id_buckets where expires_at <= now() limit greatest(1,p_limit)
  ) delete from public.rate_limit_request_id_buckets t using doomed d where t.ctid=d.ctid;
  get diagnostics d3 = row_count;

  return d1 + d2 + d3;
end;
$$;

create or replace function public.enforce_api_rate_limit(
  p_api_key_id text,
  p_source_ip text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ws timestamptz := date_trunc('minute', now());
  ex timestamptz := ws + interval '2 hours';
  shard smallint := mod(abs(hashtext(coalesce(p_request_id,'') || ':' || txid_current()::text)), 32)::smallint;
  api_limit integer := coalesce(nullif(current_setting('app.rate_limit_api_key_per_minute', true), ''), '240')::integer;
  ip_limit integer := coalesce(nullif(current_setting('app.rate_limit_ip_per_minute', true), ''), '600')::integer;
  req_limit integer := coalesce(nullif(current_setting('app.rate_limit_request_id_per_minute', true), ''), '30')::integer;
  api_current integer;
  ip_current integer;
  req_current integer;
begin
  perform public.ensure_rate_limit_partitions(ws);

  insert into public.rate_limit_api_key_buckets(api_key, window_start, shard, count, expires_at)
  values (coalesce(p_api_key_id,'unknown'), ws, shard, 1, ex)
  on conflict (api_key, window_start, shard)
  do update set count = public.rate_limit_api_key_buckets.count + 1, updated_at = now(), expires_at = excluded.expires_at;

  insert into public.rate_limit_ip_buckets(ip_key, window_start, shard, count, expires_at)
  values (coalesce(p_source_ip,'unknown'), ws, shard, 1, ex)
  on conflict (ip_key, window_start, shard)
  do update set count = public.rate_limit_ip_buckets.count + 1, updated_at = now(), expires_at = excluded.expires_at;

  insert into public.rate_limit_request_id_buckets(request_id_key, window_start, shard, count, expires_at)
  values (coalesce(p_request_id,'unknown'), ws, shard, 1, ex)
  on conflict (request_id_key, window_start, shard)
  do update set count = public.rate_limit_request_id_buckets.count + 1, updated_at = now(), expires_at = excluded.expires_at;

  select coalesce(sum(count),0) into api_current from public.rate_limit_api_key_buckets where api_key = coalesce(p_api_key_id,'unknown') and window_start = ws;
  select coalesce(sum(count),0) into ip_current from public.rate_limit_ip_buckets where ip_key = coalesce(p_source_ip,'unknown') and window_start = ws;
  select coalesce(sum(count),0) into req_current from public.rate_limit_request_id_buckets where request_id_key = coalesce(p_request_id,'unknown') and window_start = ws;

  if api_current > api_limit then
    return jsonb_build_object('limit', api_limit, 'current', api_current, 'exceeded', true);
  end if;
  if ip_current > ip_limit then
    return jsonb_build_object('limit', ip_limit, 'current', ip_current, 'exceeded', true);
  end if;
  if req_current > req_limit then
    return jsonb_build_object('limit', req_limit, 'current', req_current, 'exceeded', true);
  end if;

  return jsonb_build_object('limit', api_limit, 'current', api_current, 'exceeded', false);
end;
$$;

revoke all on function public.enforce_api_rate_limit(text, text, text) from public;
revoke all on function public.enforce_api_rate_limit(text, text, text) from anon;
grant execute on function public.enforce_api_rate_limit(text, text, text) to authenticated;
grant execute on function public.enforce_api_rate_limit(text, text, text) to service_role;

-- Migration lock with advisory lock support.
create table if not exists public.migration_lock_state (
  id boolean primary key default true,
  locked boolean not null default false,
  lock_owner text,
  lock_acquired_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint one_lock_row check (id = true)
);

insert into public.migration_lock_state (id, locked)
values (true, false)
on conflict (id) do nothing;

create table if not exists public.migration_execution_history (
  migration_version text primary key,
  checksum text,
  applied_by text,
  applied_at timestamptz not null default now()
);

create or replace function public.acquire_migration_lock(p_owner text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  ok := pg_try_advisory_lock(hashtext('public.migration.lock'));
  if not ok then
    return false;
  end if;

  update public.migration_lock_state
  set locked = true,
      lock_owner = p_owner,
      lock_acquired_at = now(),
      updated_at = now()
  where id = true;

  return true;
end;
$$;

create or replace function public.release_migration_lock()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.migration_lock_state
  set locked = false,
      lock_owner = null,
      lock_acquired_at = null,
      updated_at = now()
  where id = true;

  perform pg_advisory_unlock(hashtext('public.migration.lock'));
end;
$$;

-- Retry queue processor with SKIP LOCKED.
create or replace function public.process_operational_alert_delivery_queue(p_limit integer default 200)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  processed integer := 0;
begin
  with picked as (
    select id, retry_count
    from public.operational_alert_delivery_queue
    where status = 'pending'
      and next_retry_at <= now()
    order by created_at asc
    limit greatest(1, p_limit)
    for update skip locked
  ), upd as (
    update public.operational_alert_delivery_queue q
    set
      retry_count = q.retry_count + 1,
      next_retry_at = now() + make_interval(secs => least(3600, power(2, q.retry_count)::int)),
      status = case when q.retry_count + 1 >= 8 then 'dead_letter' else 'pending' end,
      updated_at = now()
    where q.id in (select id from picked)
    returning q.id
  )
  select count(*) into processed from upd;

  return processed;
end;
$$;

-- Deterministic control-plane function (single transaction in function call).
create or replace function public.run_control_plane_maintenance(batch_size integer, retry_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b integer := greatest(1, coalesce(batch_size, 1000));
  r integer := greatest(1, coalesce(retry_limit, 200));
  cleaned_idem integer := 0;
  cleaned_rate integer := 0;
  audited integer := 0;
  retried integer := 0;
  out_json jsonb;
begin
  cleaned_idem := public.cleanup_expired_idempotency_rows(b);
  cleaned_rate := public.cleanup_rate_limit_buckets(b * 10);
  audited := public.run_financial_consistency_audit();
  retried := public.process_operational_alert_delivery_queue(r);

  out_json := jsonb_build_object(
    'cleaned_idempotency_rows', cleaned_idem,
    'cleaned_rate_limit_rows', cleaned_rate,
    'consistency_violations', audited,
    'retried_alert_deliveries', retried,
    'executed_at', now()
  );

  insert into public.bank_security_events(event_type, actor_role, actor_id, object_name, after_state)
  values ('control_plane_maintenance', auth.role(), auth.uid(), 'run_control_plane_maintenance', out_json);

  return out_json;
end;
$$;

create or replace function public.trigger_control_plane_maintenance(batch_size integer default 1000, retry_limit integer default 200)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.run_control_plane_maintenance(batch_size, retry_limit);
$$;

revoke all on function public.run_control_plane_maintenance(integer, integer) from public;
revoke all on function public.trigger_control_plane_maintenance(integer, integer) from public;
grant execute on function public.run_control_plane_maintenance(integer, integer) to service_role, internal_worker;
grant execute on function public.trigger_control_plane_maintenance(integer, integer) to service_role, internal_worker;

-- Schedule maintenance every 5 minutes when pg_cron exists.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'bank-control-plane-maintenance-5m',
      '*/5 * * * *',
      $$select public.run_control_plane_maintenance(1000, 200);$$
    );
  end if;
exception
  when undefined_function or invalid_schema_name then
    null;
end;
$$;
