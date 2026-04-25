-- Unified enterprise security + control-plane architecture migration.

create table if not exists public.security_control_plane_audit (
  id bigserial primary key,
  action text not null,
  object_type text not null,
  object_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Role bootstrap.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'internal_worker') then
    create role internal_worker nologin;
  end if;
end;
$$;

-- Deny-by-default schema privileges.
revoke all on schema public from public;
revoke all on all tables in schema public from public;
revoke all on all sequences in schema public from public;
revoke all on all functions in schema public from public;

-- Baseline grants for known runtime roles.
grant usage on schema public to authenticated, service_role, internal_worker;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to internal_worker;
grant usage, select, update on all sequences in schema public to service_role, internal_worker;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public revoke all on tables from public;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to internal_worker;

alter default privileges in schema public revoke all on functions from public;
alter default privileges in schema public grant execute on functions to authenticated;
alter default privileges in schema public grant execute on functions to service_role;
alter default privileges in schema public grant execute on functions to internal_worker;

-- Enforce RLS and canonical policies for critical tables.
do $$
declare
  tbl text;
  pol record;
begin
  foreach tbl in array array[
    'automation_jobs',
    'automation_run_logs',
    'status_history',
    'status_transition_rules',
    'operational_alert_delivery_queue',
    'platform_api_request_log',
    'automation_replay_queue',
    'operational_alerts'
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
        where schemaname = 'public'
          and tablename = tbl
      loop
        execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
      end loop;

      execute format(
        'create policy %I on public.%I for select to authenticated using ((select auth.role()) = ''authenticated'')',
        tbl || '_auth_select',
        tbl
      );

      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((select auth.role()) = ''authenticated'')',
        tbl || '_auth_insert',
        tbl
      );

      execute format(
        'create policy %I on public.%I for update to authenticated using ((select auth.role()) = ''authenticated'') with check ((select auth.role()) = ''authenticated'')',
        tbl || '_auth_update',
        tbl
      );

      execute format(
        'create policy %I on public.%I for delete to authenticated using ((select auth.role()) = ''authenticated'')',
        tbl || '_auth_delete',
        tbl
      );

      execute format(
        'create policy %I on public.%I for all to service_role using (true) with check (true)',
        tbl || '_service_role_all',
        tbl
      );

      execute format(
        'create policy %I on public.%I for all to internal_worker using (true) with check (true)',
        tbl || '_internal_worker_all',
        tbl
      );

      insert into public.security_control_plane_audit(action, object_type, object_name, metadata)
      values ('rls_policy_rebuild', 'table', tbl, jsonb_build_object('status', 'applied'));
    end if;
  end loop;
end;
$$;

-- Duplicate index cleanup for public schema (non-constraint indexes only).
do $$
declare
  idx record;
begin
  for idx in
    with idxs as (
      select
        n.nspname as schema_name,
        t.relname as table_name,
        i.relname as index_name,
        x.indisprimary,
        x.indisunique,
        x.indkey,
        x.indclass,
        x.indcollation,
        pg_get_expr(x.indpred, x.indrelid) as indpred,
        pg_get_expr(x.indexprs, x.indrelid) as indexprs,
        row_number() over (
          partition by n.nspname, t.relname, x.indisunique, x.indkey, x.indclass, x.indcollation, pg_get_expr(x.indpred, x.indrelid), pg_get_expr(x.indexprs, x.indrelid)
          order by i.oid
        ) as rn
      from pg_index x
      join pg_class i on i.oid = x.indexrelid
      join pg_class t on t.oid = x.indrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relkind = 'r'
        and not x.indisprimary
        and not exists (
          select 1
          from pg_constraint c
          where c.conindid = x.indexrelid
        )
    )
    select *
    from idxs
    where rn > 1
  loop
    execute format('drop index if exists %I.%I', idx.schema_name, idx.index_name);
    insert into public.security_control_plane_audit(action, object_type, object_name, metadata)
    values ('drop_duplicate_index', 'index', idx.index_name, jsonb_build_object('table', idx.table_name));
  end loop;
end;
$$;

-- Function hardening for all public functions.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('alter function %s set search_path = public', fn.signature);
    execute format('revoke all on function %s from anon', fn.signature);
    execute format('grant execute on function %s to authenticated', fn.signature);
    execute format('grant execute on function %s to service_role', fn.signature);
    execute format('grant execute on function %s to internal_worker', fn.signature);
  end loop;
end;
$$;

-- Deterministic control-plane maintenance function.
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
  v_batch_size integer := greatest(1, coalesce(batch_size, 1000));
  v_retry_limit integer := greatest(1, coalesce(retry_limit, 200));
  v_cleaned integer := 0;
  v_violations integer := 0;
  v_retried integer := 0;
  v_result jsonb;
