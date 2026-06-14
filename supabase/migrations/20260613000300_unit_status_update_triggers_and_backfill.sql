-- =============================================================================
-- Migration: 20260613000300_unit_status_update_triggers_and_backfill
-- Priority: P1 (CRITICAL-2)
-- Date: 2026-06-13
--
-- ISSUE: trigger_update_unit_status_on_contract and
--   trigger_update_unit_status_on_maintenance only fire on AFTER INSERT.
--   A contract terminated via UPDATE (without a renewal insert) leaves the
--   unit stuck as OCCUPIED. A maintenance record closed via UPDATE leaves
--   the unit stuck as MAINTENANCE.
--
-- FIX: add AFTER UPDATE triggers on the relevant columns, then run a one-time
--   backfill to correct any units already in a stale state.
-- =============================================================================

BEGIN;

-- Guard
DO $$
BEGIN
  IF to_regprocedure('public.update_unit_status()') IS NULL THEN
    RAISE EXCEPTION 'update_unit_status() not found — cannot proceed';
  END IF;
END;
$$;

-- New UPDATE trigger on contracts: fires when status, deleted_at, or unit_id changes
CREATE TRIGGER trigger_update_unit_status_on_contract_update
  AFTER UPDATE OF status, deleted_at, unit_id ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_unit_status();

-- New UPDATE trigger on maintenance_records: fires when status or deleted_at changes
CREATE TRIGGER trigger_update_unit_status_on_maintenance_update
  AFTER UPDATE OF status, deleted_at ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_unit_status();

-- One-time backfill: recompute status for every unit currently in an
-- inconsistent state (OCCUPIED with no active contract, or MAINTENANCE
-- with no open maintenance record).
DO $$
DECLARE
  v_unit record;
BEGIN
  FOR v_unit IN
    SELECT u.id
    FROM public.units u
    WHERE
      (
        u.status = 'OCCUPIED'
        AND NOT EXISTS (
          SELECT 1 FROM public.contracts c
          WHERE c.unit_id = u.id AND c.status = 'ACTIVE' AND c.deleted_at IS NULL
        )
      )
      OR
      (
        u.status = 'MAINTENANCE'
        AND NOT EXISTS (
          SELECT 1 FROM public.maintenance_records m
          WHERE m.unit_id = u.id
            AND m.status IN ('REPORTED','ASSIGNED','IN_PROGRESS')
            AND m.deleted_at IS NULL
        )
      )
  LOOP
    -- Recompute using the same logic as update_unit_status()
    IF EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.unit_id = v_unit.id AND c.status = 'ACTIVE' AND c.deleted_at IS NULL
    ) THEN
      UPDATE public.units SET status = 'OCCUPIED' WHERE id = v_unit.id;
    ELSIF EXISTS (
      SELECT 1 FROM public.maintenance_records m
      WHERE m.unit_id = v_unit.id
        AND m.status IN ('REPORTED','ASSIGNED','IN_PROGRESS')
        AND m.deleted_at IS NULL
    ) THEN
      UPDATE public.units SET status = 'MAINTENANCE' WHERE id = v_unit.id;
    ELSE
      UPDATE public.units SET status = 'AVAILABLE' WHERE id = v_unit.id;
    END IF;
  END LOOP;
END;
$$;

COMMIT;
