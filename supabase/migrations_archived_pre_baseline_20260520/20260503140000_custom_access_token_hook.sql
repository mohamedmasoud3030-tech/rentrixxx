-- =============================================================================
-- 20260503140000_custom_access_token_hook.sql
--
-- Creates a Supabase Custom Access Token Hook that injects the application
-- role (ADMIN/USER from public.profiles) into every JWT's app_metadata.
--
-- Why this is needed:
--   Supabase does not include application-level roles in JWTs by default.
--   The API server's requireAuth middleware reads app_metadata.user_role to
--   enforce requireRole('ADMIN') guards. Without this hook, every token falls
--   back to 'USER', making ADMIN-only routes unenforceable.
--
-- How it works:
--   GoTrue calls this function before signing each JWT. The function reads
--   public.profiles.role for the authenticating user and injects it as
--   app_metadata.user_role. The middleware in auth.ts reads this claim.
--
-- After applying this migration you MUST register the hook in Supabase:
--   Dashboard → Authentication → Hooks → Custom Access Token Hook
--   URI: pg-functions://postgres/public/custom_access_token_hook
--
-- OR via Supabase management API:
--   PATCH https://api.supabase.com/v1/projects/{ref}/config/auth
--   Body: {
--     "hook_custom_access_token_enabled": true,
--     "hook_custom_access_token_uri": "pg-functions://postgres/public/custom_access_token_hook"
--   }
--
-- Idempotent: safe to re-run on already-configured databases.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
-- Pin search_path to prevent search_path injection attacks
SET search_path = public
AS $$
DECLARE
  claims       jsonb;
  profile_role text;
BEGIN
  -- Look up the user's application role from the profiles table.
  -- Profiles are created by the application on first sign-in.
  -- Falls back to 'USER' if no profile row exists for this auth user.
  SELECT role
    INTO profile_role
    FROM public.profiles
   WHERE id = (event->>'user_id')::uuid;

  -- Start with the existing claims provided by GoTrue.
  claims := event -> 'claims';

  -- Ensure app_metadata object exists before setting a nested key.
  IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  -- Inject user_role into app_metadata.
  -- auth.ts reads: payload.app_metadata.user_role
  claims := jsonb_set(
    claims,
    '{app_metadata, user_role}',
    to_jsonb(COALESCE(profile_role, 'USER'))
  );

  -- Return the full event with updated claims back to GoTrue.
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Grant execute to the Supabase auth admin role so GoTrue can invoke the hook.
-- The supabase_auth_admin role exists in Supabase-managed deployments but is
-- NOT exposed through the pgBouncer pooler; the DO block makes this idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin';
  END IF;
END;
$$;

-- Revoke from PUBLIC — only supabase_auth_admin should call this function.
REVOKE EXECUTE
  ON FUNCTION public.custom_access_token_hook(jsonb)
  FROM PUBLIC;
