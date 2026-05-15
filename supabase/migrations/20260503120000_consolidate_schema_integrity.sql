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

-- Fresh preview branches apply this migration before the current core schema
-- migration creates public.properties/public.owners. Keep every hardening step
-- guarded so legacy/live databases are hardened while empty fresh databases can
-- continue to later migrations that create the canonical schema.


-- =============================================================================
-- MIGRATION-LOCAL METADATA HELPERS
-- =============================================================================

CREATE OR REPLACE FUNCTION pg_temp.rentrix_table_exists(target_table text)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT to_regclass(format('public.%I', target_table)) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION pg_temp.rentrix_column_exists(target_table text, target_column text)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = target_table
      AND column_name = target_column
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.rentrix_constraint_exists(target_constraint text)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = target_constraint);
$$;

CREATE OR REPLACE FUNCTION pg_temp.rentrix_constraint_needs_validation(target_constraint text)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = target_constraint
      AND NOT convalidated
  );
$$;

CREATE OR REPLACE FUNCTION pg_temp.rentrix_column_data_type(target_table text, target_column text)
RETURNS text
LANGUAGE sql
AS $$
  SELECT data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = target_table
    AND column_name = target_column;
$$;

CREATE OR REPLACE FUNCTION pg_temp.rentrix_tables_exist(VARIADIC target_tables text[])
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT bool_and(pg_temp.rentrix_table_exists(target_table))
  FROM unnest(target_tables) AS target_table;
$$;

-- =============================================================================
-- SECTION 1–2: FK CONSTRAINTS — guarded by child/parent tables and columns
-- =============================================================================

DO $$
DECLARE
  fk record;
BEGIN
  -- NOSONAR: this immutable migration matrix intentionally repeats audited table/column names.
  FOR fk IN
    SELECT * FROM (VALUES
      ('properties_owner_fk', 'properties', 'owner_id', 'owners', 'id'),
      ('units_property_fk', 'units', 'property_id', 'properties', 'id'),
      ('contracts_unit_fk', 'contracts', 'unit_id', 'units', 'id'),
      ('contracts_tenant_fk', 'contracts', 'tenant_id', 'tenants', 'id'),
      ('invoices_contract_fk', 'invoices', 'contract_id', 'contracts', 'id'),
      ('receipts_contract_fk', 'receipts', 'contract_id', 'contracts', 'id'),
      ('receipt_allocations_receipt_fk', 'receipt_allocations', 'receipt_id', 'receipts', 'id'),
      ('receipt_allocations_invoice_fk', 'receipt_allocations', 'invoice_id', 'invoices', 'id'),
      ('journal_entries_account_fk', 'journal_entries', 'account_id', 'accounts', 'id'),
      ('owner_balances_owner_fk', 'owner_balances', 'owner_id', 'owners', 'id'),
      ('contract_balances_contract_fk', 'contract_balances', 'contract_id', 'contracts', 'id'),
      ('tenant_balances_tenant_fk', 'tenant_balances', 'tenant_id', 'tenants', 'id'),
      ('account_balances_account_fk', 'account_balances', 'account_id', 'accounts', 'id'),
      ('memberships_organization_fk', 'memberships', 'organization_id', 'organizations', 'id'),
      ('subscriptions_organization_fk', 'subscriptions', 'organization_id', 'organizations', 'id'),
      ('subscriptions_plan_fk', 'subscriptions', 'plan_id', 'plans', 'id'),
      ('invoices_billing_subscription_fk', 'invoices_billing', 'subscription_id', 'subscriptions', 'id')
    ) AS f(conname, child_table, child_column, parent_table, parent_column)
  LOOP
    IF pg_temp.rentrix_table_exists(fk.child_table)
       AND pg_temp.rentrix_table_exists(fk.parent_table)
       AND pg_temp.rentrix_column_exists(fk.child_table, fk.child_column)
       AND pg_temp.rentrix_column_exists(fk.parent_table, fk.parent_column)
    THEN
      IF NOT pg_temp.rentrix_constraint_exists(fk.conname) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) NOT VALID',
          fk.child_table,
          fk.conname,
          fk.child_column,
          fk.parent_table,
          fk.parent_column
        );
      END IF;

      IF pg_temp.rentrix_constraint_needs_validation(fk.conname) THEN
        EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', fk.child_table, fk.conname);
      END IF;
    ELSE
      RAISE NOTICE 'Skipping FK %. Required table/column is missing.', fk.conname;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- SECTION 3: CHECK CONSTRAINTS — guarded by table and column existence
-- =============================================================================

DO $$
DECLARE
  chk record;
