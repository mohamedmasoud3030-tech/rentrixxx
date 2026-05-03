-- =============================================================================
-- 20260503120000_consolidate_schema_integrity.sql
--
-- Consolidated database integrity migration for Rentrix.
-- This is the single authoritative migration for schema hardening — it is
-- fully self-contained and produces a consistent result whether or not any
-- earlier "harden_*" migrations have been applied.
--
-- Contents:
--   1. Core FK chain: ADD IF NOT EXISTS (NOT VALID) then VALIDATE
--   2. Additional FK constraints for balance/billing tables
--   3. CHECK constraints on all financial amount columns (amount >= 0)
--      plus a separate validate-only pass for pre-existing NOT VALID checks
--   4. RLS enablement on all public base tables
--   5. Timestamp normalisation: bigint (epoch-ms) → timestamptz
--      for both created_at AND updated_at on all core tables
--   6. Missing performance/lookup indexes
--   7. v_balance_reconciliation — unified drift view covering all four
--      balance tables (account_balances, owner_balances, contract_balances,
--      tenant_balances) compared against the journal_entries source of truth
--      plus v_balance_reconciliation_drift — filtered > 0.01 threshold
--
-- All statements are idempotent — safe to re-run on fresh and live databases.
-- Reconciliation views are granted only to `authenticated`; never to `anon`.
-- =============================================================================


-- =============================================================================
-- SECTION 1: CORE FK CHAIN — ADD IF NOT EXISTS, then VALIDATE
--
-- Pattern: ADD CONSTRAINT ... NOT VALID (fast, non-blocking on live data),
-- then VALIDATE CONSTRAINT (scans existing rows in a separate step).
-- This two-step approach is used for every FK so this migration is
-- self-contained regardless of whether 20260418101500 was ever applied.
-- =============================================================================

-- properties → owners
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_owner_fk'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_owner_fk
      FOREIGN KEY (owner_id) REFERENCES public.owners(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_owner_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.properties VALIDATE CONSTRAINT properties_owner_fk;
  END IF;
END $$;

-- units → properties
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'units_property_fk'
  ) THEN
    ALTER TABLE public.units
      ADD CONSTRAINT units_property_fk
      FOREIGN KEY (property_id) REFERENCES public.properties(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'units_property_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.units VALIDATE CONSTRAINT units_property_fk;
  END IF;
END $$;

-- contracts → units
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contracts_unit_fk'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_unit_fk
      FOREIGN KEY (unit_id) REFERENCES public.units(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_unit_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_unit_fk;
  END IF;
END $$;

-- contracts → tenants
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contracts_tenant_fk'
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_tenant_fk
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_tenant_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_tenant_fk;
  END IF;
END $$;

-- invoices → contracts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_contract_fk'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_contract_fk
      FOREIGN KEY (contract_id) REFERENCES public.contracts(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_contract_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_contract_fk;
  END IF;
END $$;

-- receipts → contracts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipts_contract_fk'
  ) THEN
    ALTER TABLE public.receipts
      ADD CONSTRAINT receipts_contract_fk
      FOREIGN KEY (contract_id) REFERENCES public.contracts(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'receipts_contract_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.receipts VALIDATE CONSTRAINT receipts_contract_fk;
  END IF;
END $$;

-- receipt_allocations → receipts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipt_allocations_receipt_fk'
  ) THEN
    ALTER TABLE public.receipt_allocations
      ADD CONSTRAINT receipt_allocations_receipt_fk
      FOREIGN KEY (receipt_id) REFERENCES public.receipts(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'receipt_allocations_receipt_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.receipt_allocations VALIDATE CONSTRAINT receipt_allocations_receipt_fk;
  END IF;
END $$;

-- receipt_allocations → invoices
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipt_allocations_invoice_fk'
  ) THEN
    ALTER TABLE public.receipt_allocations
      ADD CONSTRAINT receipt_allocations_invoice_fk
      FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'receipt_allocations_invoice_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.receipt_allocations VALIDATE CONSTRAINT receipt_allocations_invoice_fk;
  END IF;
END $$;


-- =============================================================================
-- SECTION 2: ADDITIONAL FK CONSTRAINTS (balance tables, billing, memberships)
-- =============================================================================

-- journal_entries → accounts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'journal_entries_account_fk'
  ) THEN
    ALTER TABLE public.journal_entries
      ADD CONSTRAINT journal_entries_account_fk
      FOREIGN KEY (account_id) REFERENCES public.accounts(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'journal_entries_account_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.journal_entries VALIDATE CONSTRAINT journal_entries_account_fk;
  END IF;
END $$;

-- owner_balances → owners
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'owner_balances_owner_fk'
  ) THEN
    ALTER TABLE public.owner_balances
      ADD CONSTRAINT owner_balances_owner_fk
      FOREIGN KEY (owner_id) REFERENCES public.owners(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'owner_balances_owner_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.owner_balances VALIDATE CONSTRAINT owner_balances_owner_fk;
  END IF;
END $$;

-- contract_balances → contracts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contract_balances_contract_fk'
  ) THEN
    ALTER TABLE public.contract_balances
      ADD CONSTRAINT contract_balances_contract_fk
      FOREIGN KEY (contract_id) REFERENCES public.contracts(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contract_balances_contract_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.contract_balances VALIDATE CONSTRAINT contract_balances_contract_fk;
  END IF;
END $$;

-- tenant_balances → tenants
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_balances_tenant_fk'
  ) THEN
    ALTER TABLE public.tenant_balances
      ADD CONSTRAINT tenant_balances_tenant_fk
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_balances_tenant_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.tenant_balances VALIDATE CONSTRAINT tenant_balances_tenant_fk;
  END IF;
END $$;

-- account_balances → accounts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'account_balances_account_fk'
  ) THEN
    ALTER TABLE public.account_balances
      ADD CONSTRAINT account_balances_account_fk
      FOREIGN KEY (account_id) REFERENCES public.accounts(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_balances_account_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.account_balances VALIDATE CONSTRAINT account_balances_account_fk;
  END IF;
END $$;

-- memberships → organizations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'memberships_organization_fk'
  ) THEN
    ALTER TABLE public.memberships
      ADD CONSTRAINT memberships_organization_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'memberships_organization_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.memberships VALIDATE CONSTRAINT memberships_organization_fk;
  END IF;
