-- =============================================================================
-- Fix: add missing debit_total / credit_total columns to account_balances
-- =============================================================================
--
-- Root cause:
--   Migration 20260503115959 added these columns conditionally:
--     IF to_regclass('public.account_balances') IS NULL → RETURN (skip)
--   On the live DB, account_balances did not exist at that point in migration
--   replay, so the ALTER TABLE was skipped and the columns were never created.
--
--   Migration 20260503120000 (local-only, never applied to remote) assumed the
--   columns already existed and built the v_balance_reconciliation view on top
--   of them — causing:
--     ERROR: column "debit_total" does not exist (SQLSTATE 42703)
--
-- Fix:
--   Add the columns unconditionally with IF NOT EXISTS (idempotent).
--   Backfill from existing `balance` column if present (legacy data path).
--   No data loss — defaults to 0 for new rows.
-- =============================================================================

DO $$
BEGIN
  -- Guard: skip if table doesn't exist at all
  IF to_regclass('public.account_balances') IS NULL THEN
    RAISE NOTICE 'account_balances does not exist — skipping column fix.';
    RETURN;
  END IF;

  -- Add columns if they don't exist yet
  ALTER TABLE public.account_balances
    ADD COLUMN IF NOT EXISTS debit_total  numeric NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS credit_total numeric NOT NULL DEFAULT 0;

  -- Backfill from legacy `balance` column if it exists and columns are zero
  IF EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'account_balances'
      AND  column_name  = 'balance'
  ) THEN
    UPDATE public.account_balances
    SET
      debit_total = CASE
        WHEN COALESCE(balance, 0) >= 0 THEN COALESCE(balance, 0)
        ELSE 0
      END,
      credit_total = CASE
        WHEN COALESCE(balance, 0) < 0 THEN ABS(COALESCE(balance, 0))
        ELSE 0
      END
    WHERE COALESCE(debit_total,  0) = 0
      AND COALESCE(credit_total, 0) = 0;
  END IF;

  RAISE NOTICE 'account_balances columns debit_total/credit_total ensured.';
END $$;
