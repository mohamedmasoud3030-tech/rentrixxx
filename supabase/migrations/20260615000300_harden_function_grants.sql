-- =============================================================================
-- Migration: 20260615000300_harden_function_grants
-- Date: 2026-06-15
-- Priority: P1-SECURITY
--
-- ISSUE: Several internal functions were inadvertently grantable to anon/public
-- or to authenticated users who should not call them directly:
--
--   find_payment_account_id(text) — internal helper called only by
--     record_invoice_payment_atomic; anon had EXECUTE.
--
--   void_receipt_atomic(uuid,bigint,jsonb,jsonb) — internal 4-arg implementation;
--     only the (jsonb) wrapper is the public API. authenticated had EXECUTE on
--     the raw 4-arg overload, bypassing the idempotency/auth wrapper.
--
--   recalculate_all_balances() — maintenance function; anon had EXECUTE.
--
--   post_receipt_atomic(jsonb) — internal; called only by
--     record_invoice_payment_atomic. authenticated had EXECUTE, allowing
--     receipt posting bypassing invoice validation and idempotency.
--
-- FIX: tighten grants to least-privilege.
-- =============================================================================

-- 1. find_payment_account_id: postgres + service_role only
REVOKE ALL ON FUNCTION public.find_payment_account_id(text) FROM anon, public;

-- 2. void_receipt_atomic 4-arg: postgres + service_role only (internal impl)
REVOKE ALL ON FUNCTION public.void_receipt_atomic(uuid, bigint, jsonb, jsonb)
  FROM anon, public, authenticated;
-- (jsonb) wrapper is the authenticated API — keep EXECUTE
GRANT EXECUTE ON FUNCTION public.void_receipt_atomic(jsonb) TO authenticated;

-- 3. recalculate_all_balances: authenticated + service_role (admin maintenance)
REVOKE ALL ON FUNCTION public.recalculate_all_balances() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.recalculate_all_balances() TO authenticated, service_role;

-- 4. post_receipt_atomic: postgres + service_role only (internal)
REVOKE ALL ON FUNCTION public.post_receipt_atomic(jsonb)
  FROM anon, public, authenticated;
