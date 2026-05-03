-- =============================================================================
-- 20260503120000_consolidate_schema_integrity.sql
--
-- Consolidated database integrity migration for Rentrix.
-- This migration is the authoritative source of truth for:
--   1. FK constraint validation (promotes NOT VALID → VALIDATED)
--   2. Additional FK constraints missing from earlier migrations
--   3. CHECK constraints on all financial amount columns (amount >= 0)
--   4. profiles.created_at type normalisation (bigint → timestamptz)
--   5. Missing performance/lookup indexes
--   6. v_balance_reconciliation view for drift detection
--
-- All statements are idempotent — safe to run on both fresh and live databases.
-- =============================================================================


-- =============================================================================
-- SECTION 1: VALIDATE FK CONSTRAINTS
--
-- Migration 20260418101500 added these FK constraints as NOT VALID.
-- NOT VALID means only new rows are checked; existing rows are not scanned.
-- VALIDATE CONSTRAINT promotes them to fully-enforced constraints.
-- Each block checks `NOT convalidated` so re-running is a no-op.
-- =============================================================================

-- properties → owners
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_owner_fk'
      AND contype = 'f'
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.properties VALIDATE CONSTRAINT properties_owner_fk;
  END IF;
END $$;

-- units → properties
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'units_property_fk'
      AND contype = 'f'
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.units VALIDATE CONSTRAINT units_property_fk;
  END IF;
END $$;

-- contracts → units
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_unit_fk'
      AND contype = 'f'
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_unit_fk;
  END IF;
END $$;

-- contracts → tenants
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_tenant_fk'
      AND contype = 'f'
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.contracts VALIDATE CONSTRAINT contracts_tenant_fk;
  END IF;
END $$;

-- invoices → contracts
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_contract_fk'
      AND contype = 'f'
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_contract_fk;
  END IF;
END $$;

-- receipts → contracts
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'receipts_contract_fk'
      AND contype = 'f'
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.receipts VALIDATE CONSTRAINT receipts_contract_fk;
  END IF;
END $$;

-- receipt_allocations → receipts
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'receipt_allocations_receipt_fk'
      AND contype = 'f'
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.receipt_allocations VALIDATE CONSTRAINT receipt_allocations_receipt_fk;
  END IF;
END $$;

-- receipt_allocations → invoices
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'receipt_allocations_invoice_fk'
      AND contype = 'f'
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.receipt_allocations VALIDATE CONSTRAINT receipt_allocations_invoice_fk;
  END IF;
END $$;


-- =============================================================================
-- SECTION 2: ADDITIONAL FK CONSTRAINTS
--
-- These relationships exist in the schema but were not covered by earlier
-- migrations.  Added as NOT VALID first, then immediately validated.
-- The add-then-validate pattern allows the lock on the table to be released
-- between phases — safer on a live database than a single blocking ADD.
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


-- =============================================================================
-- SECTION 3: CHECK CONSTRAINTS — amount >= 0 on all financial tables
--
-- Prevents negative financial amounts from entering the ledger.
-- Each constraint is added as NOT VALID then immediately validated so the
-- full table scan happens in a separate (non-blocking) step.
-- Duplicate-name guards ensure idempotency.
-- =============================================================================

-- invoices.amount
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_amount_non_negative_chk CHECK (amount >= 0) NOT VALID;
    ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_amount_non_negative_chk;
  END IF;
END $$;

-- invoices.paid_amount
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_paid_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_paid_amount_non_negative_chk CHECK (paid_amount >= 0) NOT VALID;
    ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_paid_amount_non_negative_chk;
  END IF;
END $$;

-- invoices.tax_amount (nullable; guard allows NULL)
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
      ADD CONSTRAINT receipts_amount_non_negative_chk CHECK (amount >= 0) NOT VALID;
    ALTER TABLE public.receipts VALIDATE CONSTRAINT receipts_amount_non_negative_chk;
  END IF;
END $$;

-- expenses.amount (nullable in baseline; guard allows NULL for rows pre-dating the column)
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
      ADD CONSTRAINT journal_entries_amount_non_negative_chk CHECK (amount >= 0) NOT VALID;
    ALTER TABLE public.journal_entries VALIDATE CONSTRAINT journal_entries_amount_non_negative_chk;
  END IF;
END $$;

-- receipt_allocations.amount
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receipt_allocations_amount_non_negative_chk'
  ) THEN
    ALTER TABLE public.receipt_allocations
      ADD CONSTRAINT receipt_allocations_amount_non_negative_chk CHECK (amount >= 0) NOT VALID;
    ALTER TABLE public.receipt_allocations VALIDATE CONSTRAINT receipt_allocations_amount_non_negative_chk;
  END IF;
END $$;


-- =============================================================================
-- SECTION 4: TIMESTAMP NORMALISATION
--
-- profiles.created_at was defined as bigint (epoch-milliseconds) in the
-- baseline schema.  This converts it to timestamptz for consistency with
-- every other core table.
--
-- Guard: checks the current data_type before altering — re-running on a
-- database that already has timestamptz is a no-op.
-- =============================================================================

DO $$
DECLARE
  v_col_type text;
BEGIN
  SELECT data_type
    INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'profiles'
    AND column_name  = 'created_at';

  IF v_col_type IN ('bigint', 'integer', 'int8', 'int4') THEN
    -- Epoch-milliseconds → timestamptz
    ALTER TABLE public.profiles
      ALTER COLUMN created_at TYPE timestamptz
      USING to_timestamp(created_at::double precision / 1000.0);
  END IF;
