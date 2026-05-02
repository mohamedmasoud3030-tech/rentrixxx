-- Production security + scalability hardening (Supabase-native).

create table if not exists public.platform_security_audit_log (
  id bigserial primary key,
  actor_role text,
  actor_uid uuid,
  action text not null,
  table_name text,
  record_pk text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Migration lock + execution tracking.
create table if not exists public.schema_migration_lock (
  id boolean primary key default true,
  locked_by text,
  locked_at timestamptz,
  lock_token uuid,
  updated_at timestamptz not null default now(),
  constraint single_row_lock check (id = true)
);

insert into public.schema_migration_lock (id, locked_by, locked_at, lock_token)
values (true, null, null, null)
on conflict (id) do nothing;

create table if not exists public.schema_migration_executions (
  migration_version text primary key,
  checksum text,
  applied_by text,
  applied_at timestamptz not null default now()
);

-- Restrict service_role to function-level execution only.
revoke all on all tables in schema public from service_role;
revoke all on all sequences in schema public from service_role;

-- internal_worker role should be function-exec only.
revoke all on all tables in schema public from internal_worker;
revoke all on all sequences in schema public from internal_worker;

-- Keep authenticated application table permissions explicit.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Supabase-native RLS policy rebuild for critical tables.
do $$
declare
  tbl text;
  pol record;
  has_user_id boolean;
  has_actor_id boolean;
  has_created_by boolean;
  using_expr text;
begin
  foreach tbl in array array[
    'automation_jobs',
    'automation_run_logs',
    'status_history',
    'status_transition_rules',
    'platform_api_request_log',
    'operational_alerts',
    'operational_alert_delivery_queue',
    'automation_replay_queue',
    'api_rate_limit_counters',
    'api_rate_limit_counters_v2'
  ]
  loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = tbl and c.relkind = 'r'
    ) then
      execute format('alter table public.%I enable row level security', tbl);
      execute format('alter table public.%I force row level security', tbl);

      for pol in
        select policyname
        from pg_policies
        where schemaname = 'public' and tablename = tbl
      loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
      end loop;

      select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = tbl and column_name = 'user_id'
      ) into has_user_id;

      select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = tbl and column_name = 'actor_id'
      ) into has_actor_id;

      select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = tbl and column_name = 'created_by'
      ) into has_created_by;

      if has_user_id then
        using_expr := '(auth.uid() is not null and user_id = auth.uid())';
      elsif has_actor_id then
        using_expr := '(auth.uid() is not null and actor_id = auth.uid())';
      elsif has_created_by then
        using_expr := '(auth.uid() is not null and created_by = auth.uid())';
      else
        using_expr := '((select auth.role()) = ''authenticated'' and auth.uid() is not null)';
      end if;

      execute format('create policy %I on public.%I for select to authenticated using (%s)', tbl || '_auth_select', tbl, using_expr);
      execute format('create policy %I on public.%I for insert to authenticated with check (%s)', tbl || '_auth_insert', tbl, using_expr);
      execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', tbl || '_auth_update', tbl, using_expr, using_expr);
      execute format('create policy %I on public.%I for delete to authenticated using (%s)', tbl || '_auth_delete', tbl, using_expr);
    end if;
  end loop;
end;
$$;

-- Service-role action auditing for critical tables.
create or replace function public.log_service_role_dml()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor text := auth.role();
  uid_text text := nullif(auth.uid()::text, '');
  pk_text text := coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'));
