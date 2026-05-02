-- Rentrix v17: contracts soft-delete guard

-- Add soft delete column
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.contracts.deleted_at IS
'Soft delete timestamp. NULL = active. Non-null = deleted. Hard delete is blocked by application logic when financial links exist.';

-- Guard hard deletes when financial links exist
CREATE OR REPLACE FUNCTION public.guard_contract_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_count integer;
  v_receipt_count integer;
BEGIN
  SELECT COUNT(*) INTO v_invoice_count
  FROM public.invoices
  WHERE contract_id = OLD.id;

  SELECT COUNT(*) INTO v_receipt_count
  FROM public.receipts
  WHERE contract_id = OLD.id;

  IF v_invoice_count > 0 OR v_receipt_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete contract with linked financial records. Use soft delete instead.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS before_contract_hard_delete ON public.contracts;
CREATE TRIGGER before_contract_hard_delete
BEFORE DELETE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.guard_contract_delete();

-- Update contracts SELECT policy to hide soft-deleted contracts
DROP POLICY IF EXISTS "contracts_select_owner_tenant" ON public.contracts;
CREATE POLICY "contracts_select_owner_tenant" ON public.contracts
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    is_tenant(tenant_id)
    OR is_owner((select p.owner_id from units u join properties p on u.property_id = p.id where u.id = unit_id))
  )
);