END $$;

-- subscriptions → organizations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_organization_fk'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_organization_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_organization_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.subscriptions VALIDATE CONSTRAINT subscriptions_organization_fk;
  END IF;
END $$;

-- subscriptions → plans
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_plan_fk'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_plan_fk
      FOREIGN KEY (plan_id) REFERENCES public.plans(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_plan_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.subscriptions VALIDATE CONSTRAINT subscriptions_plan_fk;
  END IF;
END $$;

-- invoices_billing → subscriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_billing_subscription_fk'
  ) THEN
    ALTER TABLE public.invoices_billing
      ADD CONSTRAINT invoices_billing_subscription_fk
      FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id)
      NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_billing_subscription_fk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.invoices_billing VALIDATE CONSTRAINT invoices_billing_subscription_fk;
  END IF;
END $$;


-- =============================================================================
-- SECTION 3: CHECK CONSTRAINTS — amount >= 0 on all financial tables
--
-- Two sub-passes per constraint:
--   (a) ADD ... NOT VALID if the constraint does not exist yet.
--   (b) VALIDATE if the constraint exists but convalidated = false
--       (handles the case where a previous migration added it NOT VALID
--        and never validated it).
-- =============================================================================

-- invoices.amount
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_amount_non_negative_chk
      CHECK (amount >= 0) NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_amount_non_negative_chk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_amount_non_negative_chk;
  END IF;
END $$;

-- invoices.paid_amount
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_paid_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_paid_amount_non_negative_chk
      CHECK (paid_amount >= 0) NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_paid_amount_non_negative_chk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_paid_amount_non_negative_chk;
  END IF;
END $$;

-- invoices.tax_amount (nullable — NULL allowed, negative not)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_tax_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_tax_amount_non_negative_chk
      CHECK (tax_amount IS NULL OR tax_amount >= 0) NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_tax_amount_non_negative_chk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_tax_amount_non_negative_chk;
  END IF;
