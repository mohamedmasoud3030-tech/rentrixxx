-- Rentrix production-parity baseline rebuilt from last known production migration chain
-- Reconstructed on 2026-05-20 from git ref ee88721 due unavailable direct DB dump credentials in CI agent environment.
-- Keep remote history placeholders for already-applied versions.


-- BEGIN SOURCE: supabase/migrations/20260427102326_rentrix_complete_production_setup.sql
-- noop
-- END SOURCE: supabase/migrations/20260427102326_rentrix_complete_production_setup.sql

-- BEGIN SOURCE: supabase/migrations/20260427102343_rentrix_complete_production_setup.sql
-- Historical no-op migration.
-- Version: 20260427102343
-- Kept only to reconcile Supabase remote migration history.
-- The original historical setup has already been superseded by later guarded migrations.
-- No schema changes are required here.

SELECT 1;
-- END SOURCE: supabase/migrations/20260427102343_rentrix_complete_production_setup.sql

-- BEGIN SOURCE: supabase/migrations/20260503120000_consolidate_schema_integrity.sql
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
-- END SOURCE: supabase/migrations/20260503120000_consolidate_schema_integrity.sql

-- BEGIN SOURCE: supabase/migrations/20260503140000_custom_access_token_hook.sql
-- =============================================================================
-- 20260503140000_custom_access_token_hook.sql
--
-- Creates a Supabase Custom Access Token Hook that injects the application
-- role (ADMIN/USER from public.profiles) into every JWT's app_metadata.
--
-- Why this is needed:
--   Supabase does not include application-level roles in JWTs by default.
--   The API server's requireAuth middleware reads app_metadata.user_role to
--   enforce requireRole('ADMIN') guards. Without this hook, every token falls
--   back to 'USER', making ADMIN-only routes unenforceable.
--
-- How it works:
--   GoTrue calls this function before signing each JWT. The function reads
--   public.profiles.role for the authenticating user and injects it as
--   app_metadata.user_role. The middleware in auth.ts reads this claim.
--
-- After applying this migration you MUST register the hook in Supabase:
--   Dashboard → Authentication → Hooks → Custom Access Token Hook
--   URI: pg-functions://postgres/public/custom_access_token_hook
--
-- OR via Supabase management API:
--   PATCH https://api.supabase.com/v1/projects/{ref}/config/auth
--   Body: {
--     "hook_custom_access_token_enabled": true,
--     "hook_custom_access_token_uri": "pg-functions://postgres/public/custom_access_token_hook"
--   }
--
-- Idempotent: safe to re-run on already-configured databases.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
-- Pin search_path to prevent search_path injection attacks
SET search_path = public
AS $$
DECLARE
  claims       jsonb;
  profile_role text;
BEGIN
  -- Look up the user's application role from the profiles table.
  -- Profiles are created by the application on first sign-in.
  -- Falls back to 'USER' if no profile row exists for this auth user.
  SELECT role
    INTO profile_role
    FROM public.profiles
   WHERE id = (event->>'user_id')::uuid;

  -- Start with the existing claims provided by GoTrue.
  claims := event -> 'claims';

  -- Ensure app_metadata object exists before setting a nested key.
  IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  -- Inject user_role into app_metadata.
  -- auth.ts reads: payload.app_metadata.user_role
  claims := jsonb_set(
    claims,
    '{app_metadata, user_role}',
    to_jsonb(COALESCE(profile_role, 'USER'))
  );

  -- Return the full event with updated claims back to GoTrue.
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute to the Supabase auth admin role so GoTrue can invoke the hook.
-- The supabase_auth_admin role exists in Supabase-managed deployments but is
-- NOT exposed through the pgBouncer pooler; the DO block makes this idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin';
  END IF;
END;
$$;

-- Revoke from PUBLIC — only supabase_auth_admin should call this function.
REVOKE EXECUTE
  ON FUNCTION public.custom_access_token_hook(jsonb)
  FROM PUBLIC;
-- END SOURCE: supabase/migrations/20260503140000_custom_access_token_hook.sql

-- BEGIN SOURCE: supabase/migrations/20260503160000_atomic_receipt_serial.sql
-- =============================================================================
-- 20260503160000_atomic_receipt_serial.sql
--
-- Make receipt serial assignment part of the post_receipt_atomic transaction.
--
-- Before this change the application called increment_serial separately (before
-- or as a wrapper), which meant the serial counter could advance even if the
-- RPC rolled back, producing permanent gaps in the receipt number sequence.
--
-- After this change:
--   • The serials.receipt column is incremented with FOR UPDATE inside the
--     same PL/pgSQL body, before the receipt INSERT.  If anything raises an
--     exception the whole function rolls back — serial included.
--   • The atomically assigned receipt number is stored in the receipts.no
--     column and returned to the caller as receipt_no.
--   • The application no longer calls incrementSerial for receipts.
-- =============================================================================

DROP FUNCTION IF EXISTS public.post_receipt_atomic(jsonb);

