# Full Technical Audit — March 30, 2026

## Scope
- Static architecture and code-quality review of the current frontend + Supabase integration.
- Focus areas: correctness, security, scalability, performance, structure, and UX resilience.

---

## Critical

1. **Owner portal auth is forgeable (no signature, no server validation).**
   - `generateOwnerLink` builds `auth` using `btoa(ownerId + ':' + Date.now())`.
   - `OwnerView` trusts any token that decodes to `{ownerId}:{recentTimestamp}`.
   - Impact: any user can generate valid links for any owner, exposing owner financial summaries.
   - Recommendation: replace with short-lived, signed token generated server-side (HMAC/JWT) and verified server-side before returning owner data.

2. **User-creation flow likely mutates active admin session.**
   - `addUser` calls `supabase.auth.signUp(...)` directly from the active client session.
   - In browser-client auth flows, `signUp` may create/switch auth context depending on project settings.
   - Impact: admin session instability or privilege confusion during user management.
   - Recommendation: move user provisioning to server-side admin API (Supabase service role via Edge Function) and keep browser on the current admin session.

3. **Serial generation is race-prone (non-atomic read-then-write).**
   - `incrementSerial` does `select(col)` then `update({ [col]: newVal })`.
   - Concurrent calls can return duplicate voucher numbers.
   - Impact: duplicate document IDs, ledger integrity issues.
   - Recommendation: use a DB-side atomic increment (`rpc`/SQL function or `UPDATE ... RETURNING` in one statement).

---

## Important

1. **N+1 write pattern in `bulkUpdate`.**
   - Loops each record and performs individual network update calls.
   - Impact: latency amplification and partial-write risk under high volume.
   - Recommendation: batch via RPC/upsert strategies and return per-row status map.

2. **Unbounded data loading (`getAllData`) for every refresh.**
   - Fetches many tables in full with `select('*')` and aggregates in memory.
   - Impact: slow startup, high memory/transfer cost as data grows.
   - Recommendation: introduce pagination, table-specific lazy loaders, and incremental invalidation.

3. **Monolithic context layer increases regression risk.**
   - `AppContext.tsx` is >1200 lines and mixes auth, business rules, accounting writes, notifications, and UI state.
   - Impact: low cohesion, difficult testability, fragile changes.
   - Recommendation: split into domain services/hooks (`auth`, `ledger`, `tenancy`, `settings`) and keep context as composition root.

4. **Access-control abstraction exists but is effectively unused.**
   - `canAccess` exists in context/type but no route/page consumption found.
   - Impact: confusing security posture; policy drift between intended and actual controls.
   - Recommendation: enforce centralized guard component + capability map per route/action.

5. **Build reproducibility issue (dependency lock drift).**
   - `package.json` targets React 19 typings while lockfile still references React 18 typing ranges.
   - Impact: CI instability and failed clean installs (`npm ci`).
   - Recommendation: regenerate lockfile from a clean install and enforce lock sync in CI.

6. **Service worker caches all same-origin GET responses indefinitely under one cache version.**
   - Generic cache-first strategy can serve stale shells/assets and potentially stale authenticated UX.
   - Recommendation: versioned asset precache + network-first for HTML shell + explicit cache invalidation strategy.

---

## Optional

1. **Gemini key and broad business context are handled client-side.**
   - API key stored in settings and used directly in browser requests.
   - Large summarized business context is sent in prompt.
   - Recommendation: proxy AI calls through backend, redact sensitive fields, and add audit/consent controls.

2. **Printing path writes raw HTML into popup document.**
   - `clone.innerHTML` is written directly into `printWindow.document`.
   - Recommendation: sanitize print content or render via controlled template-only serialization.

3. **UX gaps in long operations.**
   - Heavy refresh operations lack granular progress and optimistic updates.
   - Recommendation: add skeleton states, operation-specific spinners, and retry affordances per module.

4. **Logging hygiene.**
   - Several user-facing flows still log operational details to console.
   - Recommendation: central logger with environment-based log levels and structured error codes.

---

## Priority Remediation Plan

### Sprint 1 (Security + integrity)
- Secure owner-link flow with signed server-issued tokens.
- Move user creation to privileged backend endpoint.
- Replace serial increment with atomic database operation.

### Sprint 2 (Scalability + architecture)
- Refactor `getAllData` into modular loaders + pagination.
- Replace `bulkUpdate` loop with bulk RPC.
- Decompose `AppContext` into domain modules and test boundaries.

### Sprint 3 (Performance + UX)
- Rework service worker strategy.
- Improve long-running UX feedback and retries.
- Harden AI and printing flows with sanitization and least-privilege data exchange.