END $$;

-- receipts.amount
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipts_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.receipts
      ADD CONSTRAINT receipts_amount_non_negative_chk
      CHECK (amount >= 0) NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'receipts_amount_non_negative_chk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.receipts VALIDATE CONSTRAINT receipts_amount_non_negative_chk;
  END IF;
END $$;

-- expenses.amount (nullable in baseline)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_amount_non_negative_chk
      CHECK (amount IS NULL OR amount >= 0) NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expenses_amount_non_negative_chk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.expenses VALIDATE CONSTRAINT expenses_amount_non_negative_chk;
  END IF;
END $$;

-- journal_entries.amount
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'journal_entries_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.journal_entries
      ADD CONSTRAINT journal_entries_amount_non_negative_chk
      CHECK (amount >= 0) NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'journal_entries_amount_non_negative_chk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.journal_entries VALIDATE CONSTRAINT journal_entries_amount_non_negative_chk;
  END IF;
END $$;

-- receipt_allocations.amount
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipt_allocations_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.receipt_allocations
      ADD CONSTRAINT receipt_allocations_amount_non_negative_chk
      CHECK (amount >= 0) NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'receipt_allocations_amount_non_negative_chk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.receipt_allocations VALIDATE CONSTRAINT receipt_allocations_amount_non_negative_chk;
  END IF;
END $$;

-- deposit_txs.amount (nullable)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deposit_txs_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.deposit_txs
      ADD CONSTRAINT deposit_txs_amount_non_negative_chk
      CHECK (amount IS NULL OR amount >= 0) NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deposit_txs_amount_non_negative_chk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.deposit_txs VALIDATE CONSTRAINT deposit_txs_amount_non_negative_chk;
  END IF;
END $$;

-- commissions.amount (nullable)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commissions_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.commissions
      ADD CONSTRAINT commissions_amount_non_negative_chk
      CHECK (amount IS NULL OR amount >= 0) NOT VALID;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'commissions_amount_non_negative_chk' AND NOT convalidated
  ) THEN
    ALTER TABLE public.commissions VALIDATE CONSTRAINT commissions_amount_non_negative_chk;
  END IF;
END $$;


-- =============================================================================
-- SECTION 4: RLS ENABLEMENT
--
-- Enables Row Level Security on every ordinary base table in the public schema.
-- Skips views (relkind = 'v') and sequences (relkind = 'S').
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent.
--
-- RLS policies were established in earlier migrations (20260412134924,
-- 20260427102343).  This section is the hardening guard to ensure no table
-- is left unprotected if those migrations were absent.
-- =============================================================================

DO $$
DECLARE
  v_table text;
BEGIN
  FOR v_table IN
    SELECT c.relname
    FROM   pg_class     c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public'
      AND  c.relkind = 'r'
    ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
  END LOOP;
  RAISE NOTICE 'RLS enablement pass complete.';
END $$;


-- =============================================================================
-- SECTION 5: TIMESTAMP NORMALISATION
--
-- Converts both `created_at` and `updated_at` from bigint (epoch-milliseconds)
-- to timestamptz on all named core tables.  This provides consistent timestamp
-- types across the schema.
--
-- Guard: inspects information_schema.columns data_type before altering.
--   - Skips tables that do not exist.
--   - Skips columns already typed timestamptz (re-runnable).
--   - Uses USING to_timestamp(col / 1000.0) for correct ms→s conversion.
-- =============================================================================

