-- =====================================
-- FIX: DATA NOT SHOWING IN APP (RLS)
-- =====================================

-- Disable RLS temporarily to confirm issue
alter table if exists tenants disable row level security;
alter table if exists invoices disable row level security;
alter table if exists payments disable row level security;
alter table if exists contracts disable row level security;
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

-- =====================================
-- SAFE MODE: ENABLE WITH PUBLIC READ ACCESS
-- =====================================

-- Tenants
alter table tenants enable row level security;
drop policy if exists "public_read_tenants" on tenants;
create policy "public_read_tenants"
on tenants
for select
using (true);

-- Invoices
alter table invoices enable row level security;
drop policy if exists "public_read_invoices" on invoices;
create policy "public_read_invoices"
on invoices
for select
using (true);

-- Payments
alter table payments enable row level security;
drop policy if exists "public_read_payments" on payments;
create policy "public_read_payments"
on payments
for select
using (true);

-- Contracts
alter table contracts enable row level security;
drop policy if exists "public_read_contracts" on contracts;
create policy "public_read_contracts"
on contracts
for select
using (true);

-- Automation Runs
-- Supports both schemas: a real automation_runs table or legacy automation_run_logs table
DO $$
BEGIN
  IF to_regclass('public.automation_runs') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'automation_runs' AND c.relkind = 'r'
     ) THEN
    ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_read_automation_runs" ON public.automation_runs;
    CREATE POLICY "public_read_automation_runs"
    ON public.automation_runs
    FOR SELECT
    USING (true);
  ELSIF to_regclass('public.automation_run_logs') IS NOT NULL THEN
    ALTER TABLE public.automation_run_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "public_read_automation_run_logs" ON public.automation_run_logs;
    CREATE POLICY "public_read_automation_run_logs"
    ON public.automation_run_logs
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- =====================================
-- OPTIONAL: allow insert/update (for app functionality)
-- =====================================

-- Tenants write access
create policy "public_insert_tenants"
on tenants
for insert
with check (true);

create policy "public_update_tenants"
on tenants
for update
using (true);

-- Invoices write access
create policy "public_insert_invoices"
on invoices
for insert
with check (true);

create policy "public_update_invoices"
on invoices
for update
using (true);

-- Payments write access
create policy "public_insert_payments"
on payments
for insert
with check (true);

create policy "public_update_payments"
on payments
for update
using (true);

-- =====================================
-- END FIX
-- =====================================