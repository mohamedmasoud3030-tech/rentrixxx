-- Migration: fix_find_payment_account_id
-- Description: Corrects the find_payment_account_id() function to maintain text-based account resolution
-- and eliminate UUID casting errors.

CREATE OR REPLACE FUNCTION public.find_payment_account_id(account_role text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_target_no text;
  v_account_id text;
BEGIN
  CASE account_role
    WHEN 'cash' THEN v_target_no := '1111';
    WHEN 'receivable' THEN v_target_no := '1201';
    ELSE RETURN NULL;
  END CASE;

  SELECT id INTO v_account_id
  FROM public.accounts
  WHERE no = v_target_no
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Account not found for role: %', account_role;
  END IF;

  RETURN v_account_id;
END;
$$;

-- Revoke from public/authenticated, grant to postgres/service_role
REVOKE ALL ON FUNCTION public.find_payment_account_id(text) FROM public;
REVOKE ALL ON FUNCTION public.find_payment_account_id(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.find_payment_account_id(text) TO postgres;
GRANT EXECUTE ON FUNCTION public.find_payment_account_id(text) TO service_role;