DO $$
DECLARE
  v_tables text[] := ARRAY[
    'profiles', 'owners', 'properties', 'units', 'tenants', 'contracts',
    'invoices', 'receipts', 'expenses', 'journal_entries', 'accounts',
    'receipt_allocations', 'owner_settlements', 'maintenance_records',
    'snapshots', 'kpi_snapshots', 'automation_runs', 'audit_log',
    'deposit_txs', 'commissions', 'leads', 'lands', 'missions', 'budgets',
    'attachments', 'auto_backups', 'app_notifications',
    'outgoing_notifications', 'notification_templates',
    'owner_balances', 'contract_balances', 'tenant_balances', 'account_balances'
  ];
  v_cols  text[] := ARRAY['created_at', 'updated_at'];
  v_tbl   text;
  v_col   text;
  v_dtype text;
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = v_tbl
    ) THEN
      CONTINUE;
    END IF;

    FOREACH v_col IN ARRAY v_cols LOOP
      SELECT data_type
        INTO v_dtype
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = v_tbl
        AND column_name  = v_col;

      IF v_dtype IN ('bigint', 'integer', 'int8', 'int4') THEN
        EXECUTE format(
          'ALTER TABLE public.%I
             ALTER COLUMN %I TYPE timestamptz
             USING to_timestamp(%I::double precision / 1000.0)',
          v_tbl, v_col, v_col
        );
        RAISE NOTICE 'Converted %.% bigint → timestamptz', v_tbl, v_col;
      END IF;
    END LOOP;
  END LOOP;
END $$;


-- =============================================================================
-- SECTION 6: MISSING INDEXES
-- =============================================================================

-- profiles.email — auth lookups (column-existence guarded)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='email'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_profiles_email
        ON public.profiles (email) WHERE email IS NOT NULL
    $i$;
  END IF;
END $$;

-- profiles.org_id — multi-tenant row filtering
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='org_id'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_profiles_org_id
        ON public.profiles (org_id) WHERE org_id IS NOT NULL
    $i$;
  END IF;
END $$;

-- profiles.organization_id — alternate column name
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='organization_id'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
        ON public.profiles (organization_id) WHERE organization_id IS NOT NULL
    $i$;
  END IF;
END $$;

-- accounts.org_id + type
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='accounts' AND column_name='org_id'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_accounts_org_id_type
        ON public.accounts (org_id, type) WHERE org_id IS NOT NULL
    $i$;
  END IF;
END $$;

-- accounts.organization_id + type — alternate column name
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='accounts' AND column_name='organization_id'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_accounts_organization_id_type
        ON public.accounts (organization_id, type) WHERE organization_id IS NOT NULL
    $i$;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_memberships_user_id
  ON public.memberships (user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_organization_id
  ON public.memberships (organization_id) WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attachments_entity
  ON public.attachments (entity_id, entity_type) WHERE entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_date
  ON public.journal_entries (date);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON public.invoices (due_date);

-- owners.portal_token — unique partial index for owner-portal auth
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='owners' AND indexname='idx_owners_portal_token'
  ) THEN
    CREATE UNIQUE INDEX idx_owners_portal_token
      ON public.owners (portal_token) WHERE portal_token IS NOT NULL;
  END IF;
END $$;


-- =============================================================================
-- SECTION 7: BALANCE RECONCILIATION VIEWS
--
-- v_balance_reconciliation — unified view covering all four balance tables.
-- ALL four parts derive their ledger_value solely from journal_entries.
--
-- Mapping assumptions (document per entity type):
--
--   PART A: account_balances vs journal_entries.account_id
--     ledger_value = SUM(DEBIT) - SUM(CREDIT) per account_id
--     cached_value = SUM(debit_total) - SUM(credit_total) from account_balances
--
--   PART B: owner_balances vs journal_entries where entity_type ILIKE 'owner'
--             and entity_id = owner_id::text
--     ledger_value = SUM(CREDIT) - SUM(DEBIT) per owner entity
--                   (credits are income; debits are expenses for owner perspective)
--     cached_value = net_balance from owner_balances
--                   (= total_income - total_expenses - commission)
--
--   PART C: contract_balances vs journal_entries where entity_type ILIKE 'contract'
--             and entity_id = contract_id::text
--     ledger_value = SUM(DEBIT) - SUM(CREDIT) per contract entity
--                   (debits increase balance_due; credits reduce it)
--     cached_value = balance_due from contract_balances
--
--   PART D: tenant_balances vs journal_entries where entity_type ILIKE 'tenant'
--             and entity_id = tenant_id::text
--     ledger_value = SUM(DEBIT) - SUM(CREDIT) per tenant entity
--     cached_value = balance_due from tenant_balances
--
-- v_balance_reconciliation_drift — filtered companion: |drift| > 0.01 only.
--
-- Security: GRANT SELECT only to `authenticated`. Never to `anon`.
--   Reconciliation data contains financial account codes and totals.
-- =============================================================================