END $$;


-- =============================================================================
-- SECTION 5: MISSING INDEXES
--
-- Covers the lookup patterns identified in the task brief.
-- All use CREATE INDEX IF NOT EXISTS so re-runs are safe.
-- Column-existence guards prevent errors on databases where later migrations
-- added columns that are absent on older schema versions.
-- =============================================================================

-- profiles.email — used in auth lookups
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_profiles_email
        ON public.profiles (email)
        WHERE email IS NOT NULL
    $i$;
  END IF;
END $$;

-- profiles.org_id — used in multi-tenant row filtering
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'org_id'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_profiles_org_id
        ON public.profiles (org_id)
        WHERE org_id IS NOT NULL
    $i$;
  END IF;
END $$;

-- profiles.organization_id — alternate column name used in some schema versions
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_profiles_organization_id
        ON public.profiles (organization_id)
        WHERE organization_id IS NOT NULL
    $i$;
  END IF;
END $$;

-- accounts.org_id + type — used in chart-of-accounts filtering
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'org_id'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_accounts_org_id_type
        ON public.accounts (org_id, type)
        WHERE org_id IS NOT NULL
    $i$;
  END IF;
END $$;

-- accounts.organization_id + type — alternate column name
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'organization_id'
  ) THEN
    EXECUTE $i$
      CREATE INDEX IF NOT EXISTS idx_accounts_organization_id_type
        ON public.accounts (organization_id, type)
        WHERE organization_id IS NOT NULL
    $i$;
  END IF;
END $$;

-- memberships.user_id — used in permission/role lookups
CREATE INDEX IF NOT EXISTS idx_memberships_user_id
  ON public.memberships (user_id)
  WHERE user_id IS NOT NULL;

-- memberships.organization_id — used in org member lists
CREATE INDEX IF NOT EXISTS idx_memberships_organization_id
  ON public.memberships (organization_id)
  WHERE organization_id IS NOT NULL;

-- attachments(entity_id, entity_type) — used in entity-level file listing
CREATE INDEX IF NOT EXISTS idx_attachments_entity
  ON public.attachments (entity_id, entity_type)
  WHERE entity_id IS NOT NULL;

-- journal_entries.date — used in period-range reporting
CREATE INDEX IF NOT EXISTS idx_journal_entries_date
  ON public.journal_entries (date);

-- invoices.due_date — used in overdue / aging reports
CREATE INDEX IF NOT EXISTS idx_invoices_due_date
  ON public.invoices (due_date);

-- owners.portal_token — used in owner-portal auth lookups (must be fast + unique)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename  = 'owners'
      AND indexname  = 'idx_owners_portal_token'
  ) THEN
    CREATE UNIQUE INDEX idx_owners_portal_token
      ON public.owners (portal_token)
      WHERE portal_token IS NOT NULL;
  END IF;
END $$;


-- =============================================================================
-- SECTION 6: BALANCE RECONCILIATION VIEW
--
-- v_balance_reconciliation surfaces drift between the journal_entries ledger
-- (the immutable source of truth) and the account_balances cache table.
--
-- Each row represents one account_id.  The `reconciliation_status` column
-- is the quick-triage field:
--   OK       → drift < £0.01 (rounding tolerance)
--   WARN     → £0.01 ≤ drift < £1.00
--   CRITICAL → drift ≥ £1.00
--
-- Operators can query:
--   SELECT * FROM v_balance_reconciliation WHERE reconciliation_status <> 'OK';
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
    COALESCE(l.account_id, c.account_id)   AS account_id,
    COALESCE(l.ledger_debit,  0::numeric)  AS ledger_debit,
    COALESCE(l.ledger_credit, 0::numeric)  AS ledger_credit,
    COALESCE(l.ledger_debit,  0::numeric)
      - COALESCE(l.ledger_credit, 0::numeric) AS ledger_net,
    COALESCE(c.cache_debit,   0::numeric)  AS cache_debit,
    COALESCE(c.cache_credit,  0::numeric)  AS cache_credit,
    COALESCE(c.cache_debit,   0::numeric)
      - COALESCE(c.cache_credit, 0::numeric)  AS cache_net
  FROM ledger_totals l
  FULL OUTER JOIN cache_totals c USING (account_id)
)
SELECT
  combined.account_id,
  a.name                                     AS account_name,
  a.code                                     AS account_code,
  a.type                                     AS account_type,
  combined.ledger_debit,
  combined.ledger_credit,
  combined.ledger_net,
  combined.cache_debit,
  combined.cache_credit,
  combined.cache_net,
  ROUND(combined.ledger_net - combined.cache_net, 2)  AS drift,
  CASE
    WHEN ABS(combined.ledger_net - combined.cache_net) < 0.01 THEN 'OK'
    WHEN ABS(combined.ledger_net - combined.cache_net) < 1.00 THEN 'WARN'
    ELSE 'CRITICAL'
  END                                        AS reconciliation_status,
  now()                                      AS checked_at
FROM combined
LEFT JOIN public.accounts a ON a.id = combined.account_id
ORDER BY ABS(combined.ledger_net - combined.cache_net) DESC NULLS LAST;

-- Grant read access to authenticated users so operators can query the view
-- from the Supabase dashboard or via the anon/service_role client.
GRANT SELECT ON public.v_balance_reconciliation TO authenticated;
GRANT SELECT ON public.v_balance_reconciliation TO anon;
