-- Single-office simplification for Rentrix
-- Removes SaaS multi-tenant and billing-platform complexity while preserving core PMS modules.

-- 1) Drop SaaS/platform tables first
DROP TABLE IF EXISTS public.platform_billing_events CASCADE;
DROP TABLE IF EXISTS public.platform_subscriptions CASCADE;
DROP TABLE IF EXISTS public.invoices_billing CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.invitations CASCADE;

-- 2) Remove organization scoping from core tables
ALTER TABLE IF EXISTS public.owners DROP COLUMN IF EXISTS organization_id;
ALTER TABLE IF EXISTS public.tenants DROP COLUMN IF EXISTS organization_id;
ALTER TABLE IF EXISTS public.properties DROP COLUMN IF EXISTS organization_id;
ALTER TABLE IF EXISTS public.units DROP COLUMN IF EXISTS organization_id;
ALTER TABLE IF EXISTS public.contracts DROP COLUMN IF EXISTS organization_id;
ALTER TABLE IF EXISTS public.payments DROP COLUMN IF EXISTS organization_id;
ALTER TABLE IF EXISTS public.expenses DROP COLUMN IF EXISTS organization_id;

-- 3) Remove obsolete multitenant helper routines/policies if present
DROP FUNCTION IF EXISTS public.current_organization_id() CASCADE;

-- 4) Ensure simple app roles only
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'accountant', 'staff');
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'staff';

-- 5) Recreate key indexes (single office, no org dimension)
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_unit_id ON public.contracts(unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON public.payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON public.expenses(property_id);