begin
  if actor = 'service_role' then
    insert into public.platform_security_audit_log(
      actor_role,
      actor_uid,
      action,
      table_name,
      record_pk,
      details
    ) values (
      actor,
      case when uid_text is null then null else uid_text::uuid end,
      tg_op,
      tg_table_name,
      pk_text,
      jsonb_build_object('new', to_jsonb(new), 'old', to_jsonb(old))
    );
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'automation_jobs',
    'automation_run_logs',
    'status_history',
    'status_transition_rules',
    'platform_api_request_log',
    'operational_alerts',
    'operational_alert_delivery_queue',
    'automation_replay_queue'
  ]
  loop
    if exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = tbl and c.relkind = 'r'
    ) then
      execute format('drop trigger if exists trg_audit_service_role_%I on public.%I', tbl, tbl);
      execute format(
        'create trigger trg_audit_service_role_%I after insert or update or delete on public.%I for each row execute function public.log_service_role_dml()',
        tbl,
        tbl
      );
    end if;
  end loop;
end;
$$;

-- Rate-limit scalability: sharded, partitioned counters with TTL.
create table if not exists public.api_rate_limit_counters_v2 (
  scope text not null,
  scope_key text not null,
  window_start timestamptz not null,
  shard smallint not null,
  count integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (scope, scope_key, window_start, shard)
) partition by range (window_start);

create table if not exists public.api_rate_limit_counters_v2_default
  partition of public.api_rate_limit_counters_v2 default;

