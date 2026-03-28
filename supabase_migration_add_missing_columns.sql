-- Migration: Add Missing Columns
-- This migration adds missing columns to tables to match TypeScript type definitions

-- ──────────────────────────────────────────────────────────────
-- 1. TENANTS TABLE - Add missing columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'INDIVIDUAL',
ADD COLUMN IF NOT EXISTS cr_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS po_box TEXT,
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at BIGINT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- ──────────────────────────────────────────────────────────────
-- 2. OWNERS TABLE - Add missing columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.owners
ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'INDIVIDUAL',
ADD COLUMN IF NOT EXISTS cr_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS po_box TEXT,
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at BIGINT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- ──────────────────────────────────────────────────────────────
-- 3. PROPERTIES TABLE - Add missing columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS updated_at BIGINT,
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- ──────────────────────────────────────────────────────────────
-- 4. UNITS TABLE - Add missing columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS rent_default NUMERIC,
ADD COLUMN IF NOT EXISTS min_rent NUMERIC,
ADD COLUMN IF NOT EXISTS bedrooms INTEGER,
ADD COLUMN IF NOT EXISTS bathrooms INTEGER,
ADD COLUMN IF NOT EXISTS kitchens INTEGER,
ADD COLUMN IF NOT EXISTS living_rooms INTEGER,
ADD COLUMN IF NOT EXISTS water_meter TEXT,
ADD COLUMN IF NOT EXISTS electricity_meter TEXT,
ADD COLUMN IF NOT EXISTS features TEXT,
ADD COLUMN IF NOT EXISTS updated_at BIGINT,
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- ──────────────────────────────────────────────────────────────
-- 5. CONTRACTS TABLE - Add missing columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS due_day INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS sponsor_name TEXT,
ADD COLUMN IF NOT EXISTS sponsor_id TEXT,
ADD COLUMN IF NOT EXISTS sponsor_phone TEXT,
ADD COLUMN IF NOT EXISTS updated_at BIGINT,
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- ──────────────────────────────────────────────────────────────
-- 6. INVOICES TABLE - Add missing columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS contract_id UUID,
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS related_invoice_id UUID,
ADD COLUMN IF NOT EXISTS updated_at BIGINT,
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- ──────────────────────────────────────────────────────────────
-- 7. RECEIPTS TABLE - Add missing columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.receipts
ADD COLUMN IF NOT EXISTS updated_at BIGINT,
ADD COLUMN IF NOT EXISTS voided_at BIGINT,
ADD COLUMN IF NOT EXISTS check_number TEXT,
ADD COLUMN IF NOT EXISTS check_bank TEXT,
ADD COLUMN IF NOT EXISTS check_date TEXT,
ADD COLUMN IF NOT EXISTS check_status TEXT;

-- ──────────────────────────────────────────────────────────────
-- 8. EXPENSES TABLE - Add missing columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS owner_id UUID,
ADD COLUMN IF NOT EXISTS payee TEXT,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC,
ADD COLUMN IF NOT EXISTS charged_to TEXT,
ADD COLUMN IF NOT EXISTS updated_at BIGINT,
ADD COLUMN IF NOT EXISTS voided_at BIGINT;

-- ──────────────────────────────────────────────────────────────
-- 9. MAINTENANCE_RECORDS TABLE - Add missing columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.maintenance_records
ADD COLUMN IF NOT EXISTS no TEXT,
ADD COLUMN IF NOT EXISTS charged_to TEXT DEFAULT 'OFFICE',
ADD COLUMN IF NOT EXISTS expense_id UUID,
ADD COLUMN IF NOT EXISTS invoice_id UUID,
ADD COLUMN IF NOT EXISTS completed_at BIGINT;

-- ──────────────────────────────────────────────────────────────
-- 10. UTILITY_BILLS TABLE - Create if missing
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.utility_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID,
    property_id UUID,
    type TEXT,
    month TEXT,
    previous_reading NUMERIC,
    current_reading NUMERIC,
    unit_price NUMERIC,
    amount NUMERIC,
    paid_by TEXT,
    notes TEXT,
    bill_image_url TEXT,
    bill_image_mime TEXT,
    created_at BIGINT
);
ALTER TABLE public.utility_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "utility_bills_all_auth" ON public.utility_bills FOR ALL USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- 11. DEPOSIT_TXS TABLE - Add missing columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.deposit_txs
ADD COLUMN IF NOT EXISTS contract_id UUID,
ADD COLUMN IF NOT EXISTS amount NUMERIC,
ADD COLUMN IF NOT EXISTS ref TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'POSTED',
ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- ──────────────────────────────────────────────────────────────
-- 12. OWNER_SETTLEMENTS TABLE - Add missing columns
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.owner_settlements
ADD COLUMN IF NOT EXISTS owner_id UUID,
ADD COLUMN IF NOT EXISTS month TEXT,
ADD COLUMN IF NOT EXISTS gross_amount NUMERIC,
ADD COLUMN IF NOT EXISTS expenses NUMERIC,
ADD COLUMN IF NOT EXISTS commission NUMERIC,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC,
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- ──────────────────────────────────────────────────────────────
-- 13. Add indexes for foreign keys
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_owners_status ON public.owners(status);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_unit_id ON public.contracts(unit_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON public.invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_expenses_owner_id ON public.expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_unit_id ON public.maintenance_records(unit_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_unit_id ON public.utility_bills(unit_id);