BEGIN
  -- NOSONAR: this immutable migration matrix intentionally repeats audited constraint names.
  FOR chk IN
    SELECT * FROM (VALUES
      ('invoices_amount_non_negative_chk', 'invoices', 'amount', 'amount >= 0'),
      ('invoices_paid_amount_non_negative_chk', 'invoices', 'paid_amount', 'paid_amount >= 0'),
      ('invoices_tax_amount_non_negative_chk', 'invoices', 'tax_amount', 'tax_amount IS NULL OR tax_amount >= 0'),
      ('receipts_amount_non_negative_chk', 'receipts', 'amount', 'amount >= 0'),
      ('expenses_amount_non_negative_chk', 'expenses', 'amount', 'amount IS NULL OR amount >= 0'),
      ('journal_entries_amount_non_negative_chk', 'journal_entries', 'amount', 'amount >= 0'),
      ('receipt_allocations_amount_non_negative_chk', 'receipt_allocations', 'amount', 'amount >= 0'),
      ('deposit_txs_amount_non_negative_chk', 'deposit_txs', 'amount', 'amount IS NULL OR amount >= 0'),
      ('commissions_amount_non_negative_chk', 'commissions', 'amount', 'amount IS NULL OR amount >= 0')
    ) AS c(conname, table_name, column_name, expression_sql)
  LOOP
    IF pg_temp.rentrix_table_exists(chk.table_name)
       AND pg_temp.rentrix_column_exists(chk.table_name, chk.column_name)
    THEN
      IF NOT pg_temp.rentrix_constraint_exists(chk.conname) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID',
          chk.table_name,
          chk.conname,
          chk.expression_sql
        );
      END IF;

      IF pg_temp.rentrix_constraint_needs_validation(chk.conname) THEN
        EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', chk.table_name, chk.conname);
      END IF;
    ELSE
      RAISE NOTICE 'Skipping CHECK %. Required table/column is missing.', chk.conname;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- SECTION 4: RLS ENABLEMENT
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
-- =============================================================================

DO $$
DECLARE
  -- NOSONAR: audited legacy timestamp-normalization table list.
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
    IF NOT pg_temp.rentrix_table_exists(v_tbl) THEN
      CONTINUE;
    END IF;

    FOREACH v_col IN ARRAY v_cols LOOP
      v_dtype := pg_temp.rentrix_column_data_type(v_tbl, v_col);

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
-- SECTION 6: MISSING INDEXES — guarded by table/column existence
-- =============================================================================

DO $$
DECLARE
  idx record;
BEGIN
  -- NOSONAR: this immutable migration matrix intentionally repeats audited index/table names.
  FOR idx IN
    SELECT * FROM (VALUES
      ('idx_profiles_email', 'profiles', 'email', 'email', 'email IS NOT NULL', true),
      ('idx_profiles_org_id', 'profiles', 'org_id', 'org_id', 'org_id IS NOT NULL', false),
      ('idx_profiles_organization_id', 'profiles', 'organization_id', 'organization_id', 'organization_id IS NOT NULL', false),
      ('idx_accounts_org_id_type', 'accounts', 'org_id', 'org_id, type', 'org_id IS NOT NULL', false),
      ('idx_accounts_organization_id_type', 'accounts', 'organization_id', 'organization_id, type', 'organization_id IS NOT NULL', false),
      ('idx_memberships_user_id', 'memberships', 'user_id', 'user_id', 'user_id IS NOT NULL', false),
      ('idx_memberships_organization_id', 'memberships', 'organization_id', 'organization_id', 'organization_id IS NOT NULL', false),
      ('idx_attachments_entity', 'attachments', 'entity_id', 'entity_id, entity_type', 'entity_id IS NOT NULL', false),
      ('idx_journal_entries_date', 'journal_entries', 'date', 'date', NULL, false),
      ('idx_invoices_due_date', 'invoices', 'due_date', 'due_date', NULL, false),
      ('idx_owners_portal_token', 'owners', 'portal_token', 'portal_token', 'portal_token IS NOT NULL', true)
    ) AS i(index_name, table_name, required_column, index_columns, predicate_sql, is_unique)
  LOOP
    IF pg_temp.rentrix_table_exists(idx.table_name)
       AND pg_temp.rentrix_column_exists(idx.table_name, idx.required_column)
    THEN
      IF idx.predicate_sql IS NULL THEN
        EXECUTE format(
          'CREATE %s INDEX IF NOT EXISTS %I ON public.%I (%s)',
          CASE WHEN idx.is_unique THEN 'UNIQUE' ELSE '' END,
          idx.index_name,
          idx.table_name,
          idx.index_columns
        );
      ELSE
        EXECUTE format(
          'CREATE %s INDEX IF NOT EXISTS %I ON public.%I (%s) WHERE %s',
          CASE WHEN idx.is_unique THEN 'UNIQUE' ELSE '' END,
          idx.index_name,
          idx.table_name,
          idx.index_columns,
          idx.predicate_sql
        );
      END IF;
    ELSE
      RAISE NOTICE 'Skipping index %. Required table/column is missing.', idx.index_name;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- SECTION 7: BALANCE RECONCILIATION VIEWS
-- =============================================================================

DO $$
BEGIN
  IF pg_temp.rentrix_tables_exist(
       'account_balances',
       'owner_balances',
       'contract_balances',
       'tenant_balances',
       'journal_entries',
       'accounts',
       'owners',
       'contracts',
       'tenants'
     )
  THEN
    EXECUTE $view$
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
$view$;

    EXECUTE $view$
CREATE OR REPLACE VIEW public.v_balance_reconciliation_drift AS
SELECT *
FROM   public.v_balance_reconciliation
WHERE  ABS(drift) > 0.01
ORDER  BY ABS(drift) DESC NULLS LAST
$view$;

    GRANT SELECT ON public.v_balance_reconciliation       TO authenticated;
    GRANT SELECT ON public.v_balance_reconciliation_drift TO authenticated;
  ELSE
    RAISE NOTICE 'Skipping balance reconciliation views because one or more required tables are missing.';
  END IF;
END $$;
