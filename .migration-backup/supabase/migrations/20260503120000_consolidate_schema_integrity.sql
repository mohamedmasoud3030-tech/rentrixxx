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
--   4. RLS enablement on all public base tables
--   5. Timestamp normalisation: bigint (epoch-ms) → timestamptz on core tables
--   6. Missing performance/lookup indexes
--   7. v_balance_reconciliation view (full) +
--      v_balance_reconciliation_drift (filtered — drift > 0.01 threshold)
--
-- All statements are idempotent — safe to re-run on fresh and live databases.
-- =============================================================================


-- =============================================================================
-- SECTION 1: CORE FK CHAIN — ADD IF NOT EXISTS, then VALIDATE
--
-- Pattern: ADD CONSTRAINT ... NOT VALID (fast, non-blocking on live data),
-- then VALIDATE CONSTRAINT (scans existing rows in a separate step).
-- This two-step approach is used for every FK so that this migration is
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
-- Prevents negative financial amounts from entering the ledger.
-- Each constraint is added as NOT VALID then immediately validated.
-- Duplicate-name guards make every block idempotent.
-- =============================================================================

-- invoices.amount
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_amount_non_negative_chk
      CHECK (amount >= 0) NOT VALID;
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
    ALTER TABLE public.receipts VALIDATE CONSTRAINT receipts_amount_non_negative_chk;
  END IF;
END $$;

-- expenses.amount (nullable in baseline — NULL allowed for legacy rows)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_amount_non_negative_chk
      CHECK (amount IS NULL OR amount >= 0) NOT VALID;
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
    ALTER TABLE public.commissions VALIDATE CONSTRAINT commissions_amount_non_negative_chk;
  END IF;
END $$;


-- =============================================================================
-- SECTION 4: RLS ENABLEMENT
--
-- Enables Row Level Security on every base table in the public schema.
-- Skips views (relkind = 'v') and materialized views (relkind = 'm').
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent: calling it on a
-- table that already has RLS enabled is a no-op.
--
-- RLS policies were established in earlier migrations
-- (20260412134924, 20260427102343).  This section is purely the enablement
-- guard to ensure no table is left unprotected if those migrations are absent.
-- =============================================================================

DO $$
DECLARE
  v_table  text;
BEGIN
  FOR v_table IN
    SELECT c.relname
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public'
      AND  c.relkind = 'r'          -- ordinary tables only (not views/sequences)
    ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
  END LOOP;

  RAISE NOTICE 'RLS enablement pass complete.';
END $$;


-- =============================================================================
-- SECTION 5: TIMESTAMP NORMALISATION
--
-- The baseline schema uses bigint (epoch-milliseconds) for created_at /
-- updated_at on all property, financial and operational tables.  This section
-- converts the created_at column on all named core tables to timestamptz.
--
-- Strategy per table:
--   • Check information_schema.columns data_type before altering.
--   • Use USING to_timestamp(col::double precision / 1000.0) for the cast.
--   • Only created_at is converted here; updated_at remains bigint because
--     application code still writes it as an epoch integer and changing it
--     would require an application release.  A follow-up task covers that.
--
-- Tables covered: profiles, owners, properties, units, tenants, contracts,
--   invoices, receipts, expenses, journal_entries, accounts, receipt_allocations,
--   owner_settlements, maintenance_records, snapshots, kpi_snapshots,
--   automation_runs, audit_log.
-- =============================================================================

DO $$
DECLARE
  v_rec    RECORD;
  v_tables TEXT[] := ARRAY[
    'profiles', 'owners', 'properties', 'units', 'tenants', 'contracts',
    'invoices', 'receipts', 'expenses', 'journal_entries', 'accounts',
    'receipt_allocations', 'owner_settlements', 'maintenance_records',
    'snapshots', 'kpi_snapshots', 'automation_runs', 'audit_log',
    'deposit_txs', 'commissions', 'leads', 'lands', 'missions', 'budgets',
    'attachments', 'auto_backups', 'app_notifications',
    'outgoing_notifications', 'notification_templates'
  ];
  v_tbl    TEXT;
  v_dtype  TEXT;
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    -- Check table exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = v_tbl
    ) THEN
      CONTINUE;
    END IF;

    -- Check created_at column exists and is still a bigint-family type
    SELECT data_type
      INTO v_dtype
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = v_tbl
      AND column_name  = 'created_at';

    IF v_dtype IN ('bigint', 'integer', 'int8', 'int4') THEN
      EXECUTE format(
        'ALTER TABLE public.%I
           ALTER COLUMN created_at TYPE timestamptz
           USING to_timestamp(created_at::double precision / 1000.0)',
        v_tbl
      );
      RAISE NOTICE 'Converted %.created_at bigint → timestamptz', v_tbl;
    END IF;
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

-- profiles.org_id — multi-tenant row filtering (column-existence guarded)
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

-- profiles.organization_id — alternate column name in some schema versions
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

-- accounts.org_id + type — chart-of-accounts filtering
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

