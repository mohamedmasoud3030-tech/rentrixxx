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
    c.property_id,
    c.tenant_id,
    o.id as owner_id,
    o.name as owner_name,
    c.rent_amount,
    c.commission_type,
    c.commission_rate,
    c.commission_amount as fixed_commission,
    -- Fixed commission calculation
    CASE 
        WHEN c.commission_type = 'fixed_monthly' THEN 
            COALESCE(c.commission_amount, 0)
        WHEN c.commission_type = 'percentage' THEN 
            ROUND((c.rent_amount * COALESCE(c.commission_rate, 0) / 100), 2)
        ELSE 0
    END as calculated_commission,
    c.start_date,
    c.end_date,
    c.status,
    c.created_at,
    c.updated_at
FROM public.contracts c
LEFT JOIN public.properties p ON c.property_id = p.id
LEFT JOIN public.owners o ON p.owner_id = o.id
WHERE c.status = 'active';

-- Grant access to the view
GRANT SELECT ON public.management_commissions TO authenticated;
GRANT SELECT ON public.management_commissions TO service_role;

-- ============================================================================
-- PART 6: Fix Deposit Accounting - Use Correct Liability Account
-- ============================================================================

-- Create security_deposits_liability account if it doesn't exist
INSERT INTO public.accounts (id, name, type, category, parent_id, is_active, created_at, updated_at)
VALUES (
    'acc_security_deposits_liability',
    'Security Deposits - Tenant Liability',
    'liability',
    'current_liability',
    NULL,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create function to handle deposit transactions correctly
CREATE OR REPLACE FUNCTION public.handle_deposit_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- When deposit is received
    IF (TG_OP = 'INSERT' AND NEW.transaction_type = 'deposit_received') THEN
        -- Debit: Cash/Bank (Asset increases)
        INSERT INTO public.journal_entries (
            transaction_id,
            account_id,
            debit,
            credit,
            description,
            created_at
        ) VALUES (
            NEW.id,
            'acc_cash_bank',  -- Assuming this account exists
            NEW.amount,
            0,
            'Security deposit received from tenant: ' || NEW.description,
            NOW()
        );
        
        -- Credit: Security Deposits Liability (Liability increases)
        INSERT INTO public.journal_entries (
            transaction_id,
            account_id,
            debit,
            credit,
            description,
            created_at
        ) VALUES (
            NEW.id,
            'acc_security_deposits_liability',
            0,
            NEW.amount,
            'Security deposit liability for tenant: ' || NEW.description,
            NOW()
        );
    
    -- When deposit is refunded
    ELSIF (TG_OP = 'INSERT' AND NEW.transaction_type = 'deposit_refunded') THEN
        -- Debit: Security Deposits Liability (Liability decreases)
        INSERT INTO public.journal_entries (
            transaction_id,
            account_id,
            debit,
            credit,
            description,
            created_at
        ) VALUES (
            NEW.id,
            'acc_security_deposits_liability',
            NEW.amount,
            0,
            'Security deposit refund to tenant: ' || NEW.description,
            NOW()
        );
        
        -- Credit: Cash/Bank (Asset decreases)
        INSERT INTO public.journal_entries (
            transaction_id,
            account_id,
            debit,
            credit,
            description,
            created_at
        ) VALUES (
            NEW.id,
            'acc_cash_bank',
            0,
            NEW.amount,
            'Cash paid for deposit refund: ' || NEW.description,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS deposit_accounting_trigger ON public.transactions;

-- Create trigger for deposit transactions
CREATE TRIGGER deposit_accounting_trigger
    AFTER INSERT ON public.transactions
    FOR EACH ROW
    WHEN (NEW.transaction_type IN ('deposit_received', 'deposit_refunded'))
    EXECUTE FUNCTION public.handle_deposit_transaction();

-- ============================================================================
-- PART 7: Add Indexes for Performance Optimization
-- ============================================================================

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_contracts_status_dates 
ON public.contracts(status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_transactions_type_date 
ON public.transactions(transaction_type, transaction_date);

CREATE INDEX IF NOT EXISTS idx_journal_entries_account 
ON public.journal_entries(account_id, created_at);

CREATE INDEX IF NOT EXISTS idx_properties_owner 
ON public.properties(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_contracts_property_tenant 
ON public.contracts(property_id, tenant_id, status);

-- ============================================================================
-- PART 8: Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN public.contracts.commission_type IS 'Type of commission: percentage or fixed_monthly';
COMMENT ON COLUMN public.contracts.commission_rate IS 'Percentage rate when commission_type is percentage';
COMMENT ON COLUMN public.contracts.commission_amount IS 'Fixed monthly amount when commission_type is fixed_monthly';
COMMENT ON VIEW public.management_commissions IS 'Calculated management commissions for all active contracts';
COMMENT ON FUNCTION public.handle_deposit_transaction() IS 'Automatically creates correct double-entry accounting for deposit transactions';

-- ============================================================================
-- PART 9: Data Validation and Cleanup
-- ============================================================================

-- Update any NULL commission amounts for fixed_monthly to 0
UPDATE public.contracts 
SET commission_amount = 0 
WHERE commission_type = 'fixed_monthly' 
AND commission_amount IS NULL;

-- Update any NULL commission rates for percentage to 0
UPDATE public.contracts 
SET commission_rate = 0 
WHERE commission_type = 'percentage' 
AND commission_rate IS NULL;

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
    v_commission_rate numeric;
    v_commission_amount numeric;
    v_rent_amount numeric;
    v_months integer;
    v_total_commission numeric;
BEGIN
    -- Get contract details
    SELECT 
        commission_type,
        commission_rate,
        commission_amount,
        rent_amount,
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
        v_commission_rate,
        v_commission_amount,
        v_rent_amount,
        v_months
    FROM public.contracts
    WHERE id = p_contract_id;
    
    -- Calculate total commission
    IF v_commission_type = 'fixed_monthly' THEN
        v_total_commission := COALESCE(v_commission_amount, 0) * v_months;
    ELSIF v_commission_type = 'percentage' THEN
        v_total_commission := ROUND((v_rent_amount * COALESCE(v_commission_rate, 0) / 100) * v_months, 2);
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
