-- Rentrix v18: auto-sync unit occupancy from active contracts

-- Function to sync unit status from contracts
CREATE OR REPLACE FUNCTION public.sync_unit_occupancy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_unit_id uuid;
  v_active_count integer;
BEGIN
  v_unit_id := COALESCE(NEW.unit_id, OLD.unit_id);

  IF v_unit_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check active contracts for the affected unit
  SELECT COUNT(*) INTO v_active_count
  FROM public.contracts
  WHERE unit_id = v_unit_id
    AND status = 'ACTIVE'
    AND deleted_at IS NULL;

  -- Update unit status based on active contracts
  UPDATE public.units
  SET status = CASE
    WHEN v_active_count > 0 THEN 'RENTED'
    ELSE 'AVAILABLE'
  END
  WHERE id = v_unit_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fire after any contract lifecycle change that can affect occupancy
DROP TRIGGER IF EXISTS after_contract_status_change ON public.contracts;
CREATE TRIGGER after_contract_status_change
AFTER INSERT OR UPDATE OF status, unit_id, deleted_at OR DELETE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.sync_unit_occupancy();

-- One-time sync to fix existing drift
UPDATE public.units u
SET status = CASE
  WHEN EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.unit_id = u.id
      AND c.status = 'ACTIVE'
      AND c.deleted_at IS NULL
  ) THEN 'RENTED'
  ELSE 'AVAILABLE'
END;
