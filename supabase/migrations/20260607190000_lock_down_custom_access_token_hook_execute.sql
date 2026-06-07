-- Restrict the Supabase Custom Access Token Hook to the Auth service only.
--
-- Live Security Advisor evidence captured on 2026-06-07 showed that
-- public.custom_access_token_hook(jsonb) was callable by anon and authenticated.
-- A browser client must never be able to invoke this SECURITY DEFINER hook.
--
-- Rollout boundary: validate this migration on an approved Supabase Preview
-- Branch before requesting an explicitly approved production apply.

DO $$
BEGIN
  IF to_regprocedure('public.custom_access_token_hook(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'public.custom_access_token_hook(jsonb) must exist before execute-grant lockdown';
  END IF;
END;
$$;

REVOKE ALL
  ON FUNCTION public.custom_access_token_hook(jsonb)
  FROM PUBLIC;

REVOKE ALL
  ON FUNCTION public.custom_access_token_hook(jsonb)
  FROM anon;

REVOKE ALL
  ON FUNCTION public.custom_access_token_hook(jsonb)
  FROM authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    RAISE EXCEPTION 'supabase_auth_admin role is required for the custom access token hook';
  END IF;

  GRANT EXECUTE
    ON FUNCTION public.custom_access_token_hook(jsonb)
    TO supabase_auth_admin;
END;
$$;
