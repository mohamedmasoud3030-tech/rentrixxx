-- =============================================================================
-- 20260503115959_prepare_legacy_timestamp_defaults_for_replay.sql
--
-- Replay-compatibility shim for fresh Supabase Preview branches.
--
-- The historical 20260503120000_consolidate_schema_integrity.sql migration
-- converts legacy epoch-millisecond integer timestamps to timestamptz. PostgreSQL
-- cannot apply that ALTER TYPE while an integer column still has a default that
-- is not implicitly castable to timestamptz. Keep the historical migration
-- unchanged: normalize the affected legacy columns immediately before it runs.
--
-- Databases where the historical conversion has already completed contain
-- timestamptz columns, so every guarded branch below becomes a no-op.
-- =============================================================================

DO $$
DECLARE
  v_table        text;
  v_column       text;
  v_data_type    text;
  v_default_expr text;
  v_tables constant text[] := ARRAY[
    'profiles', 'owners', 'properties', 'units', 'tenants', 'contracts',
    'invoices', 'receipts', 'expenses', 'journal_entries', 'accounts',
    'receipt_allocations', 'owner_settlements', 'maintenance_records',
    'snapshots', 'kpi_snapshots', 'automation_runs', 'audit_log',
    'deposit_txs', 'commissions', 'leads', 'lands', 'missions', 'budgets',
    'attachments', 'auto_backups', 'app_notifications',
    'outgoing_notifications', 'notification_templates',
    'owner_balances', 'contract_balances', 'tenant_balances', 'account_balances'
  ];
  v_columns constant text[] := ARRAY['created_at', 'updated_at'];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    FOREACH v_column IN ARRAY v_columns LOOP
      v_data_type := NULL;
      v_default_expr := NULL;

      SELECT column_data_type.data_type, column_data_type.column_default
        INTO v_data_type, v_default_expr
      FROM information_schema.columns AS column_data_type
      WHERE column_data_type.table_schema = 'public'
        AND column_data_type.table_name = v_table
        AND column_data_type.column_name = v_column;

      IF v_data_type IN ('bigint', 'integer') THEN
        EXECUTE format(
          'ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT',
          v_table,
          v_column
        );

        EXECUTE format(
          'ALTER TABLE public.%I
             ALTER COLUMN %I TYPE timestamptz
             USING to_timestamp(%I::double precision / 1000.0)',
          v_table,
          v_column,
          v_column
        );

        IF v_default_expr IS NOT NULL THEN
          EXECUTE format(
            'ALTER TABLE public.%I
               ALTER COLUMN %I SET DEFAULT to_timestamp((%s)::double precision / 1000.0)',
            v_table,
            v_column,
            v_default_expr
          );
        END IF;

        RAISE NOTICE 'Prepared legacy timestamp %.% for replay', v_table, v_column;
      END IF;
    END LOOP;
  END LOOP;
END $$;
