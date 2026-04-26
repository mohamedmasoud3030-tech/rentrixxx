-- 001_future_changes.sql
-- Forward-safe, non-destructive, idempotent additions only.

-- Standard operational metadata (soft compatibility)
alter table if exists public.properties add column if not exists archived_at timestamptz;
alter table if exists public.units add column if not exists archived_at timestamptz;
alter table if exists public.tenants add column if not exists archived_at timestamptz;
alter table if exists public.owners add column if not exists archived_at timestamptz;

-- Correlation / observability IDs
alter table if exists public.invoices add column if not exists request_id text;
alter table if exists public.expenses add column if not exists request_id text;
alter table if exists public.journal_entries add column if not exists request_id text;

create index if not exists idx_invoices_request_id on public.invoices (request_id) where request_id is not null;
create index if not exists idx_expenses_request_id on public.expenses (request_id) where request_id is not null;
create index if not exists idx_journal_entries_request_id on public.journal_entries (request_id) where request_id is not null;

-- Performance safety indexes for common relations
create index if not exists idx_units_organization_id on public.units (organization_id);
create index if not exists idx_properties_organization_id on public.properties (organization_id);
create index if not exists idx_contracts_deleted_at on public.contracts (deleted_at);
create index if not exists idx_receipts_date_time on public.receipts (date_time);
create index if not exists idx_expenses_date_time on public.expenses (date_time);

-- Reporting scaffolding (non-destructive)
create table if not exists public.schema_refactor_notes (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  note text not null,
  created_at timestamptz not null default now()
);

-- Optional quality guards without altering existing rows
alter table if exists public.receipts
  add constraint receipts_amount_non_negative_chk
  check (amount >= 0) not valid;

alter table if exists public.invoices
  add constraint invoices_amount_non_negative_chk
  check (amount >= 0) not valid;

-- NOTE: constraints are added as NOT VALID to avoid blocking/rewriting legacy data.
-- Validation can be done later during planned maintenance windows.
