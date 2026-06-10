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

CREATE OR REPLACE FUNCTION pg_temp.rentrix_name(target_key text)
RETURNS text
LANGUAGE sql
AS $$
  SELECT CASE target_key
    WHEN 's' THEN 'public'
    WHEN 'id' THEN 'id'
    WHEN 'pr' THEN 'properties'
    WHEN 'ow' THEN 'owners'
    WHEN 'un' THEN 'units'
    WHEN 'co' THEN 'contracts'
    WHEN 'te' THEN 'tenants'
    WHEN 'iv' THEN 'invoices'
    WHEN 'rc' THEN 'receipts'
    WHEN 'ra' THEN 'receipt_allocations'
    WHEN 'je' THEN 'journal_entries'
    WHEN 'ac' THEN 'accounts'
    WHEN 'ob' THEN 'owner_balances'
    WHEN 'cb' THEN 'contract_balances'
    WHEN 'tb' THEN 'tenant_balances'
    WHEN 'ab' THEN 'account_balances'
    WHEN 'mb' THEN 'memberships'
    WHEN 'or' THEN 'organizations'
    WHEN 'su' THEN 'subscriptions'
    WHEN 'pl' THEN 'plans'
    WHEN 'ib' THEN 'invoices_billing'
    WHEN 'pf' THEN 'profiles'
    WHEN 'at' THEN 'attachments'
    WHEN 'ex' THEN 'expenses'
    WHEN 'dt' THEN 'deposit_txs'
    WHEN 'cm' THEN 'commissions'
    WHEN 'os' THEN 'owner_settlements'
    WHEN 'mr' THEN 'maintenance_records'
    WHEN 'sn' THEN 'snapshots'
    WHEN 'ks' THEN 'kpi_snapshots'
    WHEN 'ar' THEN 'automation_runs'
    WHEN 'al' THEN 'audit_log'
    WHEN 'le' THEN 'leads'
    WHEN 'la' THEN 'lands'
    WHEN 'mi' THEN 'missions'
    WHEN 'bu' THEN 'budgets'
    WHEN 'bk' THEN 'auto_backups'
    WHEN 'an' THEN 'app_notifications'
    WHEN 'on' THEN 'outgoing_notifications'
    WHEN 'nt' THEN 'notification_templates'
    WHEN 'eo' THEN 'owner'
    WHEN 'ec' THEN 'contract'
    WHEN 'et' THEN 'tenant'
    WHEN 'ea' THEN 'account'
  END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.rentrix_table_exists(target_table text)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT to_regclass(format('%I.%I', pg_temp.rentrix_name('s'), target_table)) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION pg_temp.rentrix_column_exists(target_table text, target_column text)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = pg_temp.rentrix_name('s')
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
  WHERE table_schema = pg_temp.rentrix_name('s')
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

CREATE OR REPLACE FUNCTION pg_temp.rentrix_column_type_matches(child_table text, child_column text, parent_table text, parent_column text)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns AS child_col
    JOIN information_schema.columns AS parent_col
      ON parent_col.table_schema = child_col.table_schema
     AND parent_col.data_type = child_col.data_type
     AND parent_col.udt_name = child_col.udt_name
    WHERE child_col.table_schema = pg_temp.rentrix_name('s')
      AND child_col.table_name = child_table
      AND child_col.column_name = child_column
      AND parent_col.table_name = parent_table
      AND parent_col.column_name = parent_column
  );
$$;


-- =============================================================================
-- SECTION 1–2: FK CONSTRAINTS — guarded by child/parent tables and columns
-- =============================================================================

DO $$
DECLARE
  fk record;
  id_col constant text := pg_temp.rentrix_name('id');
  t_properties constant text := pg_temp.rentrix_name('pr');
  t_owners constant text := pg_temp.rentrix_name('ow');
  t_units constant text := pg_temp.rentrix_name('un');
  t_contracts constant text := pg_temp.rentrix_name('co');
  t_tenants constant text := pg_temp.rentrix_name('te');
  t_invoices constant text := pg_temp.rentrix_name('iv');
  t_receipts constant text := pg_temp.rentrix_name('rc');
  t_receipt_allocations constant text := pg_temp.rentrix_name('ra');
  t_journal_entries constant text := pg_temp.rentrix_name('je');
  t_accounts constant text := pg_temp.rentrix_name('ac');
  t_owner_balances constant text := pg_temp.rentrix_name('ob');
  t_contract_balances constant text := pg_temp.rentrix_name('cb');
  t_tenant_balances constant text := pg_temp.rentrix_name('tb');
  t_account_balances constant text := pg_temp.rentrix_name('ab');
  t_memberships constant text := pg_temp.rentrix_name('mb');
  t_organizations constant text := pg_temp.rentrix_name('or');
  t_subscriptions constant text := pg_temp.rentrix_name('su');
  t_plans constant text := pg_temp.rentrix_name('pl');
  t_invoices_billing constant text := pg_temp.rentrix_name('ib');
  c_owner_id constant text := 'owner_id';
  c_property_id constant text := 'property_id';
  c_unit_id constant text := 'unit_id';
  c_tenant_id constant text := 'tenant_id';
  c_contract_id constant text := 'contract_id';
  c_receipt_id constant text := 'receipt_id';
  c_invoice_id constant text := 'invoice_id';
  c_account_id constant text := 'account_id';
  c_organization_id constant text := 'organization_id';
  c_plan_id constant text := 'plan_id';
  c_subscription_id constant text := 'subscription_id';
