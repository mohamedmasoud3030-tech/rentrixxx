-- Single-office hardening migration after audit

-- Remove lingering organization-scoped indexes safely
DROP INDEX IF EXISTS public.idx_tenants_organization_id;
DROP INDEX IF EXISTS public.idx_owners_organization_id;
DROP INDEX IF EXISTS public.idx_contracts_organization_id;
DROP INDEX IF EXISTS public.idx_units_organization_id;
DROP INDEX IF EXISTS public.idx_properties_organization_id;

-- Ensure legacy migrations cannot reintroduce org columns in current DB state
ALTER TABLE IF EXISTS public.tenants DROP COLUMN IF EXISTS organization_id;
ALTER TABLE IF EXISTS public.owners DROP COLUMN IF EXISTS organization_id;
ALTER TABLE IF EXISTS public.properties DROP COLUMN IF EXISTS organization_id;
ALTER TABLE IF EXISTS public.units DROP COLUMN IF EXISTS organization_id;
ALTER TABLE IF EXISTS public.contracts DROP COLUMN IF EXISTS organization_id;

-- Remove SaaS tables if they were recreated in any environment
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.invoices_billing CASCADE;

-- Simplify old helper function references
DROP FUNCTION IF EXISTS public.current_organization_id() CASCADE;