CREATE OR REPLACE FUNCTION public.post_receipt_atomic(
  payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt          jsonb;
  v_allocations      jsonb;
  v_journal_entries  jsonb;
  v_request_id       text;
  v_receipt_id       uuid;
  v_existing_receipt_id uuid;
  v_existing_result  jsonb;
  v_receipt_contract_id uuid;
  v_receipt_amount   numeric;
  v_total_allocations numeric := 0;
  v_receipt_date     date;
  v_tenant_id        uuid;
  v_batch_id         text;
  v_invoice_id       uuid;
  v_invoice_contract_id uuid;
  v_invoice_total    numeric;
  v_invoice_paid     numeric;
  v_allocation_amount numeric;
  v_duplicate_count  integer;
  v_journal_debits   numeric := 0;
  v_journal_credits  numeric := 0;
  -- Atomically-assigned human-readable receipt number
  v_receipt_no       text;
BEGIN
  v_receipt             := COALESCE(payload->'receipt', '{}'::jsonb);
  v_allocations         := COALESCE(payload->'allocations', '[]'::jsonb);
  v_journal_entries     := COALESCE(payload->'journal_entries', '[]'::jsonb);
  v_request_id          := NULLIF(COALESCE(payload->>'request_id', v_receipt->>'request_id'), '');
  v_receipt_contract_id := (v_receipt->>'contract_id')::uuid;
  v_receipt_amount      := COALESCE((v_receipt->>'amount')::numeric, 0);
  v_receipt_date        := (v_receipt->>'date_time')::date;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'معرّف الطلب مطلوب لضمان عدم التكرار.';
  END IF;

  -- ── Idempotency check ───────────────────────────────────────────────────────
  SELECT response_payload
    INTO v_existing_result
  FROM public.financial_operation_idempotency
  WHERE operation_name = 'post_receipt_atomic'
    AND request_id = v_request_id
  FOR UPDATE;

  IF v_existing_result IS NOT NULL THEN
    RETURN v_existing_result;
  END IF;

  -- ── Validation ──────────────────────────────────────────────────────────────
  IF v_receipt_contract_id IS NULL THEN
    RAISE EXCEPTION 'العقد المرتبط بسند القبض مطلوب.';
  END IF;
  IF v_receipt_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ سند القبض يجب أن يكون أكبر من صفر.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.id = v_receipt_contract_id
      AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'العقد غير موجود أو محذوف.';
  END IF;

  SELECT c.organization_id INTO v_tenant_id
  FROM public.contracts c
  WHERE c.id = v_receipt_contract_id;

  v_batch_id := COALESCE(v_request_id, v_receipt->>'id');

  IF EXISTS (
    SELECT 1
    FROM public.accounting_periods p
    WHERE p.status = 'CLOSED'
      AND p.start_date <= v_receipt_date
      AND p.end_date   >= v_receipt_date
  ) THEN
    RAISE EXCEPTION 'الفترة المحاسبية مغلقة ولا تسمح بترحيل قيود جديدة.';
  END IF;

  -- Check for a previously inserted receipt with the same request_id
  SELECT r.id, r.no
    INTO v_existing_receipt_id, v_receipt_no
  FROM public.receipts r
  WHERE r.request_id = v_request_id
  LIMIT 1;

  IF v_existing_receipt_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success',     true,
      'idempotent',  true,
      'request_id',  v_request_id,
      'receipt_id',  v_existing_receipt_id,
      'receipt_no',  v_receipt_no
    );
  END IF;

  -- Duplicate-invoice guard
  SELECT COUNT(*)
    INTO v_duplicate_count
  FROM (
    SELECT (value->>'invoice_id')::uuid AS invoice_id
    FROM jsonb_array_elements(v_allocations)
    GROUP BY 1
    HAVING COUNT(*) > 1
  ) duplicates;
  IF COALESCE(v_duplicate_count, 0) > 0 THEN
    RAISE EXCEPTION 'لا يمكن تكرار نفس الفاتورة داخل نفس سند القبض.';
  END IF;

  -- Per-allocation integrity checks
  FOR v_invoice_id, v_allocation_amount IN
    SELECT (value->>'invoice_id')::uuid, COALESCE((value->>'amount')::numeric, 0)
    FROM jsonb_array_elements(v_allocations)
  LOOP
    IF v_allocation_amount <= 0 THEN
      RAISE EXCEPTION 'مبلغ التخصيص يجب أن يكون أكبر من صفر.';
    END IF;
    SELECT i.contract_id,
           (COALESCE(i.amount, 0) + COALESCE(i.tax_amount, 0)),
           COALESCE(i.paid_amount, 0)
      INTO v_invoice_contract_id, v_invoice_total, v_invoice_paid
    FROM public.invoices i
    WHERE i.id = v_invoice_id
    FOR UPDATE;
    IF v_invoice_contract_id IS NULL THEN
      RAISE EXCEPTION 'فاتورة غير موجودة: %', v_invoice_id;
    END IF;
    IF v_invoice_contract_id <> v_receipt_contract_id THEN
      RAISE EXCEPTION 'الفاتورة % لا تتبع نفس العقد.', v_invoice_id;
    END IF;
    IF (v_invoice_paid + v_allocation_amount) > (v_invoice_total + 0.001) THEN
      RAISE EXCEPTION 'قيمة التخصيص تتجاوز رصيد الفاتورة %.', v_invoice_id;
    END IF;
    v_total_allocations := v_total_allocations + v_allocation_amount;
  END LOOP;

  IF ABS(v_total_allocations - v_receipt_amount) > 0.001 THEN
    RAISE EXCEPTION 'مجموع التخصيصات يجب أن يساوي مبلغ السند.';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN (j->>'type') = 'DEBIT'  THEN (j->>'amount')::numeric ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN (j->>'type') = 'CREDIT' THEN (j->>'amount')::numeric ELSE 0 END), 0)
  INTO v_journal_debits, v_journal_credits
  FROM jsonb_array_elements(v_journal_entries) AS j;

  IF ABS(v_journal_debits - v_journal_credits) > 0.001 THEN
    RAISE EXCEPTION 'القيود المحاسبية غير متوازنة.';
  END IF;

  -- ── Atomically increment the receipt serial ─────────────────────────────────
  -- Lock the row first so concurrent calls don't race on the counter.
  PERFORM 1 FROM public.serials WHERE id = 1 FOR UPDATE;

  UPDATE public.serials
     SET receipt = receipt + 1
   WHERE id = 1
  RETURNING receipt::text INTO v_receipt_no;

  IF v_receipt_no IS NULL THEN
    RAISE EXCEPTION 'فشل توليد رقم السند: صف serials غير موجود.';
  END IF;

  -- ── Insert receipt (using the atomically assigned serial) ───────────────────
  INSERT INTO public.receipts (
    id,
    no,
    contract_id,
    date_time,
    channel,
    amount,
    ref,
    notes,
    status,
    check_number,
    check_bank,
    check_date,
    check_status,
    created_at,
    request_id,
    tenant_id
  )
  VALUES (
    (v_receipt->>'id')::uuid,
    v_receipt_no,
    (v_receipt->>'contract_id')::uuid,
    v_receipt->>'date_time',
    v_receipt->>'channel',
    (v_receipt->>'amount')::numeric,
    COALESCE(v_receipt->>'ref', ''),
    COALESCE(v_receipt->>'notes', ''),
    v_receipt->>'status',
    NULLIF(v_receipt->>'check_number', ''),
    NULLIF(v_receipt->>'check_bank', ''),
    NULLIF(v_receipt->>'check_date', ''),
    NULLIF(v_receipt->>'check_status', ''),
    (v_receipt->>'created_at')::timestamptz,
    v_request_id,
    v_tenant_id
  )
  RETURNING id INTO v_receipt_id;

  -- ── Receipt allocations ─────────────────────────────────────────────────────
  INSERT INTO public.receipt_allocations (id, receipt_id, invoice_id, amount, created_at, tenant_id)
  SELECT
    (a->>'id')::uuid,
    v_receipt_id,
    (a->>'invoice_id')::uuid,
    (a->>'amount')::numeric,
    (a->>'created_at')::timestamptz,
    v_tenant_id
  FROM jsonb_array_elements(v_allocations) AS a;

  -- ── Update invoice balances ─────────────────────────────────────────────────
  WITH alloc_totals AS (
    SELECT
      (a->>'invoice_id')::uuid AS invoice_id,
      SUM((a->>'amount')::numeric) AS total_allocated
    FROM jsonb_array_elements(v_allocations) AS a
    GROUP BY 1
  )
  UPDATE public.invoices i
     SET
       paid_amount = COALESCE(i.paid_amount, 0) + alloc_totals.total_allocated,
       status = CASE
         WHEN (COALESCE(i.paid_amount, 0) + alloc_totals.total_allocated) >= (COALESCE(i.amount, 0) + COALESCE(i.tax_amount, 0)) - 0.001 THEN 'PAID'
         WHEN (COALESCE(i.paid_amount, 0) + alloc_totals.total_allocated) > 0 THEN 'PARTIALLY_PAID'
         ELSE i.status
       END
  FROM alloc_totals
  WHERE i.id = alloc_totals.invoice_id;

  -- ── Journal entries ─────────────────────────────────────────────────────────
  INSERT INTO public.journal_entries (
    id,
    no,
    date,
    account_id,
    amount,
    type,
    source_id,
    entity_type,
    entity_id,
    created_at,
    tenant_id,
    batch_id,
    request_id,
    source_module
  )
  SELECT
    (j->>'id')::uuid,
    j->>'no',
    j->>'date',
    j->>'account_id',
    (j->>'amount')::numeric,
    j->>'type',
    j->>'source_id',
    NULLIF(j->>'entity_type', ''),
    NULLIF(j->>'entity_id', ''),
    (j->>'created_at')::timestamptz,
    v_tenant_id,
    v_batch_id,
    v_request_id,
    'RECEIPTS'
  FROM jsonb_array_elements(v_journal_entries) AS j;

  PERFORM public.seal_ledger_batch(v_batch_id, v_tenant_id);

  -- ── Build and persist result (idempotency store) ────────────────────────────
  v_existing_result := jsonb_build_object(
    'success',    true,
    'idempotent', false,
    'request_id', v_request_id,
    'receipt_id', v_receipt_id,
    'receipt_no', v_receipt_no
  );

  INSERT INTO public.financial_operation_idempotency (operation_name, request_id, response_payload)
  VALUES ('post_receipt_atomic', v_request_id, v_existing_result)
  ON CONFLICT (operation_name, request_id) DO NOTHING;

  -- ── Audit and event log ─────────────────────────────────────────────────────
  INSERT INTO public.financial_audit_log (
    action,
    actor_id,
    source_module,
    request_id,
    entity_type,
    entity_id,
    before_state,
    after_state,
    metadata
  ) VALUES (
    'POST_RECEIPT',
    NULL,
    'RECEIPTS',
    v_request_id,
    'RECEIPT',
    v_receipt_id,
    NULL,
    jsonb_build_object('receipt_id', v_receipt_id, 'contract_id', v_receipt_contract_id, 'receipt_no', v_receipt_no),
    jsonb_build_object('allocations_count', jsonb_array_length(v_allocations), 'tenant_id', v_tenant_id, 'batch_id', v_batch_id)
  );

  PERFORM public.append_financial_event(
    'RECEIPT_POSTED',
    v_tenant_id,
    v_request_id,
    'RECEIPT',
    v_receipt_id,
    jsonb_build_object('batch_id', v_batch_id, 'contract_id', v_receipt_contract_id, 'amount', v_receipt_amount, 'receipt_no', v_receipt_no)
  );

  RETURN v_existing_result;
