# Post-Remediation Verification Audit (March 30, 2026)

## ✅ Verified Safe Areas

1. **Admin user provisioning trust boundary is substantially improved**
   - Browser no longer calls `supabase.auth.signUp` for admin provisioning.
   - `admin-create-user` checks requester identity from JWT and enforces `profiles.role = ADMIN` before service-role user creation.

2. **Serial generation race condition is remediated**
   - `increment_serial` function performs DB-side atomic update and returns incremented value.
   - Frontend now calls RPC (`increment_serial`) instead of client read-then-write.

3. **Route-level capability guard is now centralized and reusable**
   - `ProtectedRoute` checks auth + capability and redirects safely.
   - Finance/audit/settings/smart-assistant are now wrapped with route guards.

4. **Service worker cache invalidation model is safer than previous cache-first global cache**
   - Uses versioned static/runtime caches.
   - Uses network-first for HTML/navigation and controlled fallback.

5. **Assistant integration now avoids direct provider key in frontend request path**
   - Frontend delegates to edge proxy (`assistant-proxy`).

---

## ⚠️ Potential Regressions

1. **Smart Assistant access regression for non-admin users**
   - Route now requires `USE_SMART_ASSISTANT` capability.
   - Current capability map grants this only to `ADMIN`.
   - If non-admin assistant access was intended before, this is a functional regression.

2. **Recent-table loading may silently empty some datasets**
   - `fetchRecent` hardcodes `order('created_at')`.
   - Some limited tables historically use `ts`/other fields; those queries can fail and return `[]`.
   - This can hide records (audit/notifications/snapshots) without obvious UI error.

3. **OwnerPortal legacy route still uses old client-side token model**
   - `/portal/:ownerId` still validates against `owner.portalToken` in client state.
   - This introduces policy inconsistency vs the new verified owner-view flow.

4. **Edge proxying introduces expected latency and new runtime dependency**
   - Assistant and owner-link workflows now depend on edge function availability and cold-start latency.
   - UX continuity depends on robust timeout/retry telemetry (partially present in app refresh path only).

---

## 🔴 Critical Remaining Risks

1. **Owner token issuance endpoint has no caller authorization**
   - `owner-access-token` accepts `action: 'issue'` from any caller and signs arbitrary `ownerId`.
   - This defeats the intended trust boundary because unauthorized callers can mint valid owner tokens.
   - Severity: **Critical** (direct data exposure path via valid signed token generation).

2. **Assistant proxy lacks auth/rate-limiting gate**
   - `assistant-proxy` currently processes requests without caller auth enforcement.
   - This can lead to abuse/cost amplification and prompt exfiltration surface growth.
   - Severity: **High** (operational/security cost risk).

---

## 🧪 Suggested automated tests to add

1. **Edge function security tests (integration)**
   - `owner-access-token`:
     - unauthenticated issue should be denied
     - tampered signature should fail
     - expired token should fail
     - owner mismatch should fail
   - `admin-create-user`:
     - USER role requester denied
     - ADMIN requester allowed
     - malformed payload rejected

2. **Concurrency test for serial increment**
   - Run N parallel `increment_serial` calls and assert uniqueness + monotonicity.

3. **Route authorization snapshot tests**
   - Assert USER cannot access admin routes.
   - Assert intended roles for smart assistant route.

4. **Data-loader regression tests**
   - Verify limited tables still return records even when `created_at` is absent.
   - Ensure fallback ordering strategy exists.

5. **Service worker behavior tests (E2E/PWA)**
   - Navigation request is network-first.
   - Old cache versions are pruned after activate.

---

## Production readiness score

**78 / 100**

- Strong improvements in architecture direction and key remediation scaffolding.
- Score reduced due to one critical trust-boundary gap (`owner-access-token` issue endpoint auth), plus high-risk assistant proxy exposure and a few likely functional regressions.