begin
  v_cleaned := public.cleanup_expired_idempotency_rows(v_batch_size);
  v_violations := public.run_financial_consistency_audit();
  v_retried := public.process_operational_alert_delivery_queue(v_retry_limit);

  v_result := jsonb_build_object(
    'cleaned_idempotency_rows', v_cleaned,
    'consistency_violations', v_violations,
    'retried_alert_deliveries', v_retried,
    'executed_at', now()
  );

  insert into public.security_control_plane_audit(action, object_type, object_name, metadata)
  values ('run_control_plane_maintenance', 'function', 'public.run_control_plane_maintenance', v_result);

  return v_result;
end;
$$;

revoke all on function public.run_control_plane_maintenance(integer, integer) from anon;
grant execute on function public.run_control_plane_maintenance(integer, integer) to service_role;
grant execute on function public.run_control_plane_maintenance(integer, integer) to internal_worker;

-- Fallback wrapper for external schedulers.
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

-- Rate limiting with configurable thresholds.
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
  v_api_count integer;
  v_ip_count integer;
  v_req_count integer;
  v_api_limit integer := coalesce(nullif(current_setting('app.rate_limit_api_key_per_minute', true), ''), '240')::integer;
  v_ip_limit integer := coalesce(nullif(current_setting('app.rate_limit_ip_per_minute', true), ''), '600')::integer;
  v_req_limit integer := coalesce(nullif(current_setting('app.rate_limit_request_id_per_minute', true), ''), '30')::integer;
  v_limit integer;
  v_current integer;
begin
  insert into public.api_rate_limit_counters(scope, scope_key, window_start, count)
  values ('api_key', coalesce(p_api_key_id, 'unknown'), v_window_start, 1)
  on conflict (scope, scope_key, window_start)
  do update set count = public.api_rate_limit_counters.count + 1, updated_at = now();

  insert into public.api_rate_limit_counters(scope, scope_key, window_start, count)
  values ('source_ip', coalesce(p_source_ip, 'unknown'), v_window_start, 1)
  on conflict (scope, scope_key, window_start)
  do update set count = public.api_rate_limit_counters.count + 1, updated_at = now();

  insert into public.api_rate_limit_counters(scope, scope_key, window_start, count)
  values ('request_id', coalesce(p_request_id, 'unknown'), v_window_start, 1)
  on conflict (scope, scope_key, window_start)
  do update set count = public.api_rate_limit_counters.count + 1, updated_at = now();

  select count into v_api_count
  from public.api_rate_limit_counters
  where scope = 'api_key'
    and scope_key = coalesce(p_api_key_id, 'unknown')
    and window_start = v_window_start;

  select count into v_ip_count
  from public.api_rate_limit_counters
  where scope = 'source_ip'
    and scope_key = coalesce(p_source_ip, 'unknown')
    and window_start = v_window_start;

  select count into v_req_count
  from public.api_rate_limit_counters
  where scope = 'request_id'
    and scope_key = coalesce(p_request_id, 'unknown')
    and window_start = v_window_start;

  if v_api_count > v_api_limit then
    v_limit := v_api_limit;
    v_current := v_api_count;
    return jsonb_build_object('limit', v_limit, 'current', v_current, 'exceeded', true);
  end if;

  if v_ip_count > v_ip_limit then
    v_limit := v_ip_limit;
    v_current := v_ip_count;
    return jsonb_build_object('limit', v_limit, 'current', v_current, 'exceeded', true);
  end if;

  if v_req_count > v_req_limit then
    v_limit := v_req_limit;
    v_current := v_req_count;
    return jsonb_build_object('limit', v_limit, 'current', v_current, 'exceeded', true);
  end if;

  v_limit := v_api_limit;
  v_current := v_api_count;
  return jsonb_build_object('limit', v_limit, 'current', v_current, 'exceeded', false);
end;
$$;

revoke all on function public.enforce_api_rate_limit(text, text, text) from anon;
grant execute on function public.enforce_api_rate_limit(text, text, text) to authenticated;
grant execute on function public.enforce_api_rate_limit(text, text, text) to service_role;

-- Scheduler wiring for pg_cron environments.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'control-plane-maintenance-every-5m',
      '*/5 * * * *',
      $$select public.run_control_plane_maintenance(1000, 200);$$
    );

    insert into public.security_control_plane_audit(action, object_type, object_name, metadata)
    values (
      'pg_cron_schedule',
      'job',
      'control-plane-maintenance-every-5m',
      jsonb_build_object('cron', '*/5 * * * *')
    );
  end if;
exception
  when undefined_function or invalid_schema_name then
    -- fallback is trigger_control_plane_maintenance for external scheduler.
    insert into public.security_control_plane_audit(action, object_type, object_name, metadata)
    values (
      'pg_cron_unavailable',
      'job',
      'control-plane-maintenance-every-5m',
      jsonb_build_object('fallback_function', 'public.trigger_control_plane_maintenance')
    );
end;
$$;