END;
$$;

REVOKE ALL ON FUNCTION public.post_receipt_atomic(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_receipt_atomic(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_receipt_atomic(jsonb) TO service_role;
-- END SOURCE: supabase/migrations/20260503160000_atomic_receipt_serial.sql

-- BEGIN SOURCE: supabase/migrations/20260509080848_fix_contracts_rls_policy.sql
-- noop
-- END SOURCE: supabase/migrations/20260509080848_fix_contracts_rls_policy.sql

-- BEGIN SOURCE: supabase/migrations/20260509080930_fix_views_security_invoker.sql
-- noop
-- END SOURCE: supabase/migrations/20260509080930_fix_views_security_invoker.sql

-- BEGIN SOURCE: supabase/migrations/20260510055726_fix_owner_settlements_status_column.sql
-- noop
-- END SOURCE: supabase/migrations/20260510055726_fix_owner_settlements_status_column.sql

-- BEGIN SOURCE: supabase/migrations/20260510055736_fix_duplicate_rls_policies.sql
-- noop
-- END SOURCE: supabase/migrations/20260510055736_fix_duplicate_rls_policies.sql

-- BEGIN SOURCE: supabase/migrations/20260510055756_fix_recalculate_all_balances_function.sql
-- noop
-- END SOURCE: supabase/migrations/20260510055756_fix_recalculate_all_balances_function.sql

-- BEGIN SOURCE: supabase/migrations/20260510055826_fix_contract_balances_updated_at_trigger.sql
-- noop
-- END SOURCE: supabase/migrations/20260510055826_fix_contract_balances_updated_at_trigger.sql

-- BEGIN SOURCE: supabase/migrations/20260510055847_fix_get_financial_summary_function.sql
-- noop
-- END SOURCE: supabase/migrations/20260510055847_fix_get_financial_summary_function.sql

-- BEGIN SOURCE: supabase/migrations/20260510055859_fix_contracts_no_auto_generate.sql
-- noop
-- END SOURCE: supabase/migrations/20260510055859_fix_contracts_no_auto_generate.sql

-- BEGIN SOURCE: supabase/migrations/20260510055912_fix_unit_status_trigger_function.sql
-- noop
-- END SOURCE: supabase/migrations/20260510055912_fix_unit_status_trigger_function.sql

-- BEGIN SOURCE: supabase/migrations/20260510060659_fix_missing_columns_and_views.sql
-- noop
-- END SOURCE: supabase/migrations/20260510060659_fix_missing_columns_and_views.sql

-- BEGIN SOURCE: supabase/migrations/20260510060714_fix_api_routes_404.sql
-- noop
-- END SOURCE: supabase/migrations/20260510060714_fix_api_routes_404.sql

-- BEGIN SOURCE: supabase/migrations/20260510061147_fix_audit_log_generated_columns.sql
-- noop
-- END SOURCE: supabase/migrations/20260510061147_fix_audit_log_generated_columns.sql

-- BEGIN SOURCE: supabase/migrations/20260513120000_core_real_estate_schema.sql
-- Rentrix Phase 1 core schema: Supabase is the sole source of truth.

create extension if not exists pgcrypto;

create type public.property_status as enum ('active', 'inactive', 'maintenance', 'sold');
create type public.unit_status as enum ('available', 'occupied', 'maintenance', 'reserved');
create type public.person_type as enum ('tenant', 'owner', 'contact');
create type public.contract_status as enum ('draft', 'active', 'expired', 'terminated');
create type public.payment_cycle as enum ('monthly', 'quarterly', 'semi_annual', 'annual');
create type public.invoice_status as enum ('draft', 'issued', 'partial', 'paid', 'overdue', 'void');
create type public.payment_method as enum ('cash', 'bank_transfer', 'card', 'check', 'other');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,
  address text not null,
  owner_name text,
  purchase_value numeric(14,2) check (purchase_value is null or purchase_value >= 0),
  current_value numeric(14,2) check (current_value is null or current_value >= 0),
  status public.property_status not null default 'active',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_number text not null,
  floor text,
  status public.unit_status not null default 'available',
  rent_amount numeric(14,2) check (rent_amount is null or rent_amount >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint units_property_unit_number_unique unique (property_id, unit_number)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  national_id text,
  type public.person_type not null,
  address text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  tenant_id uuid not null references public.people(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  rent_amount numeric(14,2) not null check (rent_amount >= 0),
  payment_cycle public.payment_cycle not null default 'monthly',
  status public.contract_status not null default 'draft',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint contracts_valid_date_range check (end_date >= start_date)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  issue_date date not null,
  due_date date not null,
  amount numeric(14,2) not null check (amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  status public.invoice_status not null default 'issued',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  constraint invoices_paid_not_greater_than_amount check (paid_amount <= amount)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_method public.payment_method not null,
  payment_date date not null,
  reference_number text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  expense_date date not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index properties_status_idx on public.properties(status) where deleted_at is null;
create index units_property_id_idx on public.units(property_id) where deleted_at is null;
create index units_status_idx on public.units(status) where deleted_at is null;
create index people_type_idx on public.people(type) where deleted_at is null;
create index people_phone_idx on public.people(phone) where deleted_at is null and phone is not null;
create index contracts_property_id_idx on public.contracts(property_id) where deleted_at is null;
create index contracts_unit_id_idx on public.contracts(unit_id) where deleted_at is null;
create index contracts_tenant_id_idx on public.contracts(tenant_id) where deleted_at is null;
create index contracts_status_idx on public.contracts(status) where deleted_at is null;
create index invoices_contract_id_idx on public.invoices(contract_id) where deleted_at is null;
create index invoices_due_date_idx on public.invoices(due_date) where deleted_at is null;
create index invoices_status_idx on public.invoices(status) where deleted_at is null;
create index payments_invoice_id_idx on public.payments(invoice_id) where deleted_at is null;
create index payments_payment_date_idx on public.payments(payment_date) where deleted_at is null;
create index expenses_property_id_idx on public.expenses(property_id) where deleted_at is null;
create index expenses_expense_date_idx on public.expenses(expense_date) where deleted_at is null;

create trigger properties_set_updated_at before update on public.properties for each row execute function public.set_updated_at();
create trigger units_set_updated_at before update on public.units for each row execute function public.set_updated_at();
create trigger people_set_updated_at before update on public.people for each row execute function public.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();

alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.people enable row level security;
alter table public.contracts enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

create policy "Authenticated users can manage properties" on public.properties for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage units" on public.units for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage people" on public.people for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage contracts" on public.contracts for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage invoices" on public.invoices for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage payments" on public.payments for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage expenses" on public.expenses for all to authenticated using (true) with check (true);
-- END SOURCE: supabase/migrations/20260513120000_core_real_estate_schema.sql

-- BEGIN SOURCE: supabase/migrations/20260513150000_phase_2b_contract_renewal.sql
-- Phase 2B contracts: cancellation metadata and atomic renewal.

alter table public.contracts
  add column if not exists cancellation_reason text,
  add column if not exists renewed_from_id uuid references public.contracts(id) on delete restrict;

create index if not exists contracts_renewed_from_id_idx on public.contracts(renewed_from_id) where renewed_from_id is not null and deleted_at is null;

create or replace function public.renew_contract_atomic(
  contract_id uuid,
  new_start date,
  new_end date,
  new_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  original_contract public.contracts%rowtype;
  new_contract_id uuid;
begin
  if new_end < new_start then
    raise exception 'new_end must be greater than or equal to new_start';
  end if;

  if new_amount < 0 then
    raise exception 'new_amount must be greater than or equal to zero';
  end if;

  select * into original_contract
  from public.contracts
  where id = contract_id and deleted_at is null
  for update;

  if not found then
    raise exception 'contract not found';
  end if;

  update public.contracts
  set status = 'expired', updated_at = timezone('utc', now())
  where id = original_contract.id;

  insert into public.contracts (
    property_id,
    unit_id,
    tenant_id,
    start_date,
    end_date,
    rent_amount,
    payment_cycle,
    status,
    notes,
    renewed_from_id
  ) values (
    original_contract.property_id,
    original_contract.unit_id,
    original_contract.tenant_id,
    new_start,
    new_end,
    new_amount,
    original_contract.payment_cycle,
    'draft',
    original_contract.notes,
    original_contract.id
  )
  returning id into new_contract_id;

  return new_contract_id;
end;
$$;

grant execute on function public.renew_contract_atomic(uuid, date, date, numeric) to authenticated;
-- END SOURCE: supabase/migrations/20260513150000_phase_2b_contract_renewal.sql

-- BEGIN SOURCE: supabase/migrations/20260513190000_phase_3_financial_engine.sql
create or replace function public.post_receipt_atomic(p_invoice_id uuid, p_amount numeric, p_method public.payment_method, p_date date, p_reference text)
returns text
language plpgsql
security definer
as $$
declare v_invoice public.invoices%rowtype;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id and deleted_at is null for update;
  if v_invoice.id is null then raise exception 'Invoice not found'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if v_invoice.paid_amount + p_amount > v_invoice.amount then raise exception 'Payment exceeds remaining balance'; end if;

  insert into public.payments(invoice_id, amount, payment_method, payment_date, reference_number)
  values (p_invoice_id, round(p_amount::numeric,2), p_method, p_date, p_reference);

  update public.invoices
    set paid_amount = round((paid_amount + p_amount)::numeric,2),
        status = case
          when (paid_amount + p_amount) >= v_invoice.amount then 'paid'
          when (paid_amount + p_amount) > 0 then 'partial'
          else status
        end
  where id = p_invoice_id;

  return 'ok';
end; $$;

create or replace function public.generate_invoices_from_active_contracts()
returns integer
language sql
security definer
as $$
  with generated as (
    insert into public.invoices (contract_id, issue_date, due_date, amount, paid_amount, status)
    select c.id, current_date, current_date + interval '10 day', round(c.rent_amount::numeric,2), 0, 'issued'
    from public.contracts c
    where c.status = 'active' and c.deleted_at is null
      and not exists (
        select 1
        from public.invoices i
        where i.contract_id = c.id
          and i.deleted_at is null
          and date_trunc('month', i.issue_date) = date_trunc('month', current_date)
      )
    returning id
  )
  select count(*)::integer from generated;
$$;

create or replace function public.rpt_financial_summary(month int, year int)
returns table(total_collected numeric, total_overdue_invoices numeric, total_expenses numeric, net_revenue numeric)
language sql
security definer
as $$
  with c as (
    select coalesce(sum(amount),0)::numeric(12,2) v from public.payments where deleted_at is null and extract(month from payment_date)=month and extract(year from payment_date)=year
  ), o as (
    select coalesce(sum(amount-paid_amount),0)::numeric(12,2) v from public.invoices where deleted_at is null and status='overdue'
  ), e as (
    select coalesce(sum(amount),0)::numeric(12,2) v from public.expenses where deleted_at is null and extract(month from expense_date)=month and extract(year from expense_date)=year
  )
  select c.v, o.v, e.v, (c.v-e.v)::numeric(12,2) from c,o,e;
$$;
-- END SOURCE: supabase/migrations/20260513190000_phase_3_financial_engine.sql

-- BEGIN SOURCE: supabase/migrations/20260513210000_phase_4_reports_maintenance.sql
create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_id uuid references public.units(id) on delete restrict,
  title text not null,
  description text,
  priority text not null check (priority in ('low','medium','high','urgent')),
  status text not null check (status in ('open','in_progress','resolved','closed')),
  assigned_to text,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);
create index if not exists maintenance_requests_property_id_idx on public.maintenance_requests(property_id) where deleted_at is null;
create index if not exists maintenance_requests_status_idx on public.maintenance_requests(status) where deleted_at is null;
create trigger maintenance_requests_set_updated_at before update on public.maintenance_requests for each row execute function public.set_updated_at();
alter table public.maintenance_requests enable row level security;
create policy "Authenticated users can manage maintenance" on public.maintenance_requests for all to authenticated using (true) with check (true);
-- END SOURCE: supabase/migrations/20260513210000_phase_4_reports_maintenance.sql

-- BEGIN SOURCE: supabase/migrations/20260514011230_fix_all_security_advisors.sql
-- noop
-- END SOURCE: supabase/migrations/20260514011230_fix_all_security_advisors.sql

-- BEGIN SOURCE: supabase/migrations/20260514060000_fix_post_receipt_rpc_args.sql
drop function if exists public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text);

create function public.post_receipt_atomic(
  invoice_id uuid,
  amount numeric,
  method public.payment_method,
  date date,
  reference text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice public.invoices%rowtype;
  v_amount numeric := round(amount::numeric, 2);
begin
  select *
    into v_invoice
    from public.invoices
   where id = invoice_id
     and deleted_at is null
   for update;

  if v_invoice.id is null then
    raise exception 'Invoice not found';
  end if;

  if v_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if round((v_invoice.paid_amount + v_amount)::numeric, 2) > v_invoice.amount then
    raise exception 'Payment exceeds remaining balance';
  end if;

  insert into public.payments(invoice_id, amount, payment_method, payment_date, reference_number)
  values (v_invoice.id, v_amount, method, date, reference);

  update public.invoices
     set paid_amount = round((v_invoice.paid_amount + v_amount)::numeric, 2),
         status = case
           when round((v_invoice.paid_amount + v_amount)::numeric, 2) >= v_invoice.amount then 'paid'
           when round((v_invoice.paid_amount + v_amount)::numeric, 2) > 0 then 'partial'
           else status
         end
   where id = v_invoice.id;

  return 'ok';
end;
$$;
-- END SOURCE: supabase/migrations/20260514060000_fix_post_receipt_rpc_args.sql

-- BEGIN SOURCE: supabase/migrations/20260514061000_contract_integrity_guards.sql
alter table public.contracts
  drop constraint if exists contracts_unit_id_required;

alter table public.contracts
  add constraint contracts_unit_id_required check (unit_id is not null) not valid;

alter table public.contracts
  drop constraint if exists contracts_rent_amount_positive;

alter table public.contracts
  add constraint contracts_rent_amount_positive check (rent_amount > 0) not valid;
-- END SOURCE: supabase/migrations/20260514061000_contract_integrity_guards.sql

-- BEGIN SOURCE: supabase/migrations/20260514062000_contract_overlap_guard.sql
create or replace function public.prevent_active_contract_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null or new.status <> 'active' or new.unit_id is null then
    return new;
  end if;

  if exists (
    select 1
      from public.contracts existing
     where existing.id <> new.id
       and existing.deleted_at is null
       and existing.status = 'active'
       and existing.unit_id = new.unit_id
       and daterange(existing.start_date, existing.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')
  ) then
    raise exception 'Unit already has an overlapping active contract';
  end if;

  return new;
end;
$$;

drop trigger if exists contracts_prevent_active_overlap on public.contracts;

create trigger contracts_prevent_active_overlap
before insert or update of unit_id, start_date, end_date, status, deleted_at
on public.contracts
for each row
execute function public.prevent_active_contract_overlap();
-- END SOURCE: supabase/migrations/20260514062000_contract_overlap_guard.sql

-- BEGIN SOURCE: supabase/migrations/20260514063000_payment_immutability_guard.sql
create or replace function public.prevent_payment_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'payment records cannot be changed';
end;
$$;

drop trigger if exists payments_prevent_update on public.payments;
drop trigger if exists payments_prevent_delete on public.payments;

create trigger payments_prevent_update
before update on public.payments
for each row
execute function public.prevent_payment_mutation();

create trigger payments_prevent_delete
before delete on public.payments
for each row
execute function public.prevent_payment_mutation();
-- END SOURCE: supabase/migrations/20260514063000_payment_immutability_guard.sql

-- BEGIN SOURCE: supabase/migrations/20260514110000_security_rls_hardening.sql
-- Phase 5 security and RLS hardening.

-- 1) Normalize permissive RLS policies to deterministic authenticated checks.
do $$
declare
  t text;
  tables text[] := array[
    'properties','units','people','contracts','invoices','payments','expenses','maintenance_requests'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "Authenticated users can manage %s" on public.%I',
      case when t = 'maintenance_requests' then 'maintenance' else t end,
      t
    );

    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)',
      'authenticated_manage_' || t,
      t
    );
  end loop;
end
$$;

-- 2) Force RLS on tenant-facing tables to prevent owner bypass.
alter table public.properties force row level security;
alter table public.units force row level security;
alter table public.people force row level security;
alter table public.contracts force row level security;
alter table public.invoices force row level security;
alter table public.payments force row level security;
alter table public.expenses force row level security;
alter table public.maintenance_requests force row level security;

-- 3) SECURITY DEFINER hardening: lock down search_path and grants.
drop function if exists public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text);

