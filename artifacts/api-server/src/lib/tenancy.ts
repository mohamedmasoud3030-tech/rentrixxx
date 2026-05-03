/**
 * Multi-tenant enforcement helper.
 *
 * When MULTI_TENANT_STRICT=true the API refuses to serve any data when the
 * caller's JWT lacks an organization_id in app_metadata. This prevents
 * cross-tenant data leakage in multi-tenant deployments whose Supabase custom
 * access token hook has not yet been configured (or the hook is misconfigured).
 *
 * Set MULTI_TENANT_STRICT=true in production once the Supabase custom access
 * token hook is active and injecting organization_id into app_metadata.
 * Leave it unset (or false) for single-tenant deployments where no hook is
 * required — those continue to return the full dataset for any authenticated user.
 */
export const MULTI_TENANT_STRICT =
  (process.env["MULTI_TENANT_STRICT"] ?? "").toLowerCase() === "true";
