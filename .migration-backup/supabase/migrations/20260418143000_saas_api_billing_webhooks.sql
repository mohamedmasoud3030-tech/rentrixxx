-- SaaS platform layer: public API auth, billing, usage metering, webhooks.

create extension if not exists pgcrypto;

create table if not exists public.platform_api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  role text not null default 'VIEWER',
  scopes text[] not null default '{}',
  status text not null default 'ACTIVE',
  rotated_from uuid,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role in ('ADMIN','ACCOUNTANT','VIEWER')),
  check (status in ('ACTIVE','REVOKED')),
  unique (tenant_id, key_prefix)
);

create table if not exists public.platform_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique,
  plan_code text not null,
  status text not null default 'ACTIVE',
  started_at timestamptz not null default now(),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '1 month'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (plan_code in ('BASIC','PRO','ENTERPRISE')),
  check (status in ('ACTIVE','PAST_DUE','CANCELLED'))
);

create table if not exists public.platform_usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  metric_code text not null,
  quantity numeric not null default 1,
  reference_type text,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_usage_events_tenant_metric on public.platform_usage_events(tenant_id, metric_code, created_at desc);

create table if not exists public.platform_billing_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  check (event_type in ('subscription_created','usage_recorded','invoice_generated'))
);

create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  url text not null,
  secret_hash text not null,
  event_types text[] not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('ACTIVE','DISABLED'))
);

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  endpoint_id uuid not null references public.webhook_endpoints(id),
  event_id uuid,
  event_type text not null,
  payload jsonb not null,
  signature text not null,
  attempt integer not null default 1,
  status text not null default 'PENDING',
  http_status integer,
  response_body text,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  check (status in ('PENDING','SUCCESS','FAILED'))
);

create index if not exists idx_webhook_deliveries_tenant_status on public.webhook_deliveries(tenant_id, status, next_retry_at);

create table if not exists public.platform_api_request_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  api_key_id uuid,
  request_method text not null,
  request_path text not null,
  request_id text,
  status_code integer,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_api_request_log_tenant_time on public.platform_api_request_log(tenant_id, created_at desc);

create or replace function public.platform_hash_secret(p_secret text)
returns text
language sql
security definer
set search_path = public
as $$
  select encode(digest(p_secret, 'sha256'), 'hex');
$$;

create or replace function public.platform_create_api_key(
  p_tenant_id uuid,
  p_name text,
  p_role text,
  p_scopes text[],
  p_expires_at timestamptz default null,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw text;
  v_prefix text;
  v_hash text;
  v_id uuid;
begin
  if p_tenant_id is null then
    raise exception 'tenant_id is required';
  end if;

  v_raw := 'pk_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_prefix := left(v_raw, 16);
  v_hash := public.platform_hash_secret(v_raw);

  insert into public.platform_api_keys (
    tenant_id, name, key_prefix, key_hash, role, scopes, expires_at, created_by
  ) values (
    p_tenant_id, coalesce(p_name, 'Default API Key'), v_prefix, v_hash, coalesce(p_role, 'VIEWER'), coalesce(p_scopes, '{}'), p_expires_at, p_created_by
  ) returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'tenant_id', p_tenant_id,
    'api_key', v_raw,
    'key_prefix', v_prefix,
    'role', p_role,
    'scopes', p_scopes
  );
end;
$$;

create or replace function public.platform_authenticate_api_key(
  p_api_key text,
  p_required_scope text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_key record;
begin
  if p_api_key is null or btrim(p_api_key) = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_api_key');
  end if;

  v_hash := public.platform_hash_secret(p_api_key);

  select * into v_key
  from public.platform_api_keys k
  where k.key_hash = v_hash
    and k.status = 'ACTIVE'
    and (k.expires_at is null or k.expires_at > now())
  limit 1;

  if v_key.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_api_key');
  end if;

  if p_required_scope is not null and not (p_required_scope = any(v_key.scopes)) then
    return jsonb_build_object('ok', false, 'error', 'scope_denied');
  end if;

  update public.platform_api_keys
  set last_used_at = now(), updated_at = now()
  where id = v_key.id;

  return jsonb_build_object(
    'ok', true,
    'api_key_id', v_key.id,
    'tenant_id', v_key.tenant_id,
    'role', v_key.role,
    'scopes', v_key.scopes
  );
end;
$$;

create or replace function public.platform_record_usage(
  p_tenant_id uuid,
  p_metric_code text,
  p_quantity numeric default 1,
  p_reference_type text default null,
  p_reference_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.platform_usage_events (
    tenant_id, metric_code, quantity, reference_type, reference_id, metadata
  ) values (
    p_tenant_id, p_metric_code, coalesce(p_quantity, 1), p_reference_type, p_reference_id, coalesce(p_metadata, '{}'::jsonb)
  );

  insert into public.platform_billing_events (tenant_id, event_type, payload)
  values (
    p_tenant_id,
    'usage_recorded',
    jsonb_build_object('metric_code', p_metric_code, 'quantity', p_quantity, 'reference_type', p_reference_type, 'reference_id', p_reference_id)
  );
end;
$$;

create or replace function public.platform_enqueue_webhook(
  p_tenant_id uuid,
  p_event_type text,
  p_event_id uuid,
  p_payload jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_signature text;
  v_enqueued integer := 0;
begin
  for r in
    select *
    from public.webhook_endpoints w
    where w.tenant_id = p_tenant_id
      and w.status = 'ACTIVE'
      and p_event_type = any(w.event_types)
  loop
    v_signature := encode(digest(coalesce(p_payload::text, '') || '::' || r.secret_hash, 'sha256'), 'hex');

    insert into public.webhook_deliveries (
      tenant_id, endpoint_id, event_id, event_type, payload, signature, attempt, status, next_retry_at
    ) values (
      p_tenant_id, r.id, p_event_id, p_event_type, coalesce(p_payload, '{}'::jsonb), v_signature, 1, 'PENDING', now()
    );

    v_enqueued := v_enqueued + 1;
  end loop;

  return v_enqueued;
end;
$$;

create or replace view public.platform_usage_summary as
select
  tenant_id,
  metric_code,
  date_trunc('month', created_at) as usage_month,
  sum(quantity) as total_quantity,
  count(*) as events_count
from public.platform_usage_events
group by tenant_id, metric_code, date_trunc('month', created_at);

create or replace function public.platform_get_usage_metrics(
  p_tenant_id uuid,
  p_from timestamptz default (date_trunc('month', now())),
  p_to timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'metric_code', metric_code,
    'total_quantity', total_quantity,
    'events_count', events_count,
    'usage_month', usage_month
  )), '[]'::jsonb)
  into v_usage
  from (
    select
      metric_code,
      date_trunc('month', created_at) as usage_month,
      sum(quantity) as total_quantity,
      count(*) as events_count
    from public.platform_usage_events
    where tenant_id = p_tenant_id
      and created_at >= p_from
      and created_at <= p_to
    group by metric_code, date_trunc('month', created_at)
    order by usage_month desc, metric_code
  ) t;

  return jsonb_build_object('tenant_id', p_tenant_id, 'from', p_from, 'to', p_to, 'usage', v_usage);
end;
$$;