create function public.post_receipt_atomic(p_invoice_id uuid, p_amount numeric, p_method public.payment_method, p_date date, p_reference text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_invoice public.invoices%rowtype;
begin
  select * into v_invoice from public.invoices where id = p_invoice_id and deleted_at is null for update;
  if v_invoice.id is null then raise exception 'Invoice not found'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if v_invoice.paid_amount + p_amount > v_invoice.amount then raise exception 'Payment exceeds remaining balance'; end if;

  insert into public.payments(invoice_id, amount, payment_method, payment_date, reference_number)
  values (p_invoice_id, round(p_amount::numeric,2), p_method, p_date, p_reference);

  update public.invoices
    set paid_amount = round((paid_amount + p_amount)::numeric,2),
        status = case
          when (paid_amount + p_amount) >= v_invoice.amount then 'paid'
          when (paid_amount + p_amount) > 0 then 'partial'
          else status
        end
  where id = p_invoice_id;

  return 'ok';
end; $$;

create or replace function public.generate_invoices_from_active_contracts()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  with generated as (
    insert into public.invoices (contract_id, issue_date, due_date, amount, paid_amount, status)
    select c.id, current_date, current_date + interval '10 day', round(c.rent_amount::numeric,2), 0, 'issued'
    from public.contracts c
    where c.status = 'active' and c.deleted_at is null
      and not exists (
        select 1
        from public.invoices i
        where i.contract_id = c.id
          and i.deleted_at is null
          and date_trunc('month', i.issue_date) = date_trunc('month', current_date)
      )
    returning id
  )
  select count(*)::integer from generated;
$$;

create or replace function public.rpt_financial_summary(month int, year int)
returns table(total_collected numeric, total_overdue_invoices numeric, total_expenses numeric, net_revenue numeric)
language sql
security definer
set search_path = public, pg_temp
as $$
  with c as (
    select coalesce(sum(amount),0)::numeric(12,2) v from public.payments where deleted_at is null and extract(month from payment_date)=month and extract(year from payment_date)=year
  ), o as (
    select coalesce(sum(amount-paid_amount),0)::numeric(12,2) v from public.invoices where deleted_at is null and status='overdue'
  ), e as (
    select coalesce(sum(amount),0)::numeric(12,2) v from public.expenses where deleted_at is null and extract(month from expense_date)=month and extract(year from expense_date)=year
  )
  select c.v, o.v, e.v, (c.v-e.v)::numeric(12,2) from c,o,e;
$$;

create or replace function public.renew_contract_atomic(contract_id uuid, new_start date, new_end date, new_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  original_contract public.contracts%rowtype;
  new_contract_id uuid;
begin
  if new_end < new_start then
    raise exception 'new_end must be greater than or equal to new_start';
  end if;

  if new_amount < 0 then
    raise exception 'new_amount must be greater than or equal to zero';
  end if;

  select * into original_contract
  from public.contracts
  where id = contract_id and deleted_at is null
  for update;

  if not found then
    raise exception 'contract not found';
  end if;

  update public.contracts
  set status = 'expired', updated_at = timezone('utc', now())
  where id = original_contract.id;

  insert into public.contracts (
    property_id, unit_id, tenant_id, start_date, end_date,
    rent_amount, payment_cycle, status, notes, renewed_from_id
  ) values (
    original_contract.property_id, original_contract.unit_id, original_contract.tenant_id,
    new_start, new_end, new_amount, original_contract.payment_cycle, 'draft',
    original_contract.notes, original_contract.id
  )
  returning id into new_contract_id;

  return new_contract_id;
end;
$$;

revoke execute on function public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text) from public, anon;
revoke execute on function public.generate_invoices_from_active_contracts() from public, anon;
revoke execute on function public.rpt_financial_summary(int, int) from public, anon;
revoke execute on function public.renew_contract_atomic(uuid, date, date, numeric) from public, anon;

grant execute on function public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text) to authenticated;
grant execute on function public.generate_invoices_from_active_contracts() to authenticated;
grant execute on function public.rpt_financial_summary(int, int) to authenticated;
grant execute on function public.renew_contract_atomic(uuid, date, date, numeric) to authenticated;

