-- Migration: add_vat_support
-- Description: Adds VAT configuration to company_settings and tax fields to invoices.

-- 1. Add VAT columns to company_settings
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='vat_enabled') THEN
    ALTER TABLE public.company_settings ADD COLUMN vat_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='vat_rate') THEN
    ALTER TABLE public.company_settings ADD COLUMN vat_rate numeric(5,2) DEFAULT 5.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='vat_registration_number') THEN
    ALTER TABLE public.company_settings ADD COLUMN vat_registration_number text;
  END IF;
END $$;

-- 2. Add tax columns to invoices
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='tax_rate') THEN
    ALTER TABLE public.invoices ADD COLUMN tax_rate numeric(5,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='tax_amount') THEN
    ALTER TABLE public.invoices ADD COLUMN tax_amount numeric(15,3) DEFAULT 0;
  END IF;
END $$;

-- 3. Create a function to calculate VAT return (P1-D requirement)
CREATE OR REPLACE FUNCTION rpt_vat_return(
  p_org_id uuid,
  p_from_date date,
  p_to_date date
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'period', jsonb_build_object('from', p_from_date, 'to', p_to_date),
    'total_sales_amount', COALESCE(SUM(amount), 0),
    'total_tax_amount', COALESCE(SUM(tax_amount), 0),
    'invoice_count', COUNT(*)
  ) INTO v_result
  FROM public.invoices
  WHERE org_id = p_org_id
    AND invoice_date BETWEEN p_from_date AND p_to_date
    AND deleted_at IS NULL;
    
  RETURN v_result;
END;
$$;