create or replace function public.ensure_rate_limit_partition(p_ts timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  start_ts timestamptz := date_trunc('month', p_ts);
  end_ts timestamptz := start_ts + interval '1 month';
  part_name text := format('api_rate_limit_counters_v2_%s', to_char(start_ts, 'YYYYMM'));
begin
  execute format(
    'create table if not exists public.%I partition of public.api_rate_limit_counters_v2 for values from (%L) to (%L)',
    part_name,
    start_ts,
    end_ts
  );
end;
$$;

create index if not exists idx_api_rate_limit_counters_v2_lookup
  on public.api_rate_limit_counters_v2 (scope, scope_key, window_start);

create index if not exists idx_api_rate_limit_counters_v2_expiry
  on public.api_rate_limit_counters_v2 (expires_at);

create or replace function public.cleanup_api_rate_limit_counters_v2(p_limit integer default 50000)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  with doomed as (
    select ctid
    from public.api_rate_limit_counters_v2
    where expires_at <= now()
    limit greatest(1, p_limit)
  )
  delete from public.api_rate_limit_counters_v2 t
  using doomed d
  where t.ctid = d.ctid;

  get diagnostics v_deleted = row_count;
  return v_deleted;
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
  v_window_start timestamptz := date_trunc('minute', now());
  v_expires_at timestamptz := v_window_start + interval '2 hours';
  v_api_limit integer := coalesce(nullif(current_setting('app.rate_limit_api_key_per_minute', true), ''), '240')::integer;
  v_ip_limit integer := coalesce(nullif(current_setting('app.rate_limit_ip_per_minute', true), ''), '600')::integer;
  v_req_limit integer := coalesce(nullif(current_setting('app.rate_limit_request_id_per_minute', true), ''), '30')::integer;
  v_api_current integer;
  v_ip_current integer;
  v_req_current integer;
  v_shard smallint;
begin
  perform public.ensure_rate_limit_partition(v_window_start);

  v_shard := mod(abs(hashtext(coalesce(p_api_key_id, 'unknown') || ':' || coalesce(p_source_ip, 'unknown') || ':' || txid_current()::text)), 16)::smallint;

  insert into public.api_rate_limit_counters_v2(scope, scope_key, window_start, shard, count, expires_at)
  values ('api_key', coalesce(p_api_key_id, 'unknown'), v_window_start, v_shard, 1, v_expires_at)
  on conflict (scope, scope_key, window_start, shard)
  do update set count = public.api_rate_limit_counters_v2.count + 1, updated_at = now(), expires_at = excluded.expires_at;

  insert into public.api_rate_limit_counters_v2(scope, scope_key, window_start, shard, count, expires_at)
  values ('source_ip', coalesce(p_source_ip, 'unknown'), v_window_start, v_shard, 1, v_expires_at)
  on conflict (scope, scope_key, window_start, shard)
  do update set count = public.api_rate_limit_counters_v2.count + 1, updated_at = now(), expires_at = excluded.expires_at;

  insert into public.api_rate_limit_counters_v2(scope, scope_key, window_start, shard, count, expires_at)
  values ('request_id', coalesce(p_request_id, 'unknown'), v_window_start, v_shard, 1, v_expires_at)
  on conflict (scope, scope_key, window_start, shard)
  do update set count = public.api_rate_limit_counters_v2.count + 1, updated_at = now(), expires_at = excluded.expires_at;

  select coalesce(sum(count), 0) into v_api_current
  from public.api_rate_limit_counters_v2
  where scope = 'api_key' and scope_key = coalesce(p_api_key_id, 'unknown') and window_start = v_window_start;

  select coalesce(sum(count), 0) into v_ip_current
  from public.api_rate_limit_counters_v2
  where scope = 'source_ip' and scope_key = coalesce(p_source_ip, 'unknown') and window_start = v_window_start;

  select coalesce(sum(count), 0) into v_req_current
  from public.api_rate_limit_counters_v2
  where scope = 'request_id' and scope_key = coalesce(p_request_id, 'unknown') and window_start = v_window_start;

  if v_api_current > v_api_limit then
    return jsonb_build_object('limit', v_api_limit, 'current', v_api_current, 'exceeded', true);
  end if;
  if v_ip_current > v_ip_limit then
    return jsonb_build_object('limit', v_ip_limit, 'current', v_ip_current, 'exceeded', true);
  end if;
  if v_req_current > v_req_limit then
    return jsonb_build_object('limit', v_req_limit, 'current', v_req_current, 'exceeded', true);
  end if;

  return jsonb_build_object('limit', v_api_limit, 'current', v_api_current, 'exceeded', false);
end;
$$;

revoke all on function public.enforce_api_rate_limit(text, text, text) from anon;
grant execute on function public.enforce_api_rate_limit(text, text, text) to authenticated;
grant execute on function public.enforce_api_rate_limit(text, text, text) to service_role;

-- Control-plane function refreshed with deterministic steps and migration audit logging.
create or replace function public.run_control_plane_maintenance(
  batch_size integer,
  retry_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch integer := greatest(1, coalesce(batch_size, 1000));
  v_retry integer := greatest(1, coalesce(retry_limit, 200));
  v_clean_idem integer := 0;
  v_clean_rate integer := 0;
  v_violations integer := 0;
  v_retried integer := 0;
  v_result jsonb;
begin
  v_clean_idem := public.cleanup_expired_idempotency_rows(v_batch);
  v_clean_rate := public.cleanup_api_rate_limit_counters_v2(v_batch * 10);
  v_violations := public.run_financial_consistency_audit();
  v_retried := public.process_operational_alert_delivery_queue(v_retry);

  v_result := jsonb_build_object(
    'cleaned_idempotency_rows', v_clean_idem,
    'cleaned_rate_limit_rows', v_clean_rate,
    'consistency_violations', v_violations,
    'retried_alert_deliveries', v_retried,
    'executed_at', now()
  );

  insert into public.platform_security_audit_log(actor_role, actor_uid, action, table_name, details)
  values (auth.role(), auth.uid(), 'run_control_plane_maintenance', null, v_result);

  return v_result;
end;
$$;

revoke all on function public.run_control_plane_maintenance(integer, integer) from anon;
grant execute on function public.run_control_plane_maintenance(integer, integer) to service_role;
grant execute on function public.run_control_plane_maintenance(integer, integer) to internal_worker;

create or replace function public.trigger_control_plane_maintenance(
  batch_size integer default 1000,
  retry_limit integer default 200
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.run_control_plane_maintenance(batch_size, retry_limit);
$$;

revoke all on function public.trigger_control_plane_maintenance(integer, integer) from anon;
grant execute on function public.trigger_control_plane_maintenance(integer, integer) to service_role;
grant execute on function public.trigger_control_plane_maintenance(integer, integer) to internal_worker;

-- pg_cron scheduling if available.
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
    null;
end;
$$;