-- 4) Foreign-key index coverage for frequently joined rows.
create index if not exists payments_invoice_id_full_idx on public.payments(invoice_id);
create index if not exists expenses_property_id_full_idx on public.expenses(property_id);
create index if not exists invoices_contract_id_full_idx on public.invoices(contract_id);
create index if not exists contracts_property_id_full_idx on public.contracts(property_id);
create index if not exists contracts_tenant_id_full_idx on public.contracts(tenant_id);

-- END SOURCE: supabase/migrations/20260514110000_security_rls_hardening.sql

-- BEGIN SOURCE: supabase/migrations/20260515120000_company_settings.sql
-- Persisted company settings foundation.

create extension if not exists pgcrypto;

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key boolean not null default true,
  company_name text not null default 'Rentrix',
  legal_name text,
  tax_number text,
  registration_number text,
  phone text,
  email text,
  address text,
  city text,
  country text default 'Oman',
  currency text not null default 'OMR',
  locale text not null default 'ar-OM', -- NOSONAR: SQL migrations keep duplicated default/seed literals explicit for auditability.
  timezone text not null default 'Asia/Muscat',
  date_format text not null default 'dd/MM/yyyy',
  number_format text not null default 'ar-OM',
  logo_url text,
  invoice_prefix text not null default 'INV',
  receipt_prefix text not null default 'REC',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint company_settings_singleton_key_true check (singleton_key),
  constraint company_settings_singleton_key_unique unique (singleton_key),
  constraint company_settings_company_name_not_blank check (length(btrim(company_name)) > 0),
  constraint company_settings_currency_not_blank check (length(btrim(currency)) > 0),
  constraint company_settings_locale_not_blank check (length(btrim(locale)) > 0),
  constraint company_settings_timezone_not_blank check (length(btrim(timezone)) > 0),
  constraint company_settings_date_format_not_blank check (length(btrim(date_format)) > 0),
  constraint company_settings_number_format_not_blank check (length(btrim(number_format)) > 0),
  constraint company_settings_invoice_prefix_not_blank check (length(btrim(invoice_prefix)) > 0),
  constraint company_settings_receipt_prefix_not_blank check (length(btrim(receipt_prefix)) > 0)
);

