-- Migration: add_payment_terms
-- Description: Adds payment terms templates and links them to contracts.

-- 1. Create payment_terms_templates table
CREATE TABLE IF NOT EXISTS public.payment_terms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL, -- e.g., "Quarterly", "Biannual", "Annual"
  installments integer DEFAULT 1,
  interval_type text CHECK (interval_type IN ('monthly', 'quarterly', 'biannual', 'annual', 'custom')),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- 2. Add FK to contracts
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='payment_terms_id') THEN
    ALTER TABLE public.contracts ADD COLUMN payment_terms_id uuid REFERENCES public.payment_terms_templates(id);
  END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.payment_terms_templates ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view payment terms in their org" ON public.payment_terms_templates
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE org_id = payment_terms_templates.org_id));

CREATE POLICY "Admins and managers can manage payment terms" ON public.payment_terms_templates
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles 
      WHERE org_id = payment_terms_templates.org_id 
      AND role IN ('admin', 'manager')
    )
  );

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_payment_terms_org_id ON public.payment_terms_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_payment_terms_id ON public.contracts(payment_terms_id);

-- 6. Trigger for updated_at
CREATE TRIGGER update_payment_terms_updated_at
    BEFORE UPDATE ON public.payment_terms_templates
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