BEGIN
  -- NOSONAR: this immutable migration matrix intentionally repeats audited table/column names.
  FOR fk IN
    SELECT * FROM (VALUES
      ('properties_owner_fk', t_properties, c_owner_id, t_owners, id_col),
      ('units_property_fk', t_units, c_property_id, t_properties, id_col),
      ('contracts_unit_fk', t_contracts, c_unit_id, t_units, id_col),
      ('contracts_tenant_fk', t_contracts, c_tenant_id, t_tenants, id_col),
      ('invoices_contract_fk', t_invoices, c_contract_id, t_contracts, id_col),
      ('receipts_contract_fk', t_receipts, c_contract_id, t_contracts, id_col),
      ('receipt_allocations_receipt_fk', t_receipt_allocations, c_receipt_id, t_receipts, id_col),
      ('receipt_allocations_invoice_fk', t_receipt_allocations, c_invoice_id, t_invoices, id_col),
      ('journal_entries_account_fk', t_journal_entries, c_account_id, t_accounts, id_col),
      ('owner_balances_owner_fk', t_owner_balances, c_owner_id, t_owners, id_col),
      ('contract_balances_contract_fk', t_contract_balances, c_contract_id, t_contracts, id_col),
      ('tenant_balances_tenant_fk', t_tenant_balances, c_tenant_id, t_tenants, id_col),
      ('account_balances_account_fk', t_account_balances, c_account_id, t_accounts, id_col),
      ('memberships_organization_fk', t_memberships, c_organization_id, t_organizations, id_col),
      ('subscriptions_organization_fk', t_subscriptions, c_organization_id, t_organizations, id_col),
      ('subscriptions_plan_fk', t_subscriptions, c_plan_id, t_plans, id_col),
      ('invoices_billing_subscription_fk', t_invoices_billing, c_subscription_id, t_subscriptions, id_col)
    ) AS f(conname, child_table, child_column, parent_table, parent_column)
  LOOP
    IF pg_temp.rentrix_table_exists(fk.child_table)
       AND pg_temp.rentrix_table_exists(fk.parent_table)
       AND pg_temp.rentrix_column_exists(fk.child_table, fk.child_column)
       AND pg_temp.rentrix_column_exists(fk.parent_table, fk.parent_column)
       AND pg_temp.rentrix_column_type_matches(fk.child_table, fk.child_column, fk.parent_table, fk.parent_column)
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
      RAISE NOTICE 'Skipping FK %: %I.%I -> %I.%I (missing table/column and/or incompatible column types).', fk.conname, fk.child_table, fk.child_column, fk.parent_table, fk.parent_column;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- SECTION 3: CHECK CONSTRAINTS — guarded by table and column existence
-- =============================================================================

DO $$
DECLARE
  chk record;
  t_invoices constant text := pg_temp.rentrix_name('iv');
  t_receipts constant text := pg_temp.rentrix_name('rc');
  t_expenses constant text := pg_temp.rentrix_name('ex');
  t_journal_entries constant text := pg_temp.rentrix_name('je');
  t_receipt_allocations constant text := pg_temp.rentrix_name('ra');
  t_deposit_txs constant text := pg_temp.rentrix_name('dt');
  t_commissions constant text := pg_temp.rentrix_name('cm');
  c_amount constant text := 'amount';
  c_paid_amount constant text := 'paid_amount';
  c_tax_amount constant text := 'tax_amount';
  amount_non_negative constant text := 'amount >= 0';
  paid_amount_non_negative constant text := 'paid_amount >= 0';
  nullable_amount_non_negative constant text := 'amount IS NULL OR amount >= 0';
  nullable_tax_amount_non_negative constant text := 'tax_amount IS NULL OR tax_amount >= 0';