drop trigger if exists company_settings_set_updated_at on public.company_settings;

create trigger company_settings_set_updated_at
before update on public.company_settings
for each row
execute function public.set_updated_at();

alter table public.company_settings enable row level security;
alter table public.company_settings force row level security;

drop policy if exists authenticated_read_company_settings on public.company_settings;
drop policy if exists authenticated_update_company_settings on public.company_settings;

create policy authenticated_read_company_settings
on public.company_settings
for select
to authenticated
using ((select auth.uid()) is not null);

create policy authenticated_update_company_settings
on public.company_settings
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null and singleton_key = true);

insert into public.company_settings (
  id,
  singleton_key,
  company_name,
  country,
  currency,
  locale,
  timezone,
  date_format,
  number_format,
  invoice_prefix,
  receipt_prefix
)
values (
  '00000000-0000-4000-8000-000000000001',
  true,
  'Rentrix',
  'Oman',
  'OMR',
  'ar-OM',
  'Asia/Muscat',
  'dd/MM/yyyy',
  'ar-OM',
  'INV',
  'REC'
)
on conflict (singleton_key) do nothing;
-- END SOURCE: supabase/migrations/20260515120000_company_settings.sql

-- BEGIN SOURCE: supabase/migrations/20260515130000_owner_relationship_foundation.sql
-- Owner relationship schema foundation.
-- Keeps properties.owner_name intact for compatibility; no backfill is performed here.

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  display_name text,
  phone text,
  email text,
  national_id text,
  tax_number text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint owners_full_name_not_blank check (length(btrim(full_name)) > 0)
);

create table if not exists public.property_owners (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete restrict,
  ownership_percentage numeric(5,2) not null default 100,
  is_primary boolean not null default true,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint property_owners_percentage_valid check (ownership_percentage > 0 and ownership_percentage <= 100),
  constraint property_owners_date_range_valid check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index if not exists owners_active_full_name_idx
on public.owners (is_active, full_name);

create index if not exists property_owners_property_id_idx
on public.property_owners (property_id);

create index if not exists property_owners_owner_id_idx
on public.property_owners (owner_id);

create unique index if not exists property_owners_active_unique_idx
on public.property_owners (property_id, owner_id)
where ends_on is null;

create index if not exists property_owners_active_property_idx
on public.property_owners (property_id, ends_on)
where ends_on is null;

do $$
begin
  if not exists (
    select 1
    from public.property_owners
    where ends_on is null
      and is_primary
    group by property_id
    having count(*) > 1
  ) then
    create unique index if not exists property_owners_active_primary_unique_idx
    on public.property_owners (property_id)
    where ends_on is null and is_primary;
  else
    raise notice 'Skipping property_owners_active_primary_unique_idx because duplicate active primary owner rows already exist.';
  end if;
end $$;

create or replace function public.validate_property_owner_active_totals()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_other_active_primary_count integer;
  v_other_active_percentage_total numeric;
begin
  if new.ends_on is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.property_id::text, 0));

  if new.is_primary then
    select count(*)
      into v_other_active_primary_count
      from public.property_owners
     where property_id = new.property_id
       and ends_on is null
       and is_primary
       and id <> new.id;

    if v_other_active_primary_count > 0 then
      raise exception 'Only one active primary owner is allowed per property.';
    end if;
  end if;

  select coalesce(sum(ownership_percentage), 0)
    into v_other_active_percentage_total
    from public.property_owners
   where property_id = new.property_id
     and ends_on is null
     and id <> new.id;

  if v_other_active_percentage_total + new.ownership_percentage > 100 then
    raise exception 'Active ownership percentages for a property cannot exceed 100.';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_property_owner_active_totals() from public, anon;
grant execute on function public.validate_property_owner_active_totals() to authenticated;

drop trigger if exists property_owners_validate_active_totals on public.property_owners;
create trigger property_owners_validate_active_totals
before insert or update of property_id, ownership_percentage, is_primary, ends_on
on public.property_owners
for each row
execute function public.validate_property_owner_active_totals();

drop trigger if exists owners_set_updated_at on public.owners;
create trigger owners_set_updated_at
before update on public.owners
for each row
execute function public.set_updated_at();

drop trigger if exists property_owners_set_updated_at on public.property_owners;
create trigger property_owners_set_updated_at
before update on public.property_owners
for each row
execute function public.set_updated_at();

alter table public.owners enable row level security;
alter table public.owners force row level security;

alter table public.property_owners enable row level security;
alter table public.property_owners force row level security;

drop policy if exists authenticated_manage_owners on public.owners;
create policy authenticated_manage_owners
on public.owners
for all
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

drop policy if exists authenticated_manage_property_owners on public.property_owners;
create policy authenticated_manage_property_owners
on public.property_owners
for all
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);
-- END SOURCE: supabase/migrations/20260515130000_owner_relationship_foundation.sql

