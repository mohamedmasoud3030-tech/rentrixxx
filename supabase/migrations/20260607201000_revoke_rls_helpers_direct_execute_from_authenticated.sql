-- Migration: revoke_rls_helpers_direct_execute_from_authenticated
-- Scope: security hardening — remove direct RPC callability of RLS helper functions
-- Roadmap: v0.1 Item 4 — Auth, RLS, and RPC least-privilege reconciliation
-- Date: 2026-06-07
--
-- Rationale:
--   public.is_app_user() and public.is_admin_or_manager() are SECURITY DEFINER
--   helper functions used exclusively inside RLS policies. They should not be
--   callable directly by browser clients via /rest/v1/rpc/.
--
--   The Security Advisor flags both as callable by the `authenticated` role.
--   Revoking EXECUTE from `authenticated` removes the direct-call surface while
--   preserving all RLS policy behavior, because:
--     1. RLS policies run in the security context of the table owner (postgres).
--     2. postgres retains EXECUTE on both functions (see proacl evidence).
--     3. service_role retains EXECUTE on both functions (for internal Supabase use).
--     4. No browser-facing contract requires direct invocation of these helpers.
--
-- Dependency evidence (verified read-only 2026-06-07):
--   - is_app_user() used in ~40 app_user_* RLS policies + sessions_insert_own + users_update_own
--   - is_admin_or_manager() used in sessions_select_own, sessions_delete_own,
--     users_select, users_delete_admin, users_insert_admin
--   - All tables owned by postgres → RLS evaluates as postgres, not authenticated
--   - No application code calls these functions via RPC directly
--   - Removing authenticated EXECUTE does not affect RLS enforcement
--
-- Idempotency:
--   REVOKE on a role that already lacks the privilege is a no-op in Postgres.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_app_user'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION
      'is_app_user not found — migration cannot proceed safely';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_admin_or_manager'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION
      'is_admin_or_manager not found — migration cannot proceed safely';
  END IF;
END;
$$;

-- Revoke direct RPC call surface from browser-facing roles
REVOKE EXECUTE ON FUNCTION public.is_app_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_app_user() FROM anon;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_manager() FROM anon;

-- postgres and service_role retain EXECUTE (required for RLS + internal operations)
-- No grant changes needed for those roles.
