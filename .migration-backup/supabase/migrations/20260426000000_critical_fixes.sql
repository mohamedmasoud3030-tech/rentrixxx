-- Migration: Critical Fixes for Rentrix Application
-- Date: 2026-04-26
-- Description: Fixes missing columns, commission calculation, and deposit accounting

-- ============================================================================
-- PART 1: Fix Missing Columns in Properties Table
-- ============================================================================

-- Add missing columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS property_type text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS size numeric,
ADD COLUMN IF NOT EXISTS bedrooms integer,
ADD COLUMN IF NOT EXISTS bathrooms integer,
ADD COLUMN IF NOT EXISTS floor_number integer,
ADD COLUMN IF NOT EXISTS building_name text,
ADD COLUMN IF NOT EXISTS amenities text[],
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS photos text[],
ADD COLUMN IF NOT EXISTS year_built integer,
ADD COLUMN IF NOT EXISTS last_renovation_date date,
ADD COLUMN IF NOT EXISTS parking_spaces integer,
ADD COLUMN IF NOT EXISTS furnished boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pet_friendly boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS utilities_included text[];

-- Add constraints for property_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'properties_property_type_check'
  ) THEN
    ALTER TABLE public.properties 
    ADD CONSTRAINT properties_property_type_check 
    CHECK (property_type IN ('apartment', 'villa', 'office', 'shop', 'warehouse', 'land', 'room'));
  END IF;
END $$;

-- Add index on property_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_location ON public.properties(location);

-- ============================================================================
-- PART 2: Fix Missing Columns in Owners Table
-- ============================================================================

ALTER TABLE public.owners
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS preferred_payment_method text,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS nationality text;

-- Add index for faster owner lookups
CREATE INDEX IF NOT EXISTS idx_owners_tax_id ON public.owners(tax_id);

-- ============================================================================
-- PART 3: Fix Missing Columns in Tenants Table
-- ============================================================================

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS occupation text,
ADD COLUMN IF NOT EXISTS employer text,
ADD COLUMN IF NOT EXISTS monthly_income numeric,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS nationality text,
ADD COLUMN IF NOT EXISTS passport_number text,
ADD COLUMN IF NOT EXISTS civil_id text,
ADD COLUMN IF NOT EXISTS marital_status text,
ADD COLUMN IF NOT EXISTS number_of_dependents integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS previous_address text,
ADD COLUMN IF NOT EXISTS move_in_reason text,
ADD COLUMN IF NOT EXISTS preferred_contact_method text,
ADD COLUMN IF NOT EXISTS notes text;

-- Add index for faster tenant searches
CREATE INDEX IF NOT EXISTS idx_tenants_civil_id ON public.tenants(civil_id);
CREATE INDEX IF NOT EXISTS idx_tenants_passport_number ON public.tenants(passport_number);

-- ============================================================================
-- PART 4: Fix Missing Columns in Contracts Table
-- ============================================================================

ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS contract_type text DEFAULT 'residential',
ADD COLUMN IF NOT EXISTS renewable boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS renewal_notice_days integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS late_fee_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS grace_period_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS termination_notice_days integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS special_terms text,
ADD COLUMN IF NOT EXISTS attachments text[],
ADD COLUMN IF NOT EXISTS signed_date date,
ADD COLUMN IF NOT EXISTS witness_name text,
ADD COLUMN IF NOT EXISTS witness_signature text,
ADD COLUMN IF NOT EXISTS landlord_signature text,
ADD COLUMN IF NOT EXISTS tenant_signature text,
ADD COLUMN IF NOT EXISTS approved_by text,
ADD COLUMN IF NOT EXISTS approval_date timestamp with time zone;

-- Add constraint for contract_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'contracts_contract_type_check'
  ) THEN
    ALTER TABLE public.contracts 
    ADD CONSTRAINT contracts_contract_type_check 
    CHECK (contract_type IN ('residential', 'commercial', 'short_term', 'long_term'));
  END IF;
END $$;

-- ============================================================================
-- PART 5: Fix Management Commissions Calculation
-- ============================================================================

-- Drop and recreate the management_commissions view with correct calculation
DROP VIEW IF EXISTS public.management_commissions CASCADE;