-- BEGIN SOURCE: supabase/migrations/20260515200000_validate_contract_integrity_constraints.sql
do $$
begin
  if exists (
    select 1
      from public.contracts
     where unit_id is null
        or rent_amount is null
        or rent_amount <= 0
  ) then
    raise exception 'Cannot validate contract integrity constraints: existing contracts contain null unit_id or non-positive rent_amount values.';
  end if;
end;
$$;

alter table public.contracts
  validate constraint contracts_unit_id_required;

alter table public.contracts
  validate constraint contracts_rent_amount_positive;
-- END SOURCE: supabase/migrations/20260515200000_validate_contract_integrity_constraints.sql

-- BEGIN SOURCE: supabase/migrations/20260516110000_harden_post_receipt_authorization.sql
-- Harden the payment receipt write path without changing the frontend RPC payload.
--
-- The public.post_receipt_atomic argument names intentionally match the
-- Supabase RPC payload used by the frontend: invoice_id, amount, method, date,
-- and reference. This migration also removes direct authenticated writes to
-- payments so posted receipts are written through the guarded RPC path.

drop function if exists public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text);

create function public.post_receipt_atomic(
  invoice_id uuid,
  amount numeric,
  method public.payment_method,
  date date,
  reference text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user uuid := (select auth.uid());
  v_invoice public.invoices%rowtype;
  v_amount numeric(14, 2);
  v_remaining numeric(14, 2);
  v_new_paid_amount numeric(14, 2);
begin
  if v_auth_user is null then
    raise exception 'Authentication is required';
  end if;

  if amount is null or amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if date is null then
    raise exception 'Payment date is required';
  end if;

  v_amount := round(amount::numeric, 2);

  select i.*
    into v_invoice
    from public.invoices i
    join public.contracts c on c.id = i.contract_id
    join public.properties p on p.id = c.property_id
   where i.id = invoice_id
     and i.deleted_at is null
     and c.deleted_at is null
     and p.deleted_at is null
   for update of i;

  if v_invoice.id is null then
    raise exception 'Invoice not found';
  end if;

  v_remaining := round((v_invoice.amount - v_invoice.paid_amount)::numeric, 2);

  if v_amount > v_remaining then
    raise exception 'Payment exceeds remaining balance';
  end if;

  v_new_paid_amount := round((v_invoice.paid_amount + v_amount)::numeric, 2);

  insert into public.payments(invoice_id, amount, payment_method, payment_date, reference_number)
  values (v_invoice.id, v_amount, method, date, reference);

  update public.invoices
     set paid_amount = v_new_paid_amount,
         status = case
           when v_new_paid_amount >= v_invoice.amount then 'paid'
           when v_new_paid_amount > 0 then 'partial'
           else status
         end
   where id = v_invoice.id;

  return 'ok';
end;
$$;

revoke execute on function public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text) from public, anon;
grant execute on function public.post_receipt_atomic(uuid, numeric, public.payment_method, date, text) to authenticated;

drop policy if exists "Authenticated users can manage payments" on public.payments;
drop policy if exists authenticated_manage_payments on public.payments;

create policy authenticated_read_payments
on public.payments
for select
to authenticated
using ((select auth.uid()) is not null);
-- END SOURCE: supabase/migrations/20260516110000_harden_post_receipt_authorization.sql

-- BEGIN SOURCE: supabase/migrations/20260518102000_harden_rpc_execution_and_advisor_indexes.sql
-- Superseded migration.
--
-- This migration filename was seen by Supabase Branching during an earlier
-- failed preview-branch attempt. The guarded implementation now lives in:
--   20260518105500_harden_rpc_execution_retry.sql
--
-- Keep this file as an explicit no-op so production migration ordering remains
-- stable while avoiding duplicated SQL in SonarCloud new-code analysis.

select 1;
-- END SOURCE: supabase/migrations/20260518102000_harden_rpc_execution_and_advisor_indexes.sql

-- BEGIN SOURCE: supabase/migrations/20260518105500_harden_rpc_execution_retry.sql
-- Retry migration for Supabase preview branch apply.
--
-- The earlier migration filename had already been seen by Supabase Branching
-- after a failed attempt, so this new filename ensures the guarded version is
-- picked up as a new migration file.

begin;

do $$
declare
  rpc_signature text;
  rpc_functions text[] := array[
    'public.post_receipt_atomic(jsonb)',
    'public.renew_contract_atomic(uuid,jsonb)',
    'public.void_receipt_atomic(uuid,bigint,jsonb,jsonb)',
    'public.rpt_aged_receivables(date)',
    'public.rpt_balance_sheet(date)',
    'public.rpt_daily_collection(date,date)',
    'public.rpt_financial_summary(date,date)',
    'public.rpt_income_statement(date,date)',
    'public.rpt_overdue_invoices(date)',
    'public.rpt_owner_statement(uuid,date,date)',
    'public.rpt_rent_roll(date)',
    'public.rpt_tenant_statement(uuid)',
    'public.rpt_trial_balance(date)'
  ];
begin
  foreach rpc_signature in array rpc_functions loop
    if to_regprocedure(rpc_signature) is not null then
      execute format('alter function %s security invoker', rpc_signature);
      execute format('revoke execute on function %s from public', rpc_signature);
      execute format('grant execute on function %s to authenticated', rpc_signature);
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.automation_run_logs') is not null then
    create index if not exists idx_automation_run_logs_job_id
      on public.automation_run_logs(job_id);
  end if;
end $$;

commit;
-- END SOURCE: supabase/migrations/20260518105500_harden_rpc_execution_retry.sql

-- BEGIN SOURCE: supabase/migrations/20260518134500_harden_remaining_function_advisors.sql
-- Harden remaining Supabase function advisors discovered on the PR #536
-- preview branch after the first RPC hardening pass.
--
-- This migration intentionally excludes public.custom_access_token_hook(jsonb).
-- That function is an Auth custom access token hook. Its execution should be
-- limited to supabase_auth_admin, but changing it must be verified against the
-- Auth hook configuration to avoid breaking login/custom claims.

begin;

-- Fix mutable search_path warning for common trigger helper.
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'alter function public.set_updated_at() set search_path = public, pg_temp';
  end if;
end $$;

-- Legacy/app-facing RPC overloads remain callable by authenticated users,
-- but should not run with definer privileges.
do $$
declare
  fn text;
  invoker_functions text[] := array[
    'public.generate_invoices_from_active_contracts()',
    'public.post_receipt_atomic(uuid,numeric,public.payment_method,date,text)',
    'public.renew_contract_atomic(uuid,date,date,numeric)',
    'public.rpt_financial_summary(integer,integer)',
    'public.prevent_active_contract_overlap()',
    'public.prevent_payment_mutation()',
    'public.validate_property_owner_active_totals()'
  ];
begin
  foreach fn in array invoker_functions loop
    if to_regprocedure(fn) is not null then
      execute format('alter function %s security invoker', fn);
    end if;
  end loop;
end $$;

commit;
-- END SOURCE: supabase/migrations/20260518134500_harden_remaining_function_advisors.sql

