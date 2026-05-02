-- Recover missing baseline schema in environments where initial migrations were never applied.
-- Safe/idempotent: only CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Core entities
-- -----------------------------------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid()
);
alter table public.tenants add column if not exists name text;
alter table public.tenants add column if not exists phone text;
alter table public.tenants add column if not exists email text;
alter table public.tenants add column if not exists nationality text;
alter table public.tenants add column if not exists id_no text;
alter table public.tenants add column if not exists tenant_type text;
alter table public.tenants add column if not exists cr_number text;
alter table public.tenants add column if not exists address text;
alter table public.tenants add column if not exists postal_code text;
alter table public.tenants add column if not exists po_box text;
alter table public.tenants add column if not exists status text;
alter table public.tenants add column if not exists notes text default '';
alter table public.tenants add column if not exists is_demo boolean;
alter table public.tenants add column if not exists organization_id uuid;
alter table public.tenants add column if not exists created_at bigint;
alter table public.tenants add column if not exists updated_at bigint;
create index if not exists idx_tenants_phone on public.tenants (phone);
create index if not exists idx_tenants_organization_id on public.tenants (organization_id);

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid()
);
alter table public.owners add column if not exists name text;
alter table public.owners add column if not exists phone text;
alter table public.owners add column if not exists email text;
alter table public.owners add column if not exists address text;
alter table public.owners add column if not exists bank_name text;
alter table public.owners add column if not exists bank_account_number text;
alter table public.owners add column if not exists management_contract_date date;
alter table public.owners add column if not exists notes text default '';
alter table public.owners add column if not exists commission_type text;
alter table public.owners add column if not exists commission_value numeric default 0;
alter table public.owners add column if not exists portal_token text;
alter table public.owners add column if not exists is_demo boolean;
alter table public.owners add column if not exists organization_id uuid;
alter table public.owners add column if not exists created_at bigint;
alter table public.owners add column if not exists updated_at bigint;
create index if not exists idx_owners_organization_id on public.owners (organization_id);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid()
);
alter table public.properties add column if not exists owner_id uuid;
alter table public.properties add column if not exists name text;
alter table public.properties add column if not exists type text;
alter table public.properties add column if not exists location text;
alter table public.properties add column if not exists area numeric;
alter table public.properties add column if not exists year_built integer;
alter table public.properties add column if not exists facilities text;
alter table public.properties add column if not exists notes text default '';
alter table public.properties add column if not exists is_demo boolean;
alter table public.properties add column if not exists organization_id uuid;
alter table public.properties add column if not exists created_at bigint;
alter table public.properties add column if not exists updated_at bigint;
create index if not exists idx_properties_owner_id on public.properties (owner_id);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid()
);
alter table public.units add column if not exists property_id uuid;
alter table public.units add column if not exists name text;
alter table public.units add column if not exists type text;
alter table public.units add column if not exists floor text;
alter table public.units add column if not exists status text;
alter table public.units add column if not exists rent_default numeric default 0;
alter table public.units add column if not exists min_rent numeric;
alter table public.units add column if not exists area numeric;
alter table public.units add column if not exists bedrooms integer;
alter table public.units add column if not exists bathrooms integer;
alter table public.units add column if not exists kitchens integer;
alter table public.units add column if not exists living_rooms integer;
alter table public.units add column if not exists water_meter text;
alter table public.units add column if not exists electricity_meter text;
alter table public.units add column if not exists features text;
alter table public.units add column if not exists notes text default '';
alter table public.units add column if not exists is_demo boolean;
alter table public.units add column if not exists organization_id uuid;
alter table public.units add column if not exists created_at bigint;
alter table public.units add column if not exists updated_at bigint;
create index if not exists idx_units_property_id on public.units (property_id);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid()
);
alter table public.contracts add column if not exists no text;
alter table public.contracts add column if not exists unit_id uuid;
alter table public.contracts add column if not exists tenant_id uuid;
alter table public.contracts add column if not exists rent_amount numeric;
alter table public.contracts add column if not exists due_day integer;
alter table public.contracts add column if not exists start_date date;
alter table public.contracts add column if not exists end_date date;
alter table public.contracts add column if not exists deposit numeric default 0;
alter table public.contracts add column if not exists status text;
alter table public.contracts add column if not exists sponsor_name text;
alter table public.contracts add column if not exists sponsor_id text;
alter table public.contracts add column if not exists sponsor_phone text;
alter table public.contracts add column if not exists is_demo boolean;
alter table public.contracts add column if not exists organization_id uuid;
alter table public.contracts add column if not exists deleted_at timestamptz;
alter table public.contracts add column if not exists ended_at timestamptz;
alter table public.contracts add column if not exists created_at bigint;
alter table public.contracts add column if not exists updated_at bigint;
create index if not exists idx_contracts_unit_id on public.contracts (unit_id);
create index if not exists idx_contracts_tenant_id on public.contracts (tenant_id);
create index if not exists idx_contracts_organization_id on public.contracts (organization_id);