CREATE OR REPLACE VIEW public.v_balance_reconciliation AS

-- Pre-aggregate all journal_entries once, split by key:
--   (a) by account_id   — for account_balances reconciliation
--   (b) by entity       — for owner / contract / tenant reconciliation
WITH je_by_account AS (
  -- Aggregate per account_id (FK to accounts table)
  SELECT
    account_id,
    COALESCE(SUM(amount) FILTER (WHERE type = 'DEBIT'),  0::numeric) AS je_debit,
    COALESCE(SUM(amount) FILTER (WHERE type = 'CREDIT'), 0::numeric) AS je_credit
  FROM public.journal_entries
  WHERE account_id IS NOT NULL
  GROUP BY account_id
),
je_by_entity AS (
  -- Aggregate per (entity_type, entity_id) for owner/contract/tenant lookup.
  -- entity_type comparison is case-insensitive via LOWER().
  -- entity_id is stored as text in the schema.
  SELECT
    LOWER(entity_type)                                              AS etype,
    entity_id                                                       AS eid,
    COALESCE(SUM(amount) FILTER (WHERE type = 'DEBIT'),  0::numeric) AS je_debit,
    COALESCE(SUM(amount) FILTER (WHERE type = 'CREDIT'), 0::numeric) AS je_credit
  FROM public.journal_entries
  WHERE entity_type IS NOT NULL
    AND entity_id   IS NOT NULL
  GROUP BY LOWER(entity_type), entity_id
),

-- ─────────────────────────────────────────────────────────────
-- PART A: account_balances vs journal_entries per account
-- ─────────────────────────────────────────────────────────────
ab_cache AS (
  SELECT
    account_id,
    COALESCE(SUM(debit_total),  0::numeric) AS cache_debit,
    COALESCE(SUM(credit_total), 0::numeric) AS cache_credit
  FROM public.account_balances
  WHERE account_id IS NOT NULL
  GROUP BY account_id
),
account_recon AS (
  SELECT
    'account'::text                                               AS entity_type,
    COALESCE(j.account_id, ab.account_id)                        AS entity_id,
    COALESCE(a.name, COALESCE(j.account_id, ab.account_id)::text) AS entity_name,
    -- ledger_value: net from journal_entries (debit positive convention)
    ROUND(
      (COALESCE(j.je_debit, 0) - COALESCE(j.je_credit, 0))::numeric, 2
    )                                                             AS ledger_value,
    -- cached_value: net from account_balances cache
    ROUND(
      (COALESCE(ab.cache_debit, 0) - COALESCE(ab.cache_credit, 0))::numeric, 2
    )                                                             AS cached_value
  FROM je_by_account j
  FULL OUTER JOIN ab_cache ab USING (account_id)
  LEFT JOIN public.accounts a ON a.id = COALESCE(j.account_id, ab.account_id)
),

-- ─────────────────────────────────────────────────────────────
-- PART B: owner_balances vs journal_entries (entity_type='owner')
-- Assumption: application writes je.entity_type='owner', je.entity_id=owner_id
-- ledger convention: credits = income, debits = expenses → net = credit - debit
-- ─────────────────────────────────────────────────────────────
ob_cache AS (
  SELECT
    owner_id,
    COALESCE(net_balance, 0::numeric) AS cached_net
  FROM public.owner_balances
  WHERE owner_id IS NOT NULL
),
owner_recon AS (
  SELECT
    'owner'::text                                                  AS entity_type,
    ob.owner_id                                                    AS entity_id,
    COALESCE(o.name, ob.owner_id::text)                            AS entity_name,
    -- ledger_value: net owner balance from journal_entries (credit - debit)
    ROUND(
      COALESCE(
        (SELECT je_credit - je_debit
         FROM   je_by_entity e
         WHERE  e.etype = 'owner'
           AND  e.eid   = ob.owner_id::text),
        0::numeric
      ), 2
    )                                                              AS ledger_value,
    ROUND(ob.cached_net::numeric, 2)                               AS cached_value
  FROM ob_cache ob
  LEFT JOIN public.owners o ON o.id = ob.owner_id
),

