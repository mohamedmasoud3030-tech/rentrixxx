-- =====================================
-- FINAL STABILIZATION (ONE-SHOT FIX)
-- =====================================

-- 1. Ensure base tables exist with minimal structure
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamp default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  amount numeric default 0,
  created_at timestamp default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid,
  amount numeric default 0,
  created_at timestamp default now()
);

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp default now()
);

-- 2. Fix automation_runs fully
do $$
begin
  if to_regclass('public.automation_runs') is null then
    create table public.automation_runs (
      id uuid primary key default gen_random_uuid(),
      status text,
      type text,
      created_at timestamp default now()
    );
  elsif exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'automation_runs' and c.relkind in ('v','m')
  ) and to_regclass('public.automation_run_logs') is not null then
    -- Legacy compatibility: keep alias view, use source table for writes
    null;
  end if;
end $$;

create or replace view automation_runs_view as
select * from automation_runs;

-- 3. Force visibility (critical fix)
alter table tenants disable row level security;
alter table invoices disable row level security;
alter table payments disable row level security;
alter table contracts disable row level security;
do $$
begin
  if to_regclass('public.automation_runs') is not null
     and exists (
       select 1
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'automation_runs' and c.relkind = 'r'
     ) then
    alter table public.automation_runs disable row level security;
  elsif to_regclass('public.automation_run_logs') is not null then
    alter table public.automation_run_logs disable row level security;
  end if;
end $$;

-- 4. Fix RPC naming safely
create or replace function get_financial_summary(from_date date, to_date date)
returns jsonb
language sql
stable
as $$
  select public.rpt_financial_summary(from_date, to_date);
$$;

-- 5. Indexes for stability
alter table if exists tenants add column if not exists created_at timestamp default now();
alter table if exists invoices add column if not exists created_at timestamp default now();
alter table if exists payments add column if not exists created_at timestamp default now();

create index if not exists idx_tenants_created_at on tenants(created_at);
create index if not exists idx_invoices_created_at on invoices(created_at);
create index if not exists idx_payments_created_at on payments(created_at);

-- =====================================
-- DONE
-- =====================================
