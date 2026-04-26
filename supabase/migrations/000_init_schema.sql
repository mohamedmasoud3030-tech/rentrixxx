-- 000_init_schema.sql
-- Non-destructive baseline schema for live production alignment.
-- Source of truth is the current production DB; this file is an idempotent consolidation target.

create extension if not exists pgcrypto;

-- ============================================================
-- CORE (users, profiles, tenants)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key,
  username text,
  role text check (role in ('ADMIN','USER')),
  must_change_password boolean default false,
  is_disabled boolean default false,
  created_at bigint
);

create table if not exists public.tenants (
  id uuid primary key,
  name text not null,
  phone text not null,
  email text,
  nationality text,
  id_no text not null,
  tenant_type text,
  cr_number text,
  address text,
  postal_code text,
  po_box text,
  status text not null,
  notes text default '',
  is_demo boolean,
  organization_id uuid,
  created_at bigint not null,
  updated_at bigint
);
create index if not exists idx_tenants_phone on public.tenants (phone);
create index if not exists idx_tenants_organization_id on public.tenants (organization_id);

create table if not exists public.settings (
  id integer primary key,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.governance (
  id integer primary key,
  read_only boolean not null default false,
  locked_periods text[]
);

create table if not exists public.serials (
  id integer primary key,
  receipt integer default 0,
  expense integer default 0,
  maintenance integer default 0,
  invoice integer default 0,
  lead integer default 0,
  owner_settlement integer default 0,
  journal_entry integer default 0,
  mission integer default 0,
  contract integer default 0
);

create table if not exists public.organizations (
  id uuid primary key,
  name text,
  created_at timestamptz default now()
);

create table if not exists public.memberships (
  id uuid primary key,
  user_id uuid,
  organization_id uuid,
  role text,
  created_at timestamptz default now()
);

create table if not exists public.roles (
  id uuid primary key,
  name text unique,
  created_at timestamptz default now()
);

create table if not exists public.permissions (
  id uuid primary key,
  key text unique,
  created_at timestamptz default now()
);

create table if not exists public.role_permissions (
  role_id uuid,
  permission_id uuid,
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid,
  role_id uuid,
  primary key (user_id, role_id)
);

-- ============================================================
-- PROPERTY (properties, units, owners, contracts)
-- ============================================================
create table if not exists public.owners (
  id uuid primary key,
  name text not null,
  phone text not null,
  email text,
  address text,
  bank_name text,
  bank_account_number text,
  management_contract_date date,
  notes text default '',
  commission_type text not null,
  commission_value numeric not null default 0,
  portal_token text,
  is_demo boolean,
  organization_id uuid,
  created_at bigint not null,
  updated_at bigint
);
create index if not exists idx_owners_organization_id on public.owners (organization_id);

create table if not exists public.properties (
  id uuid primary key,
  owner_id uuid,
  name text not null,
  type text not null,
  location text not null,
  area numeric,
  year_built integer,
  facilities text,
  notes text default '',
  is_demo boolean,
  organization_id uuid,
  created_at bigint not null,
  updated_at bigint
);
create index if not exists idx_properties_owner_id on public.properties (owner_id);

create table if not exists public.units (
  id uuid primary key,
  property_id uuid,
  name text not null,
  type text not null,
  floor text,
  status text not null,
  rent_default numeric not null default 0,
  min_rent numeric,
  area numeric,
  bedrooms integer,
  bathrooms integer,
  kitchens integer,
  living_rooms integer,
  water_meter text,
  electricity_meter text,
  features text,
  notes text default '',
  is_demo boolean,
  organization_id uuid,
  created_at bigint not null,
  updated_at bigint
);
create index if not exists idx_units_property_id on public.units (property_id);

create table if not exists public.contracts (
  id uuid primary key,
  no text,
  unit_id uuid,
  tenant_id uuid,
  rent_amount numeric not null,
  due_day integer not null,
  start_date date not null,
  end_date date not null,
  deposit numeric not null default 0,
  status text not null,
  sponsor_name text,
  sponsor_id text,
  sponsor_phone text,
  is_demo boolean,
  organization_id uuid,
  deleted_at timestamptz,
  ended_at timestamptz,
  created_at bigint not null,
  updated_at bigint
);
create index if not exists idx_contracts_unit_id on public.contracts (unit_id);
create index if not exists idx_contracts_tenant_id on public.contracts (tenant_id);
create index if not exists idx_contracts_organization_id on public.contracts (organization_id);
create index if not exists idx_contracts_tenant_status_active on public.contracts (tenant_id, status) where deleted_at is null;

-- ============================================================
-- FINANCIAL (accounts, journal_entries, balances, invoices, receipts)
-- ============================================================
create table if not exists public.accounts (
  id uuid primary key,
  code text,
  name text not null,
  type text,
  parent_id uuid,
  is_active boolean default true,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.journal_entries (
  id uuid primary key,
  no text,
  date date,
  account_id uuid,
  amount numeric not null,
  type text not null,
  source_id text,
  entity_type text,
  entity_id text,
  created_at bigint,
  updated_at bigint
);
create index if not exists idx_journal_entries_account_id on public.journal_entries (account_id);

create table if not exists public.invoices (
  id uuid primary key,
  no text not null,
  contract_id uuid,
  due_date date not null,
  amount numeric not null,
  tax_amount numeric,
  paid_amount numeric not null default 0,
  status text not null,
  type text not null,
  notes text default '',
  related_invoice_id uuid,
  payment_method text,
  external_payment_ref text,
  created_at bigint not null,
  updated_at bigint
);
create index if not exists idx_invoices_contract_id on public.invoices (contract_id);
create index if not exists idx_invoices_status on public.invoices (status);

create table if not exists public.receipts (
  id uuid primary key,
  no text not null,
  contract_id uuid,
  date_time timestamptz not null,
  channel text not null,
  amount numeric not null,
  ref text default '',
  notes text default '',
  status text not null,
  check_number text,
  check_bank text,
  check_date date,
  check_status text,
  voided_at bigint,
  request_id text,
  created_at bigint not null,
  updated_at bigint
);
create index if not exists idx_receipts_contract_id on public.receipts (contract_id);
create unique index if not exists receipts_request_id_unique_idx on public.receipts (request_id) where request_id is not null;

create table if not exists public.receipt_allocations (
  id uuid primary key,
  receipt_id uuid,
  invoice_id uuid,
  amount numeric not null,
  created_at bigint,
  updated_at bigint
);
create index if not exists idx_receipt_allocations_receipt_id on public.receipt_allocations (receipt_id);
create index if not exists idx_receipt_allocations_invoice_id on public.receipt_allocations (invoice_id);

create table if not exists public.owner_balances (
  id uuid primary key,
  owner_id uuid,
  total_income numeric default 0,
  total_expenses numeric default 0,
  commission numeric default 0,
  net_balance numeric default 0,
  updated_at bigint
);

create table if not exists public.contract_balances (
  id uuid primary key,
  contract_id uuid,
  balance_due numeric default 0,
  updated_at bigint
);

create table if not exists public.tenant_balances (
  id uuid primary key,
  tenant_id uuid,
  balance_due numeric default 0,
  updated_at bigint
);

create table if not exists public.account_balances (
  id uuid primary key,
  account_id uuid,
  period text,
  opening_balance numeric default 0,
  debit_total numeric default 0,
  credit_total numeric default 0,
  closing_balance numeric default 0,
  updated_at bigint
);

create table if not exists public.deposit_txs (
  id uuid primary key,
  contract_id uuid,
  type text,
  amount numeric,
  notes text,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.owner_settlements (
  id uuid primary key,
  owner_id uuid,
  period text,
  gross_collections numeric default 0,
  expenses numeric default 0,
  commission numeric default 0,
  payable numeric default 0,
  status text,
  created_at bigint,
  updated_at bigint
);

-- Billing extension tables
create table if not exists public.plans (
  id uuid primary key,
  name text,
  monthly_price numeric,
  yearly_price numeric,
  created_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key,
  organization_id uuid,
  plan_id uuid,
  status text,
  starts_at timestamptz,
  ends_at timestamptz
);

create table if not exists public.invoices_billing (
  id uuid primary key,
  subscription_id uuid,
  amount numeric,
  status text,
  due_at timestamptz
);

create table if not exists public.usage_limits (
  id uuid primary key,
  organization_id uuid,
  metric text,
  used_count integer,
  limit_count integer
);

-- ============================================================
-- OPERATIONS (maintenance_records, expenses, utility_bills)
-- ============================================================
create table if not exists public.maintenance_records (
  id uuid primary key,
  no text,
  unit_id uuid,
  request_date date,
  description text,
  status text,
  priority text,
  assigned_to uuid,
  cost numeric default 0,
  charged_to text,
  completion_date date,
  expense_id uuid,
  invoice_id uuid,
  created_at bigint,
  completed_at bigint,
  updated_at bigint
);

create table if not exists public.expenses (
  id uuid primary key,
  no text,
  contract_id uuid,
  owner_id uuid,
  property_id uuid,
  payee text,
  date_time timestamptz,
  category text,
  amount numeric,
  tax_amount numeric,
  ref text,
  notes text,
  status text,
  charged_to text,
  voided_at bigint,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.utility_bills (
  id uuid primary key,
  unit_id uuid,
  provider text,
  bill_type text,
  period_start date,
  period_end date,
  amount numeric,
  due_date date,
  status text,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.attachments (
  id uuid primary key,
  entity_type text,
  entity_id uuid,
  file_name text,
  file_path text,
  mime_type text,
  size_bytes bigint,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.missions (
  id uuid primary key,
  title text,
  description text,
  status text,
  assignee_id uuid,
  due_date date,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.budgets (
  id uuid primary key,
  name text,
  period text,
  amount numeric,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.commissions (
  id uuid primary key,
  owner_id uuid,
  contract_id uuid,
  rate numeric,
  amount numeric,
  period text,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.leads (
  id uuid primary key,
  name text,
  phone text,
  source text,
  status text,
  notes text,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.lands (
  id uuid primary key,
  owner_id uuid,
  name text,
  location text,
  area numeric,
  notes text,
  created_at bigint,
  updated_at bigint
);

-- ============================================================
-- SYSTEM (audit_log, notifications, automation_jobs, governance)
-- ============================================================
create table if not exists public.audit_log (
  id uuid primary key,
  actor_id uuid,
  action text,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at bigint
);

create table if not exists public.notification_templates (
  id uuid primary key,
  key text,
  channel text,
  template text,
  is_active boolean default true,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.outgoing_notifications (
  id uuid primary key,
  template_id uuid,
  recipient text,
  payload jsonb,
  status text,
  sent_at bigint,
  created_at bigint
);

create table if not exists public.app_notifications (
  id uuid primary key,
  user_id uuid,
  title text,
  body text,
  read_at bigint,
  created_at bigint
);

create table if not exists public.auto_backups (
  id uuid primary key,
  status text,
  storage_path text,
  created_at bigint,
  updated_at bigint
);

create table if not exists public.automation_runs (
  id uuid primary key,
  ts bigint,
  invoices_created integer,
  late_fees_applied integer,
  notifications_created integer,
  snapshots_rebuilt boolean,
  error text
);

-- ============================================================
-- REPORTING (views, snapshots, kpi)
-- ============================================================
create table if not exists public.snapshots (
  id uuid primary key,
  snapshot_date date,
  payload jsonb,
  created_at bigint
);

create table if not exists public.kpi_snapshots (
  id uuid primary key,
  snapshot_date date,
  occupancy_rate numeric,
  collection_rate numeric,
  payload jsonb,
  created_at bigint
);

create or replace view public.vw_properties_with_owners as
select
  p.*,
  o.name as owner_name,
  o.phone as owner_phone,
  o.email as owner_email
from public.properties p
left join public.owners o on o.id = p.owner_id;

create or replace view public.vw_units_with_property_owner as
select
  u.*,
  p.name as property_name,
  p.owner_id,
  o.name as owner_name
from public.units u
left join public.properties p on p.id = u.property_id
left join public.owners o on o.id = p.owner_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'units_full' AND c.relkind = 'r'
  ) THEN
    EXECUTE $v$
      create or replace view public.units_full as
      select
        u.*,
        p.name as property_name,
        o.id as owner_id,
        o.name as owner_name
      from public.units u
      left join public.properties p on p.id = u.property_id
      left join public.owners o on o.id = p.owner_id
    $v$;
  END IF;
END;
$$;

-- ============================================================
-- FUNCTIONS & TRIGGERS (kept idempotent and non-destructive)
-- ============================================================
create or replace function public.guard_contract_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_count integer;
  v_receipt_count integer;
begin
  select count(*) into v_invoice_count from public.invoices where contract_id = old.id;
  select count(*) into v_receipt_count from public.receipts where contract_id = old.id;

  if v_invoice_count > 0 or v_receipt_count > 0 then
    raise exception 'Cannot delete contract with linked financial records. Use soft delete instead.';
  end if;

  return old;
end;
$$;

drop trigger if exists before_contract_hard_delete on public.contracts;
create trigger before_contract_hard_delete
before delete on public.contracts
for each row
execute function public.guard_contract_delete();

-- Design issue notes (intentional: do NOT auto-fix in baseline):
-- 1) Notification concepts are split across app_notifications and outgoing_notifications (possible overlap).
-- 2) Balance concepts exist at multiple levels (owner_balances, contract_balances, tenant_balances, account_balances).
-- 3) Mixed timestamp strategy exists (bigint epoch vs timestamptz/date) and should be standardized in a future migration.
-- 4) Some historical migrations refer to payments/maintenance tables while app code uses receipts/maintenance_records.