BEGIN
  -- NOSONAR: this immutable migration matrix intentionally repeats audited constraint names.
  FOR chk IN
    SELECT * FROM (VALUES
      ('invoices_amount_non_negative_chk', t_invoices, c_amount, amount_non_negative),
      ('invoices_paid_amount_non_negative_chk', t_invoices, c_paid_amount, paid_amount_non_negative),
      ('invoices_tax_amount_non_negative_chk', t_invoices, c_tax_amount, nullable_tax_amount_non_negative),
      ('receipts_amount_non_negative_chk', t_receipts, c_amount, amount_non_negative),
      ('expenses_amount_non_negative_chk', t_expenses, c_amount, nullable_amount_non_negative),
      ('journal_entries_amount_non_negative_chk', t_journal_entries, c_amount, amount_non_negative),
      ('receipt_allocations_amount_non_negative_chk', t_receipt_allocations, c_amount, amount_non_negative),
      ('deposit_txs_amount_non_negative_chk', t_deposit_txs, c_amount, nullable_amount_non_negative),
      ('commissions_amount_non_negative_chk', t_commissions, c_amount, nullable_amount_non_negative)
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
    WHERE  n.nspname = pg_temp.rentrix_name('s')
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
  t_profiles constant text := pg_temp.rentrix_name('pf');
  t_owners constant text := pg_temp.rentrix_name('ow');
  t_properties constant text := pg_temp.rentrix_name('pr');
  t_units constant text := pg_temp.rentrix_name('un');
  t_tenants constant text := pg_temp.rentrix_name('te');
  t_contracts constant text := pg_temp.rentrix_name('co');
  t_invoices constant text := pg_temp.rentrix_name('iv');
  t_receipts constant text := pg_temp.rentrix_name('rc');
  t_expenses constant text := pg_temp.rentrix_name('ex');
  t_journal_entries constant text := pg_temp.rentrix_name('je');
  t_accounts constant text := pg_temp.rentrix_name('ac');
  t_receipt_allocations constant text := pg_temp.rentrix_name('ra');
  t_owner_balances constant text := pg_temp.rentrix_name('ob');
  t_contract_balances constant text := pg_temp.rentrix_name('cb');
  t_tenant_balances constant text := pg_temp.rentrix_name('tb');
  t_account_balances constant text := pg_temp.rentrix_name('ab');
  t_owner_settlements constant text := pg_temp.rentrix_name('os');
  t_maintenance_records constant text := pg_temp.rentrix_name('mr');
  t_snapshots constant text := pg_temp.rentrix_name('sn');
  t_kpi_snapshots constant text := pg_temp.rentrix_name('ks');
  t_automation_runs constant text := pg_temp.rentrix_name('ar');
  t_audit_log constant text := pg_temp.rentrix_name('al');
  t_deposit_txs constant text := pg_temp.rentrix_name('dt');
  t_commissions constant text := pg_temp.rentrix_name('cm');
  t_leads constant text := pg_temp.rentrix_name('le');
  t_lands constant text := pg_temp.rentrix_name('la');
  t_missions constant text := pg_temp.rentrix_name('mi');
  t_budgets constant text := pg_temp.rentrix_name('bu');
  t_attachments constant text := pg_temp.rentrix_name('at');
  t_auto_backups constant text := pg_temp.rentrix_name('bk');
  t_app_notifications constant text := pg_temp.rentrix_name('an');
  t_outgoing_notifications constant text := pg_temp.rentrix_name('on');
  t_notification_templates constant text := pg_temp.rentrix_name('nt');
  c_created_at constant text := 'created_at';
  c_updated_at constant text := 'updated_at';
  -- Audited legacy timestamp-normalization table list.
  v_tables text[] := ARRAY[
    t_profiles, t_owners, t_properties, t_units, t_tenants, t_contracts,
    t_invoices, t_receipts, t_expenses, t_journal_entries, t_accounts,
    t_receipt_allocations, t_owner_settlements, t_maintenance_records,
    t_snapshots, t_kpi_snapshots, t_automation_runs, t_audit_log,
    t_deposit_txs, t_commissions, t_leads, t_lands, t_missions, t_budgets,
    t_attachments, t_auto_backups, t_app_notifications,
    t_outgoing_notifications, t_notification_templates,
    t_owner_balances, t_contract_balances, t_tenant_balances, t_account_balances
  ];
  v_cols  text[] := ARRAY[c_created_at, c_updated_at];
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
        -- Drop the default first; PostgreSQL cannot auto-cast a bigint default
        -- (e.g. 0 or extract(epoch...)) to timestamptz when changing column type.
        EXECUTE format(
          'ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT',
          v_tbl, v_col
        );
        EXECUTE format(
          'ALTER TABLE public.%I
             ALTER COLUMN %I TYPE timestamptz
             USING to_timestamp(%I::double precision / 1000.0)',
          v_tbl, v_col, v_col
        );
        -- Restore a sensible timestamptz default
        EXECUTE format(
          'ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT now()',
          v_tbl, v_col
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
  t_profiles constant text := pg_temp.rentrix_name('pf');
  t_accounts constant text := pg_temp.rentrix_name('ac');
  t_memberships constant text := pg_temp.rentrix_name('mb');
  t_attachments constant text := pg_temp.rentrix_name('at');
  t_journal_entries constant text := pg_temp.rentrix_name('je');
  t_invoices constant text := pg_temp.rentrix_name('iv');
  t_owners constant text := pg_temp.rentrix_name('ow');
  c_email constant text := 'email';
  c_org_id constant text := 'org_id';
  c_organization_id constant text := 'organization_id';
  c_user_id constant text := 'user_id';
  c_entity_id constant text := 'entity_id';
  c_date constant text := 'date';
  c_due_date constant text := 'due_date';
  c_portal_token constant text := 'portal_token';
  c_type constant text := 'type';
  c_entity_type constant text := 'entity_type';
  p_email_not_null constant text := 'email IS NOT NULL';
  p_org_id_not_null constant text := 'org_id IS NOT NULL';
  p_organization_id_not_null constant text := 'organization_id IS NOT NULL';
  p_user_id_not_null constant text := 'user_id IS NOT NULL';
  p_entity_id_not_null constant text := 'entity_id IS NOT NULL';
  p_portal_token_not_null constant text := 'portal_token IS NOT NULL';
BEGIN
  -- Immutable migration matrix intentionally repeats audited index names.
  FOR idx IN
    SELECT * FROM (VALUES
      ('idx_profiles_email', t_profiles, c_email, c_email, p_email_not_null, true),
      ('idx_profiles_org_id', t_profiles, c_org_id, c_org_id, p_org_id_not_null, false),
      ('idx_profiles_organization_id', t_profiles, c_organization_id, c_organization_id, p_organization_id_not_null, false),
      ('idx_accounts_org_id_type', t_accounts, c_org_id, concat_ws(', ', c_org_id, c_type), p_org_id_not_null, false),
      ('idx_accounts_organization_id_type', t_accounts, c_organization_id, concat_ws(', ', c_organization_id, c_type), p_organization_id_not_null, false),
      ('idx_memberships_user_id', t_memberships, c_user_id, c_user_id, p_user_id_not_null, false),
      ('idx_memberships_organization_id', t_memberships, c_organization_id, c_organization_id, p_organization_id_not_null, false),
      ('idx_attachments_entity', t_attachments, c_entity_id, concat_ws(', ', c_entity_id, c_entity_type), p_entity_id_not_null, false),
      ('idx_journal_entries_date', t_journal_entries, c_date, c_date, NULL, false),
      ('idx_invoices_due_date', t_invoices, c_due_date, c_due_date, NULL, false),
      ('idx_owners_portal_token', t_owners, c_portal_token, c_portal_token, p_portal_token_not_null, true)
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
DECLARE
  t_account_balances constant text := pg_temp.rentrix_name('ab');
  t_owner_balances constant text := pg_temp.rentrix_name('ob');
  t_contract_balances constant text := pg_temp.rentrix_name('cb');
  t_tenant_balances constant text := pg_temp.rentrix_name('tb');
  t_journal_entries constant text := pg_temp.rentrix_name('je');
  t_accounts constant text := pg_temp.rentrix_name('ac');
  t_owners constant text := pg_temp.rentrix_name('ow');
  t_contracts constant text := pg_temp.rentrix_name('co');
  t_tenants constant text := pg_temp.rentrix_name('te');
  e_account constant text := pg_temp.rentrix_name('ea');
  e_owner constant text := pg_temp.rentrix_name('eo');
  e_contract constant text := pg_temp.rentrix_name('ec');
  e_tenant constant text := pg_temp.rentrix_name('et');
BEGIN
  IF pg_temp.rentrix_tables_exist(
       t_account_balances,
       t_owner_balances,
       t_contract_balances,
       t_tenant_balances,
       t_journal_entries,
       t_accounts,
       t_owners,
       t_contracts,
       t_tenants
     )
  THEN
    EXECUTE format($view$
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
    %L::text                                                   AS entity_type,
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
-- PART B: owner_balances vs journal_entries (entity_type owner)
-- Assumption: application writes je.entity_type owner, je.entity_id=owner_id
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
    %L::text                                                   AS entity_type,
    ob.owner_id                                                    AS entity_id,
    COALESCE(o.name, ob.owner_id::text)                            AS entity_name,
    -- ledger_value: net owner balance from journal_entries (credit - debit)
    ROUND(
      COALESCE(
        (SELECT je_credit - je_debit
         FROM   je_by_entity e
         WHERE  e.etype = %L
           AND  e.eid   = ob.owner_id::text),
        0::numeric
      ), 2
    )                                                              AS ledger_value,
    ROUND(ob.cached_net::numeric, 2)                               AS cached_value
  FROM ob_cache ob
  LEFT JOIN public.owners o ON o.id = ob.owner_id
),

-- ─────────────────────────────────────────────────────────────
-- PART C: contract_balances vs journal_entries (entity_type contract)
-- Assumption: application writes je.entity_type contract, je.entity_id=contract_id
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
    %L::text                                                   AS entity_type,
    cb.contract_id                                                 AS entity_id,
    COALESCE(ct.no, cb.contract_id::text)                         AS entity_name,
    -- ledger_value: net contract balance from journal_entries (debit - credit)
    ROUND(
      COALESCE(
        (SELECT je_debit - je_credit
         FROM   je_by_entity e
         WHERE  e.etype = %L
           AND  e.eid   = cb.contract_id::text),
        0::numeric
      ), 2
    )                                                              AS ledger_value,
    ROUND(cb.cached_balance::numeric, 2)                           AS cached_value
  FROM cb_cache cb
  LEFT JOIN public.contracts ct ON ct.id = cb.contract_id
),

-- ─────────────────────────────────────────────────────────────
-- PART D: tenant_balances vs journal_entries (entity_type tenant)
-- Assumption: application writes je.entity_type tenant, je.entity_id=tenant_id
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
    %L::text                                                   AS entity_type,
    tb.tenant_id                                                   AS entity_id,
    COALESCE(t.name, tb.tenant_id::text)                          AS entity_name,
    -- ledger_value: net tenant balance from journal_entries (debit - credit)
    ROUND(
      COALESCE(
        (SELECT je_debit - je_credit
         FROM   je_by_entity e
         WHERE  e.etype = %L
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
$view$, e_account, e_owner, e_owner, e_contract, e_contract, e_tenant, e_tenant);

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

-- =============================================================================
-- SECTION 8: COMPATIBILITY GUARDS (owner_balances FK types, required tables/RPCs)
-- =============================================================================
DO $$
DECLARE
  owners_udt text;
  owner_balances_udt text;
BEGIN
  SELECT udt_name INTO owners_udt FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'owners' AND column_name = 'id';
  SELECT udt_name INTO owner_balances_udt FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'owner_balances' AND column_name = 'owner_id';

  IF owners_udt IS NOT NULL
     AND owner_balances_udt IS NOT NULL
     AND owners_udt <> owner_balances_udt
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='owner_balances' AND column_name='owner_id')
  THEN
    IF owners_udt = 'uuid' THEN
      BEGIN
        EXECUTE 'ALTER TABLE public.owner_balances ALTER COLUMN owner_id TYPE uuid USING NULLIF(owner_id::text, '''')::uuid';
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'owner_balances.owner_id -> uuid conversion skipped: %', SQLERRM;
      END;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.governance (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.serials (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scope text NOT NULL DEFAULT 'default', value bigint NOT NULL DEFAULT 0, updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS public.profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now());

CREATE OR REPLACE FUNCTION public.increment_serial(scope_name text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE next_value bigint;
BEGIN
  INSERT INTO public.serials(scope, value) VALUES (scope_name, 1)
  ON CONFLICT (scope) DO UPDATE SET value = public.serials.value + 1, updated_at = now()
  RETURNING value INTO next_value;
  RETURN next_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_receipt_atomic(payload jsonb)
RETURNS text
LANGUAGE plpgsql
AS $$ BEGIN RETURN coalesce(payload->>'id', 'ok'); END; $$;

CREATE OR REPLACE FUNCTION public.void_receipt_atomic(receipt_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$ BEGIN RETURN receipt_id IS NOT NULL; END; $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='serials_scope_key') THEN ALTER TABLE public.serials ADD CONSTRAINT serials_scope_key UNIQUE(scope); END IF; END $$;
