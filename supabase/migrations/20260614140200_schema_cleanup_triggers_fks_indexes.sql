-- =============================================================================
-- Migration: 20260614140200_schema_cleanup_triggers_fks_indexes
-- Priority: P3 (HIGH-1) + P4 (MEDIUM-1) + P5 (MEDIUM-2) + P6 (LOW-1)
-- Date: 2026-06-13
--
-- Pure cleanup, zero behavioral risk:
--  P3: drop duplicate updated_at triggers on invoices/receipts
--  P4: drop the older properties.owner_id FK whose implicit NO ACTION
--      makes the sibling constraint's ON DELETE SET NULL unreachable
--  P5: drop 4 duplicate FK constraints (identical definitions, dup names)
--  P6: add 3 missing indexes on FK columns
-- =============================================================================

BEGIN;

-- ── P3: duplicate updated_at triggers ────────────────────────────────────
DROP TRIGGER IF EXISTS invoices_updated_at ON public.invoices;
DROP TRIGGER IF EXISTS receipts_updated_at ON public.receipts;
-- Keep set_invoices_updated_at / set_receipts_updated_at

-- ── P4: conflicting properties.owner_id FKs ──────────────────────────────
-- properties_owner_fk (implicit NO ACTION) always fires first and makes
-- properties_owner_id_fkey's "ON DELETE SET NULL DEFERRABLE" unreachable.
-- Drop the older unqualified constraint; keep the one with intended
-- ON DELETE SET NULL / ON UPDATE CASCADE behavior.
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_owner_fk;

-- ── P5: duplicate FK constraints (identical definitions) ─────────────────
ALTER TABLE public.units DROP CONSTRAINT IF EXISTS units_property_fk;
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_contract_fk;
ALTER TABLE public.receipt_allocations DROP CONSTRAINT IF EXISTS receipt_allocations_invoice_fk;
ALTER TABLE public.receipt_allocations DROP CONSTRAINT IF EXISTS receipt_allocations_receipt_fk;
ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_account_fk;

-- ── P6: missing indexes on FK columns ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_automation_run_logs_job_id ON public.automation_run_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_job_id ON public.automation_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_contracts_renewed_from_id ON public.contracts(renewed_from_id);

COMMIT;
