-- Migration: fix_find_payment_account_id
-- Description: Corrects the find_payment_account_id() function to maintain text-based account resolution
-- and eliminate UUID casting errors.

CREATE OR REPLACE FUNCTION find_payment_account_id(
  p_org_id uuid,
  p_role text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM accounts
  WHERE org_id = p_org_id
    AND role = p_role
    AND deleted_at IS NULL
  LIMIT 1;
  
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Account not found for role: %', p_role;
  END IF;
  
  RETURN v_id;
END;
$$;

-- Revoke from public/authenticated, grant to postgres/service_role
REVOKE ALL ON FUNCTION find_payment_account_id(uuid, text) FROM public;
REVOKE ALL ON FUNCTION find_payment_account_id(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION find_payment_account_id(uuid, text) TO postgres;
GRANT EXECUTE ON FUNCTION find_payment_account_id(uuid, text) TO service_role;
