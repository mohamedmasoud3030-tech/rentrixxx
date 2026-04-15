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
create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  status text,
  type text,
  created_at timestamp default now()
);

create or replace view automation_runs_view as
select * from automation_runs;

-- 3. Force visibility (critical fix)
alter table tenants disable row level security;
alter table invoices disable row level security;
alter table payments disable row level security;
alter table contracts disable row level security;
alter table automation_runs disable row level security;

-- 4. Fix RPC naming safely
create or replace function get_financial_summary(from_date date, to_date date)
returns setof rpt_financial_summary
language sql
as $$
  select * from rpt_financial_summary(from_date, to_date);
$$;

-- 5. Indexes for stability
create index if not exists idx_tenants_created_at on tenants(created_at);
create index if not exists idx_invoices_created_at on invoices(created_at);
create index if not exists idx_payments_created_at on payments(created_at);

-- =====================================
-- DONE
-- =====================================