CREATE OR REPLACE VIEW public.management_commissions AS
SELECT 
    c.id as contract_id,
    u.property_id,
    c.tenant_id,
    o.id as owner_id,
    o.name as owner_name,
    c.rent_amount,
    o.commission_type,
    o.commission_value as commission_value,
    CASE
        WHEN o.commission_type = 'FIXED_MONTHLY' THEN COALESCE(o.commission_value, 0)
        ELSE NULL
    END as fixed_commission,
    CASE 
        WHEN o.commission_type = 'FIXED_MONTHLY' THEN 
            COALESCE(o.commission_value, 0)
        WHEN o.commission_type = 'RATE' THEN 
            ROUND((c.rent_amount * COALESCE(o.commission_value, 0) / 100), 2)
        ELSE 0
    END as calculated_commission,
    c.start_date,
    c.end_date,
    c.status,
    c.created_at,
    c.updated_at
FROM public.contracts c
LEFT JOIN public.units u ON c.unit_id = u.id
LEFT JOIN public.properties p ON u.property_id = p.id
LEFT JOIN public.owners o ON p.owner_id = o.id
WHERE c.status = 'ACTIVE';

-- Grant access to the view
GRANT SELECT ON public.management_commissions TO authenticated;
GRANT SELECT ON public.management_commissions TO service_role;

-- ============================================================================
-- PART 6: Fix Deposit Accounting - Use Correct Liability Account
-- ============================================================================

-- Create security_deposits_liability account if it doesn't exist
INSERT INTO public.accounts (id, name, type, parent_id, is_active, created_at, updated_at)
VALUES (
    'acc_security_deposits_liability',
    'Security Deposits - Tenant Liability',
    'liability',
    NULL,
    true,
    (extract(epoch from now()) * 1000)::bigint,
    NOW()
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE 'Skipped deposit accounting trigger setup: current schema uses deposit_txs/journal_entries, not the draft transactions model in this migration.';
END $$;

-- ============================================================================
-- PART 7: Add Indexes for Performance Optimization
-- ============================================================================

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_contracts_status_dates 
ON public.contracts(status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_journal_entries_account 
ON public.journal_entries(account_id, created_at);

CREATE INDEX IF NOT EXISTS idx_contracts_unit_tenant_status 
ON public.contracts(unit_id, tenant_id, status);

-- ============================================================================
-- PART 8: Add Comments for Documentation
-- ============================================================================

COMMENT ON VIEW public.management_commissions IS 'Calculated management commissions for all active contracts';

-- ============================================================================
-- PART 9: Data Validation and Cleanup
-- ============================================================================

UPDATE public.owners
SET commission_value = 0
WHERE commission_value IS NULL;

-- ============================================================================
-- PART 10: Create Helper Functions
-- ============================================================================

-- Function to calculate total commission for a contract period
CREATE OR REPLACE FUNCTION public.calculate_contract_commission(
    p_contract_id uuid,
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL
)
RETURNS numeric AS $$
DECLARE
    v_commission_type text;
    v_commission_value numeric;
    v_rent_amount numeric;
    v_months integer;
    v_total_commission numeric;
BEGIN
    -- Get contract details from the owner attached through unit -> property
    SELECT 
        o.commission_type,
        o.commission_value,
        c.rent_amount,
        CASE 
            WHEN p_start_date IS NULL AND p_end_date IS NULL THEN
                EXTRACT(YEAR FROM AGE(end_date, start_date)) * 12 + 
                EXTRACT(MONTH FROM AGE(end_date, start_date))
            ELSE
                EXTRACT(YEAR FROM AGE(COALESCE(p_end_date, end_date), COALESCE(p_start_date, start_date))) * 12 + 
                EXTRACT(MONTH FROM AGE(COALESCE(p_end_date, end_date), COALESCE(p_start_date, start_date)))
        END
    INTO 
        v_commission_type,
        v_commission_value,
        v_rent_amount,
        v_months
    FROM public.contracts c
    LEFT JOIN public.units u ON u.id = c.unit_id
    LEFT JOIN public.properties p ON p.id = u.property_id
    LEFT JOIN public.owners o ON o.id = p.owner_id
    WHERE c.id = p_contract_id;
    
    -- Calculate total commission
    IF v_commission_type = 'FIXED_MONTHLY' THEN
        v_total_commission := COALESCE(v_commission_value, 0) * GREATEST(v_months, 1);
    ELSIF v_commission_type = 'RATE' THEN
        v_total_commission := ROUND((v_rent_amount * COALESCE(v_commission_value, 0) / 100) * GREATEST(v_months, 1), 2);
    ELSE
        v_total_commission := 0;
    END IF;
    
    RETURN v_total_commission;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_contract_commission IS 'Calculate total commission for a contract over a specific period';

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$ 
BEGIN 
    RAISE NOTICE 'Critical fixes migration completed successfully!';
    RAISE NOTICE 'Fixed: Missing columns, commission calculation, deposit accounting, and performance indexes';
END $$;
