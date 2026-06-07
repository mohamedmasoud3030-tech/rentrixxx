-- Migration: fix_sync_payment_reference_fields_search_path
-- Scope: security hardening — fix mutable search_path on trigger function
-- Roadmap: v0.1 Item 4 — Auth, RLS, and RPC least-privilege reconciliation
-- Date: 2026-06-07
--
-- Rationale:
--   public.sync_payment_reference_fields() is a trigger function (SECURITY INVOKER,
--   no arguments). The Security Advisor reports its search_path is mutable, which
--   allows a search_path injection attack if a malicious schema is prepended.
--   Fix: pin search_path = public, pg_temp as recommended by Supabase.
--
-- Safety:
--   - Function body is unchanged; only configuration is added.
--   - Trigger behavior (synchronise reference_number ↔ reference_no on payments)
--     is unaffected.
--   - Idempotent: SET search_path on an already-pinned function is a no-op.
--   - No data is read or written by this migration.

DO $$
BEGIN
  IF to_regprocedure('public.sync_payment_reference_fields()') IS NULL THEN
    RAISE NOTICE
      'Skipping search_path hardening because public.sync_payment_reference_fields() does not exist in this schema';
    RETURN;
  END IF;

  ALTER FUNCTION public.sync_payment_reference_fields()
    SET search_path = public, pg_temp;
END;
$$;
