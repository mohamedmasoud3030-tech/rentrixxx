-- Migration: add_cost_centers
-- Description: Adds hierarchical cost centers table and links it to expenses and journal entries.

-- 1. Create cost_centers table
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL, -- Simplified link to company_settings (org_id is standard in Rentrix)
  name text NOT NULL,
  property_id uuid REFERENCES public.properties(id),
  parent_id uuid REFERENCES public.cost_centers(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- 2. Add FK to expenses
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='cost_center_id') THEN
    ALTER TABLE public.expenses ADD COLUMN cost_center_id uuid REFERENCES public.cost_centers(id);
  END IF;
END $$;

-- 3. Add FK to journal_entries
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journal_entries' AND column_name='cost_center_id') THEN
    ALTER TABLE public.journal_entries ADD COLUMN cost_center_id uuid REFERENCES public.cost_centers(id);
  END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- SELECT for all app users in the same org
CREATE POLICY "Users can view cost centers in their org" ON public.cost_centers
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE org_id = cost_centers.org_id));

-- INSERT/UPDATE/DELETE for admin/manager
CREATE POLICY "Admins and managers can manage cost centers" ON public.cost_centers
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles 
      WHERE org_id = cost_centers.org_id 
      AND role IN ('admin', 'manager')
    )
  );

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_cost_centers_org_id ON public.cost_centers(org_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_property_id ON public.cost_centers(property_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_parent_id ON public.cost_centers(parent_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cost_center_id ON public.expenses(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_cost_center_id ON public.journal_entries(cost_center_id);

-- 7. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cost_centers_updated_at
    BEFORE UPDATE ON public.cost_centers
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
