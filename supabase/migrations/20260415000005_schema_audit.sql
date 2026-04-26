-- =============================
-- SUPABASE SCHEMA AUDIT FIXES
-- =============================

-- 1. Ensure created_at exists everywhere important
alter table if exists tenants add column if not exists created_at timestamp default now();
alter table if exists invoices add column if not exists created_at timestamp default now();
alter table if exists payments add column if not exists created_at timestamp default now();
alter table if exists contracts add column if not exists created_at timestamp default now();

-- 2. Indexes for performance
create index if not exists idx_tenants_created_at on tenants(created_at);
create index if not exists idx_invoices_created_at on invoices(created_at);
create index if not exists idx_payments_created_at on payments(created_at);

-- Foreign key indexes
create index if not exists idx_invoices_tenant_id on invoices(tenant_id);
create index if not exists idx_payments_invoice_id on payments(invoice_id);

-- 3. Prevent NULL critical fields
alter table tenants alter column name set not null;
alter table invoices alter column amount set not null;
alter table payments alter column amount set not null;

-- 4. Add basic constraints
alter table invoices add constraint invoices_amount_check check (amount >= 0);
alter table payments add constraint payments_amount_check check (amount >= 0);

-- 5. Updated_at auto trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- apply trigger if table has updated_at
DO $$
begin
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='updated_at') THEN
    DROP TRIGGER IF EXISTS trg_tenants_updated_at on tenants;
    CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- 6. Safe RPC wrapper (avoid crashes)
create or replace function safe_rpt_financial_summary(from_date date, to_date date)
returns jsonb
language plpgsql
as $$
begin
  return public.rpt_financial_summary(from_date, to_date);
exception when others then
  return null;
end;
$$;

-- 7. Ensure automation_runs has index for ordering
create index if not exists idx_automation_runs_created_at on automation_runs(created_at);

-- =============================
-- END OF AUDIT
-- =============================