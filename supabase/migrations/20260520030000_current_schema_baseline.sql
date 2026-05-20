-- Rentrix current schema baseline (idempotent)
-- Source: reconciled from live Supabase production schema inventory on 2026-05-20.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users','profiles','settings','governance','serials','properties','units','tenants','owners','contracts',
    'invoices','receipts','receipt_allocations','expenses','maintenance_records','deposit_txs','audit_log',
    'accounts','journal_entries','owner_settlements','snapshots','notification_templates','notifications',
    'outgoing_notifications','app_notifications','leads','lands','commissions','missions','budgets','attachments',
    'auto_backups','owner_balances','contract_balances','tenant_balances','account_balances','kpi_snapshots',
    'status_history','automation_jobs','automation_run_logs','status_transition_rules','schema_refactor_notes',
    'payments','sessions'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )', t);

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT ''{}''::jsonb', t);
  END LOOP;
END $$;

-- Common relational keys used by app flows (safe, nullable, idempotent)
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE IF EXISTS public.properties ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE IF EXISTS public.units ADD COLUMN IF NOT EXISTS property_id uuid;
ALTER TABLE IF EXISTS public.contracts ADD COLUMN IF NOT EXISTS unit_id uuid;
ALTER TABLE IF EXISTS public.contracts ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS contract_id uuid;
ALTER TABLE IF EXISTS public.receipts ADD COLUMN IF NOT EXISTS invoice_id uuid;
ALTER TABLE IF EXISTS public.receipt_allocations ADD COLUMN IF NOT EXISTS receipt_id uuid;
ALTER TABLE IF EXISTS public.receipt_allocations ADD COLUMN IF NOT EXISTS invoice_id uuid;
ALTER TABLE IF EXISTS public.payments ADD COLUMN IF NOT EXISTS contract_id uuid;

ALTER TABLE IF EXISTS public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey,
  ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.properties
  DROP CONSTRAINT IF EXISTS properties_owner_id_fkey,
  ADD CONSTRAINT properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.owners(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.units
  DROP CONSTRAINT IF EXISTS units_property_id_fkey,
  ADD CONSTRAINT units_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.contracts
  DROP CONSTRAINT IF EXISTS contracts_unit_id_fkey,
  ADD CONSTRAINT contracts_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS contracts_tenant_id_fkey,
  ADD CONSTRAINT contracts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.invoices
  DROP CONSTRAINT IF EXISTS invoices_contract_id_fkey,
  ADD CONSTRAINT invoices_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS public.receipts
  DROP CONSTRAINT IF EXISTS receipts_invoice_id_fkey,
  ADD CONSTRAINT receipts_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_unit_id ON public.contracts(unit_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON public.invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON public.receipts(invoice_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_app_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.increment_serial(p_name text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE next_val bigint;
BEGIN
  INSERT INTO public.serials (metadata)
  VALUES (jsonb_build_object('name', p_name, 'value', 1))
  RETURNING 1 INTO next_val;
  RETURN next_val;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_set_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select_policy ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select_policy ON public.%I FOR SELECT USING (public.is_app_user())', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_modify_policy ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_modify_policy ON public.%I FOR ALL USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager())', t, t);
  END LOOP;
END $$;
