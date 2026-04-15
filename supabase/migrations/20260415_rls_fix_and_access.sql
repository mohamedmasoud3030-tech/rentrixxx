-- =====================================
-- FIX: DATA NOT SHOWING IN APP (RLS)
-- =====================================

-- Disable RLS temporarily to confirm issue
alter table if exists tenants disable row level security;
alter table if exists invoices disable row level security;
alter table if exists payments disable row level security;
alter table if exists contracts disable row level security;
alter table if exists automation_runs disable row level security;

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
alter table automation_runs enable row level security;
drop policy if exists "public_read_automation_runs" on automation_runs;
create policy "public_read_automation_runs"
on automation_runs
for select
using (true);

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