-- -----------------------------------------------------------------------------
-- Financial core
-- -----------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid()
);
alter table public.accounts add column if not exists code text;
alter table public.accounts add column if not exists name text;
alter table public.accounts add column if not exists type text;
alter table public.accounts add column if not exists parent_id uuid;
alter table public.accounts add column if not exists is_active boolean default true;
alter table public.accounts add column if not exists created_at bigint;
alter table public.accounts add column if not exists updated_at bigint;

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid()
);
alter table public.journal_entries add column if not exists no text;
alter table public.journal_entries add column if not exists date date;
alter table public.journal_entries add column if not exists account_id uuid;
alter table public.journal_entries add column if not exists amount numeric;
alter table public.journal_entries add column if not exists type text;
alter table public.journal_entries add column if not exists source_id text;
alter table public.journal_entries add column if not exists entity_type text;
alter table public.journal_entries add column if not exists entity_id text;
alter table public.journal_entries add column if not exists created_at bigint;
alter table public.journal_entries add column if not exists updated_at bigint;
create index if not exists idx_journal_entries_account_id on public.journal_entries (account_id);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid()
);
alter table public.invoices add column if not exists no text;
alter table public.invoices add column if not exists contract_id uuid;
alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists amount numeric;
alter table public.invoices add column if not exists tax_amount numeric;
alter table public.invoices add column if not exists paid_amount numeric default 0;
alter table public.invoices add column if not exists status text;
alter table public.invoices add column if not exists type text;
alter table public.invoices add column if not exists notes text default '';
alter table public.invoices add column if not exists related_invoice_id uuid;
alter table public.invoices add column if not exists payment_method text;
alter table public.invoices add column if not exists external_payment_ref text;
alter table public.invoices add column if not exists created_at bigint;
alter table public.invoices add column if not exists updated_at bigint;
create index if not exists idx_invoices_contract_id on public.invoices (contract_id);
create index if not exists idx_invoices_status on public.invoices (status);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid()
);
alter table public.receipts add column if not exists no text;
alter table public.receipts add column if not exists contract_id uuid;
alter table public.receipts add column if not exists date_time timestamptz;
alter table public.receipts add column if not exists channel text;
alter table public.receipts add column if not exists amount numeric;
alter table public.receipts add column if not exists ref text default '';
alter table public.receipts add column if not exists notes text default '';
alter table public.receipts add column if not exists status text;
alter table public.receipts add column if not exists check_number text;
alter table public.receipts add column if not exists check_bank text;
alter table public.receipts add column if not exists check_date date;
alter table public.receipts add column if not exists check_status text;
alter table public.receipts add column if not exists voided_at bigint;
alter table public.receipts add column if not exists request_id text;
alter table public.receipts add column if not exists created_at bigint;
alter table public.receipts add column if not exists updated_at bigint;
create index if not exists idx_receipts_contract_id on public.receipts (contract_id);
create unique index if not exists receipts_request_id_unique_idx on public.receipts (request_id) where request_id is not null;

create table if not exists public.receipt_allocations (
  id uuid primary key default gen_random_uuid()
);
alter table public.receipt_allocations add column if not exists receipt_id uuid;
alter table public.receipt_allocations add column if not exists invoice_id uuid;
alter table public.receipt_allocations add column if not exists amount numeric;
alter table public.receipt_allocations add column if not exists created_at bigint;
alter table public.receipt_allocations add column if not exists updated_at bigint;
create index if not exists idx_receipt_allocations_receipt_id on public.receipt_allocations (receipt_id);
create index if not exists idx_receipt_allocations_invoice_id on public.receipt_allocations (invoice_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid()
);
alter table public.expenses add column if not exists no text;
alter table public.expenses add column if not exists contract_id uuid;
alter table public.expenses add column if not exists owner_id uuid;
alter table public.expenses add column if not exists property_id uuid;
alter table public.expenses add column if not exists payee text;
alter table public.expenses add column if not exists date_time timestamptz;
alter table public.expenses add column if not exists category text;
alter table public.expenses add column if not exists amount numeric;
alter table public.expenses add column if not exists tax_amount numeric;
alter table public.expenses add column if not exists ref text;
alter table public.expenses add column if not exists notes text;
alter table public.expenses add column if not exists status text;
alter table public.expenses add column if not exists charged_to text;
alter table public.expenses add column if not exists voided_at bigint;
alter table public.expenses add column if not exists created_at bigint;
alter table public.expenses add column if not exists updated_at bigint;

create table if not exists public.owner_settlements (
  id uuid primary key default gen_random_uuid()
);
alter table public.owner_settlements add column if not exists owner_id uuid;
alter table public.owner_settlements add column if not exists period text;
alter table public.owner_settlements add column if not exists gross_collections numeric default 0;
alter table public.owner_settlements add column if not exists expenses numeric default 0;
alter table public.owner_settlements add column if not exists commission numeric default 0;
alter table public.owner_settlements add column if not exists payable numeric default 0;
alter table public.owner_settlements add column if not exists status text;
alter table public.owner_settlements add column if not exists created_at bigint;
alter table public.owner_settlements add column if not exists updated_at bigint;

-- Utility table used by UI/ops flows
create table if not exists public.utility_bills (
  id uuid primary key default gen_random_uuid()
);
alter table public.utility_bills add column if not exists unit_id uuid;
alter table public.utility_bills add column if not exists provider text;
alter table public.utility_bills add column if not exists bill_type text;
alter table public.utility_bills add column if not exists period_start date;
alter table public.utility_bills add column if not exists period_end date;
alter table public.utility_bills add column if not exists amount numeric;
alter table public.utility_bills add column if not exists due_date date;
alter table public.utility_bills add column if not exists status text;
alter table public.utility_bills add column if not exists created_at bigint;
alter table public.utility_bills add column if not exists updated_at bigint;

-- Supporting system table required by automation
create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid()
);
alter table public.automation_runs add column if not exists ts bigint;
alter table public.automation_runs add column if not exists invoices_created integer;
alter table public.automation_runs add column if not exists late_fees_applied integer;
alter table public.automation_runs add column if not exists notifications_created integer;
alter table public.automation_runs add column if not exists snapshots_rebuilt boolean;
alter table public.automation_runs add column if not exists error text;