-- memberships.user_id — permission/role lookups
CREATE INDEX IF NOT EXISTS idx_memberships_user_id
  ON public.memberships (user_id)
  WHERE user_id IS NOT NULL;

-- memberships.organization_id — org member lists
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id
  ON public.memberships (organization_id)
  WHERE organization_id IS NOT NULL;

-- attachments(entity_id, entity_type) — entity-level file listing
CREATE INDEX IF NOT EXISTS idx_attachments_entity
  ON public.attachments (entity_id, entity_type)
  WHERE entity_id IS NOT NULL;

-- journal_entries.date — period-range reporting
CREATE INDEX IF NOT EXISTS idx_journal_entries_date
  ON public.journal_entries (date);

-- invoices.due_date — overdue / aging reports
CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON public.invoices (due_date);

-- owners.portal_token — owner-portal auth (unique, partial)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='owners' AND indexname='idx_owners_portal_token'
  ) THEN
    CREATE UNIQUE INDEX idx_owners_portal_token
      ON public.owners (portal_token)
      WHERE portal_token IS NOT NULL;
  END IF;
END $$;


-- =============================================================================
-- SECTION 7: BALANCE RECONCILIATION VIEWS
--
-- v_balance_reconciliation  — full view, all accounts, ordered by drift desc.
--   Use for complete ledger audits and snapshot rebuilds.
--
-- v_balance_reconciliation_drift — filtered view, only rows where
--   ABS(drift) > 0.01 (i.e. beyond the rounding tolerance).
--   Use for operational alerts and scheduled health checks.
--
-- reconciliation_status bands:
--   OK       → |drift| < 0.01  (rounding tolerance, no action needed)
--   WARN     → 0.01 ≤ |drift| < 1.00
--   CRITICAL → |drift| ≥ 1.00  (requires immediate snapshot rebuild)
-- =============================================================================

CREATE OR REPLACE VIEW public.v_balance_reconciliation AS
WITH ledger_totals AS (
  SELECT
    account_id,
    COALESCE(SUM(amount) FILTER (WHERE type = 'DEBIT'),  0::numeric) AS ledger_debit,
    COALESCE(SUM(amount) FILTER (WHERE type = 'CREDIT'), 0::numeric) AS ledger_credit
  FROM public.journal_entries
  WHERE account_id IS NOT NULL
  GROUP BY account_id
),
cache_totals AS (
  SELECT
    account_id,
    COALESCE(SUM(debit_total),  0::numeric) AS cache_debit,
    COALESCE(SUM(credit_total), 0::numeric) AS cache_credit
  FROM public.account_balances
  WHERE account_id IS NOT NULL
  GROUP BY account_id
),
combined AS (
  SELECT
    COALESCE(l.account_id, c.account_id)        AS account_id,
    COALESCE(l.ledger_debit,  0::numeric)        AS ledger_debit,
    COALESCE(l.ledger_credit, 0::numeric)        AS ledger_credit,
    COALESCE(l.ledger_debit,  0::numeric)
      - COALESCE(l.ledger_credit, 0::numeric)    AS ledger_net,
    COALESCE(c.cache_debit,   0::numeric)        AS cache_debit,
    COALESCE(c.cache_credit,  0::numeric)        AS cache_credit,
    COALESCE(c.cache_debit,   0::numeric)
      - COALESCE(c.cache_credit, 0::numeric)     AS cache_net
  FROM ledger_totals   l
  FULL OUTER JOIN cache_totals c USING (account_id)
)
SELECT
  combined.account_id,
  a.name                                           AS account_name,
  a.code                                           AS account_code,
  a.type                                           AS account_type,
  combined.ledger_debit,
  combined.ledger_credit,
  combined.ledger_net,
  combined.cache_debit,
  combined.cache_credit,
  combined.cache_net,
  ROUND(combined.ledger_net - combined.cache_net, 2)   AS drift,
  CASE
    WHEN ABS(combined.ledger_net - combined.cache_net) < 0.01 THEN 'OK'
    WHEN ABS(combined.ledger_net - combined.cache_net) < 1.00 THEN 'WARN'
    ELSE 'CRITICAL'
  END                                              AS reconciliation_status,
  now()                                            AS checked_at
FROM combined
LEFT JOIN public.accounts a ON a.id = combined.account_id
ORDER BY ABS(combined.ledger_net - combined.cache_net) DESC NULLS LAST;


-- Filtered drift-only view: only returns accounts where |drift| exceeds the
-- 0.01 rounding tolerance.  Suitable for monitoring queries and alerts.
CREATE OR REPLACE VIEW public.v_balance_reconciliation_drift AS
SELECT *
FROM   public.v_balance_reconciliation
WHERE  ABS(drift) > 0.01
ORDER  BY ABS(drift) DESC NULLS LAST;


-- Grant read access to authenticated users (operators, Supabase dashboard)
GRANT SELECT ON public.v_balance_reconciliation       TO authenticated;
GRANT SELECT ON public.v_balance_reconciliation_drift TO authenticated;
GRANT SELECT ON public.v_balance_reconciliation       TO anon;
GRANT SELECT ON public.v_balance_reconciliation_drift TO anon;