-- BEGIN SOURCE: supabase/migrations/20260519120000_p0_harden_rls_user_scoped.sql
-- =============================================================================
-- P0 Security Hardening: Replace flat auth.role()='authenticated' RLS policies
-- with policies that verify the caller exists in public.users AND is not disabled.
--
-- WHY:
--   The previous policies allowed ANY Supabase-authenticated identity (including
--   service role leaks, stale tokens, or unregistered users) to read and write
--   every row. The correct check is: "does this auth.uid() correspond to an
--   active, registered application user?"
--
-- APPROACH:
--   1. Create a STABLE SECURITY DEFINER helper is_app_user() that returns TRUE
--      iff auth.uid() maps to a non-disabled row in public.users.
--      Using SECURITY DEFINER avoids infinite RLS recursion when querying users.
--   2. Replace every _all_auth policy on all business tables.
--   3. Tighten users table to let ADMIN read all user rows (needed for admin UI).
--   4. Keep write guards for sensitive tables (users: only own row; profiles: own).
--
-- REGRESSION SAFETY:
--   - No column changes, no data changes.
--   - All existing authenticated app users continue to work unchanged.
--   - RPCs (post_receipt_atomic, renew_contract_atomic, void_receipt_atomic) are
--     SECURITY DEFINER and bypass RLS internally — unaffected by this migration.
-- =============================================================================

begin;


-- Precondition: ensure public.users exists for hosted previews that may replay
-- this migration without prior compatibility bootstrap migrations.
create table if not exists public.users (
  id uuid primary key,
  role text,
  status text
);

alter table public.users
  add column if not exists role text,
  add column if not exists status text;

-- ---------------------------------------------------------------------------
-- 1. Helper: is_app_user()
--    Returns TRUE if auth.uid() is a registered, non-disabled application user.
--    SECURITY DEFINER + search_path='' to avoid RLS recursion on users table.
-- ---------------------------------------------------------------------------
create or replace function public.is_app_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'ACTIVE'
  );
$$;

-- Only authenticated role should call this helper
revoke execute on function public.is_app_user() from public, anon;
grant  execute on function public.is_app_user() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Helper: is_admin_or_manager()
--    Returns TRUE if the caller is ADMIN or MANAGER. Used for write guards
--    on sensitive reference tables.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role in ('ADMIN', 'MANAGER')
      and u.status = 'ACTIVE'
  );
$$;

revoke execute on function public.is_admin_or_manager() from public, anon;
grant  execute on function public.is_admin_or_manager() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Core business tables — replace flat policies with is_app_user() check
-- ---------------------------------------------------------------------------

-- Tables that get a simple "registered app user can do everything" policy.
-- Write-sensitive tables (users, profiles) are handled separately below.
do $$
declare
  t text;
  core_tables text[] := array[
    'properties','units','tenants','owners','contracts','invoices',
    'receipts','receipt_allocations','expenses','maintenance_records',
    'deposit_txs','journal_entries','accounts','account_balances',
    'owner_balances','owner_settlements','contract_balances','tenant_balances',
    'kpi_snapshots','snapshots','serials','governance','settings',
    'notification_templates','notifications','outgoing_notifications',
    'app_notifications','attachments','auto_backups','status_history',
    'status_transition_rules','automation_jobs','automation_run_logs',
    'budgets','commissions','leads','lands','missions','utility_bills',
    'payments','schema_refactor_notes'
  ];
begin
  foreach t in array core_tables loop
    -- Drop the old flat policy (handles both naming conventions used historically)
    execute format('drop policy if exists %I on public.%I', t || '_all_auth', t);
    execute format('drop policy if exists %I on public.%I', 'authenticated_manage_' || t, t);

    -- Create the new policy
    execute format(
      'create policy %I on public.%I for all to authenticated
       using  (public.is_app_user())
       with check (public.is_app_user())',
      'app_user_' || t,
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. audit_log — keep existing split policies, just harden the check
-- ---------------------------------------------------------------------------
drop policy if exists audit_log_select on public.audit_log;
drop policy if exists audit_log_insert on public.audit_log;

create policy audit_log_select
on public.audit_log for select to authenticated
using (public.is_app_user());

create policy audit_log_insert
on public.audit_log for insert to authenticated
with check (public.is_app_user());

-- ---------------------------------------------------------------------------
-- 5. users table — split into read/write with role awareness
--    - Any app user can read own row (needed for auth context)
--    - ADMIN can read ALL user rows (needed for user management UI)
--    - Any app user can update own row
--    - Only ADMIN can insert new users
-- ---------------------------------------------------------------------------
drop policy if exists "users can read own profile"   on public.users;
drop policy if exists "users can update own profile" on public.users;
drop policy if exists users_all_auth                 on public.users;
drop policy if exists app_user_users                 on public.users;

-- SELECT: own row always; admins see all
create policy users_select
on public.users for select to authenticated
using (
  (select auth.uid()) = id
  or public.is_admin_or_manager()
);

-- UPDATE: only own row (password changes, display name, etc.)
create policy users_update_own
on public.users for update to authenticated
using  ((select auth.uid()) = id and public.is_app_user())
with check ((select auth.uid()) = id);

-- INSERT: only ADMIN can create new app users
create policy users_insert_admin
on public.users for insert to authenticated
with check (public.is_admin_or_manager());

-- DELETE: only ADMIN (soft-delete preferred, but guard hard deletes)
create policy users_delete_admin
on public.users for delete to authenticated
using (public.is_admin_or_manager());

-- ---------------------------------------------------------------------------
-- 6. profiles table — keep own-row policies, already well-scoped
-- ---------------------------------------------------------------------------
-- profiles policies (profiles_select_own, profiles_insert_own,
-- profiles_update_own) are already correct — no changes needed.

-- ---------------------------------------------------------------------------
-- 7. sessions table — already uses auth.uid() IS NOT NULL; tighten to is_app_user
-- ---------------------------------------------------------------------------
drop policy if exists sessions_auth_policy on public.sessions;

create policy sessions_select_own
on public.sessions for select to authenticated
using ((select auth.uid()) = id or public.is_admin_or_manager());

create policy sessions_insert_own
on public.sessions for insert to authenticated
with check ((select auth.uid()) = id and public.is_app_user());

create policy sessions_delete_own
on public.sessions for delete to authenticated
using ((select auth.uid()) = id or public.is_admin_or_manager());

-- ---------------------------------------------------------------------------
-- 8. contracts table — drop the legacy contracts_auth_policy and replace
-- ---------------------------------------------------------------------------
drop policy if exists contracts_auth_policy on public.contracts;
drop policy if exists app_user_contracts    on public.contracts;

create policy app_user_contracts
on public.contracts for all to authenticated
using  (public.is_app_user())
with check (public.is_app_user());

-- ---------------------------------------------------------------------------
-- 9. Ensure FORCE ROW LEVEL SECURITY on all tables that store business data
--    (prevents table owners / service role bypasses from going unnoticed)
-- ---------------------------------------------------------------------------
alter table public.properties            force row level security;
alter table public.units                 force row level security;
alter table public.tenants               force row level security;
alter table public.owners                force row level security;
alter table public.contracts             force row level security;
alter table public.invoices              force row level security;
alter table public.receipts              force row level security;
alter table public.receipt_allocations   force row level security;
alter table public.expenses              force row level security;
alter table public.maintenance_records   force row level security;
alter table public.payments              force row level security;
alter table public.journal_entries       force row level security;
alter table public.deposit_txs           force row level security;
alter table public.accounts              force row level security;
alter table public.owner_settlements     force row level security;

commit;
-- END SOURCE: supabase/migrations/20260519120000_p0_harden_rls_user_scoped.sql