-- ─────────────────────────────────────────────────────────────
-- PART C: contract_balances vs journal_entries (entity_type='contract')
-- Assumption: application writes je.entity_type='contract', je.entity_id=contract_id
-- ledger convention: debits = charges (increase balance_due), credits = payments
-- ─────────────────────────────────────────────────────────────
cb_cache AS (
  SELECT
    contract_id,
    COALESCE(balance_due, 0::numeric) AS cached_balance
  FROM public.contract_balances
  WHERE contract_id IS NOT NULL
),
contract_recon AS (
  SELECT
    'contract'::text                                               AS entity_type,
    cb.contract_id                                                 AS entity_id,
    COALESCE(ct.no, cb.contract_id::text)                         AS entity_name,
    -- ledger_value: net contract balance from journal_entries (debit - credit)
    ROUND(
      COALESCE(
        (SELECT je_debit - je_credit
         FROM   je_by_entity e
         WHERE  e.etype = 'contract'
           AND  e.eid   = cb.contract_id::text),
        0::numeric
      ), 2
    )                                                              AS ledger_value,
    ROUND(cb.cached_balance::numeric, 2)                           AS cached_value
  FROM cb_cache cb
  LEFT JOIN public.contracts ct ON ct.id = cb.contract_id
),

-- ─────────────────────────────────────────────────────────────
-- PART D: tenant_balances vs journal_entries (entity_type='tenant')
-- Assumption: application writes je.entity_type='tenant', je.entity_id=tenant_id
-- ledger convention: debits = charges (increase balance_due), credits = payments
-- ─────────────────────────────────────────────────────────────
tb_cache AS (
  SELECT
    tenant_id,
    COALESCE(balance_due, 0::numeric) AS cached_balance
  FROM public.tenant_balances
  WHERE tenant_id IS NOT NULL
),
tenant_recon AS (
  SELECT
    'tenant'::text                                                 AS entity_type,
    tb.tenant_id                                                   AS entity_id,
    COALESCE(t.name, tb.tenant_id::text)                          AS entity_name,
    -- ledger_value: net tenant balance from journal_entries (debit - credit)
    ROUND(
      COALESCE(
        (SELECT je_debit - je_credit
         FROM   je_by_entity e
         WHERE  e.etype = 'tenant'
           AND  e.eid   = tb.tenant_id::text),
        0::numeric
      ), 2
    )                                                              AS ledger_value,
    ROUND(tb.cached_balance::numeric, 2)                           AS cached_value
  FROM tb_cache tb
  LEFT JOIN public.tenants t ON t.id = tb.tenant_id
)

-- Union all four parts into the final view
SELECT
  entity_type,
  entity_id,
  entity_name,
  ledger_value,
  cached_value,
  ROUND(ledger_value - cached_value, 2)                           AS drift,
  CASE
    WHEN ABS(ledger_value - cached_value) < 0.01 THEN 'OK'
    WHEN ABS(ledger_value - cached_value) < 1.00 THEN 'WARN'
    ELSE 'CRITICAL'
  END                                                             AS reconciliation_status,
  now()                                                           AS checked_at
FROM (
  SELECT * FROM account_recon
  UNION ALL
  SELECT * FROM owner_recon
  UNION ALL
  SELECT * FROM contract_recon
  UNION ALL
  SELECT * FROM tenant_recon
) all_recon
ORDER BY ABS(ledger_value - cached_value) DESC NULLS LAST;


-- Filtered companion: only rows where |drift| exceeds the rounding tolerance.
-- Use this view for monitoring queries, scheduled alerts, and health checks.
CREATE OR REPLACE VIEW public.v_balance_reconciliation_drift AS
SELECT *
FROM   public.v_balance_reconciliation
WHERE  ABS(drift) > 0.01
ORDER  BY ABS(drift) DESC NULLS LAST;


-- Grant to authenticated only — financial data must never be anon-accessible
GRANT SELECT ON public.v_balance_reconciliation       TO authenticated;
GRANT SELECT ON public.v_balance_reconciliation_drift TO authenticated;
