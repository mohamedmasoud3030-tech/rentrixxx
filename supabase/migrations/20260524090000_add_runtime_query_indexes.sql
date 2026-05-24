-- Additive runtime query index hardening for active app paths.

create index if not exists idx_people_active_created_at
  on public.people (created_at desc, id)
  where deleted_at is null;

create index if not exists idx_units_active_property_unit_number
  on public.units (property_id, unit_number)
  where deleted_at is null;

create index if not exists idx_contracts_active_status_created_at
  on public.contracts (status, created_at desc)
  where deleted_at is null;

create index if not exists idx_contracts_active_property_id
  on public.contracts (property_id)
  where deleted_at is null;

create index if not exists idx_contracts_active_tenant_id
  on public.contracts (tenant_id)
  where deleted_at is null;

create index if not exists idx_invoices_active_due_date
  on public.invoices (due_date desc)
  where deleted_at is null;

create index if not exists idx_invoices_active_status_due_date
  on public.invoices (status, due_date desc)
  where deleted_at is null;

create index if not exists idx_invoices_active_contract_id
  on public.invoices (contract_id)
  where deleted_at is null;

create index if not exists idx_payments_active_invoice_date
  on public.payments (invoice_id, payment_date desc)
  where deleted_at is null;

create index if not exists idx_payments_active_contract_date
  on public.payments (contract_id, payment_date desc)
  where deleted_at is null;
