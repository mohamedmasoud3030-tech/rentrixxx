## Current State Report — Rentrix

### Summary
Rentrix has a relatively mature core architecture (React + Vite + Supabase) with working CRUD, financial posting flows, lazy-loaded route modules, and a guarded auth/session baseline. The system is functionally broad, but access control is inconsistent at route level (many operational pages are authenticated-only but not capability-gated), and some implementation details are brittle or internally inconsistent. Financial logic is largely implemented (invoicing, receipts, allocations, journal entries, owner settlements), but there are correctness risks around status enums and migration/code alignment. CI is solid for build/test/type/lint and optional schema drift checks, but deployment automation is not defined in-repo. During this audit, dead files were removed and root-level orphan SQL migration files were cleaned up.

### Completed & Working
- Routing shell is in place with auth branching (public owner portal, login, forced password-change path, authenticated app layout).
- Lazy loading is active for major pages in `App.tsx`, and financial module is split into nested routes in `Finance.tsx`.
- RBAC model exists with explicit capabilities (`ADMIN`, `USER`, `ACCOUNTANT`, `MANAGER`, `VIEWER`) and reusable `ProtectedRoute` capability guard.
- Auth flow covers: login (`supabase.auth.signInWithPassword`), session bootstrap (`getSession`), auth-state listener (`onAuthStateChange`), logout (`signOut`), forced password change, admin user creation via edge function.
- Financial subsystem includes:
  - VAT and rounding standards (`calcVAT`, `round3`, proportional distribution)
  - Invoice generation and status derivation
  - Receipt posting with allocations and atomic RPC
  - Journal posting + reversal paths
  - Owner settlement UI + persistence
- `supabaseDataService` includes broad table mapping, camel/snake conversion, generic CRUD, pagination (`fetchPaginated`), bulk update/upsert, and settings/governance/serial helpers.
- Edge functions exist and are wired for admin user creation, assistant proxy, automation scheduler, and owner access token.
- CI workflow runs on push/PR and executes preflight, optional Supabase schema drift check, typecheck, lint, tests, build.

### Incomplete or Broken
- Route protection is inconsistent: only selected paths use capability guards (`/financial/*`, `/smart-assistant`, admin-only `/audit-log`, `/settings/*`), while core routes like `/properties`, `/tenants`, `/owners`, `/contracts`, `/maintenance`, `/reports`, `/leads` are not capability-gated at route layer.
- `terminateContract` in `operationsService` sets status `TERMINATED`, while primary `Contract` type status union is `'ACTIVE' | 'ENDED' | 'SUSPENDED'` (type/runtime mismatch risk).
- `check_unit_maintenance_block` migration checks statuses `('NEW', 'IN_PROGRESS')`, but app-level maintenance state transitions are `PENDING | IN_PROGRESS | COMPLETED | CANCELLED` (guard can silently miss blockers).
- `automation-scheduler` has an explicit stub: `autoRebuildSnapshots = async (): Promise<boolean> => true;` (no real snapshot rebuild implementation).
- Schema drift check in CI is conditional on secrets; when secrets are absent, drift check is skipped.
- No explicit Vercel deploy job/workflow in `.github/workflows` (deployment likely external/manual).

### Missing Features
- No complete route-level authorization matrix enforcement for non-admin, non-finance modules (capability model exists but is under-applied).
- No true realtime subscription pipeline in `supabaseDataService` (poll/fetch-based loading only; no channel listeners in service API).
- No visible in-repo automated deployment workflow to Vercel.
- Several app “health” capabilities are advisory only (audit findings/reporting) without an automated remediation pipeline.

### Bugs & Risks
- **HIGH** — Authorization gap: authenticated users can navigate to several high-impact pages without route capability guard checks.
- **HIGH** — Status enum drift (`TERMINATED` vs `Contract` type union) can produce runtime data states not safely represented in TypeScript.
- **HIGH** — Maintenance blocker SQL expects `NEW`, but application writes `PENDING`; this can allow prohibited actions to pass.
- **MEDIUM** — Automation snapshot rebuild is a stub, so automation reporting can signal success without actual work.
- **MEDIUM** — Financial route aliasing still references legacy `/finance/*` links while top-level routing is `/financial/*`; mitigated by redirects but increases complexity/risk.
- **LOW** — `supabaseDataService` in-memory cache is simple and non-reactive (staleness risk under concurrent clients).
- **LOW** — CI schema drift validation is non-mandatory depending on secret availability.

### Recommended Next Tasks (Priority Order)
1. Enforce capability guards for **all** sensitive operational routes, not just finance/settings/audit/assistant.
2. Resolve domain status mismatches (`Contract` status union, `TERMINATED` handling, SQL status constants).
3. Align maintenance guard migration (`NEW` vs `PENDING`) and add regression tests for blocking logic.
4. Implement real snapshot rebuild in automation scheduler (replace stub) and add validation telemetry.
5. Add Supabase realtime subscription strategy (or explicit refresh strategy) for critical financial tables.
6. Add/verify an explicit deployment pipeline (if intended) for Vercel, including environment validation gates.
7. Expand typecheck scope (`tsconfig.typecheck.json`) to cover the full `src/` tree.

---

## Audit Evidence by Requested Area

### 1) ROUTING & PAGES
- **Routes in `App.tsx`:**
  - Public: `/owner-view/:ownerId`, `/portal/:ownerId`, `/login`
  - Authenticated: `/`, `/properties`, `/tenants`, `/owners`, `/owners/:ownerId/hub`, `/contracts`, `/maintenance`, `/financial/*`, `/leads`, `/communication`, `/lands`, `/commissions`, `/reports`, `/smart-assistant`
  - Admin-only mounted: `/audit-log`, `/settings/*`
  - Wildcards redirect to `/login` or `/` depending on auth state.
- **Protection quality:** partially correct; not all routes are capability-wrapped.
- **Orphan pages:** after scan, no page listed in `src/pages` is fully orphaned. `DataIntegrityAudit` is mounted via settings sub-routes; `PropertyMap` is used inside `Properties` tab flow.

### 2) AUTHENTICATION & RBAC
- **Roles:** `ADMIN`, `USER`, `ACCOUNTANT`, `MANAGER`, `VIEWER`.
- **Capabilities:** defined in `src/config/rbac.ts`; ADMIN gets all; others receive subsets.
- **Auth flow completeness:** login, logout, session bootstrap, auth state changes, forced password change are implemented. Password change updates Supabase auth + profile flag.

### 3) FINANCIAL SYSTEM
- **Implemented operations:** invoice generation, receipt posting with allocations, expense and voucher flows, journal creation/reversal, arrears derivation, owner settlements.
- **Invoice generation:** implemented in app core and automation service/scheduler.
- **Receipt/payment flow:** implemented with atomic posting RPC and allocation validations.
- **Journal system:** implemented (auto and manual vouchers, reversals).
- **Owner settlements:** implemented in `Financials` view and persisted via data service.

### 4) DATA LAYER
- **Completeness:** `supabaseDataService` is extensive and covers most domain tables.
- **Potential missing/fragile areas:** no explicit realtime subscription interface; cache invalidation is basic.
- **Pagination:** implemented via `fetchPaginated` using range/count.
- **Realtime loading:** not implemented in service-level API.

### 5) EDGE FUNCTIONS
- `admin-create-user`: admin-authenticated user provisioning + profile creation.
- `assistant-proxy`: capability-checked Gemini relay with per-user rate limiting.
- `automation-scheduler`: runs periodic automation tasks (invoices, late fees, notifications) and logs runs.
- `owner-access-token`: issues/verifies signed owner portal token and returns owner summary stats.
- **Incomplete/broken signals:** snapshot rebuild in automation scheduler is currently a stub.

### 6) DATABASE MIGRATIONS
- Present migrations:
  - `v14_automation_cron.sql`
  - `v15_atomic_receipt_posting.sql`
  - `v16_atomic_contract_renewal.sql`
  - `v17_contract_soft_delete.sql`
  - `v18_unit_occupancy_sync.sql`
  - `v19_maintenance_contract_guard.sql`
- **Order:** filenames are monotonic and correctly ordered.
- **Concerns:** status constants in `v19` appear mismatched to app enums.

### 7) CI/CD
- **Pipeline completeness:** CI covers preflight, optional Supabase checks, typecheck, lint, tests, build.
- **Push behavior:** runs on every push and PR.
- **Schema drift check:** works when required secrets are present; otherwise skipped.
- **Vercel deploy automation:** not defined in this repository’s GitHub workflows.

### 8) BUNDLE & PERFORMANCE
- Build completed successfully.
- Largest chunks (post-optimization):
  - `finance` ~834.75 kB (minified)
  - `reports` ~434.00 kB
  - `vendor` ~230.16 kB
- Lazy imports are working for top-level pages.
- Remaining issue: large finance chunk exceeds configured warning threshold.

### 9) MISSING OR INCOMPLETE FEATURES
- Snapshot rebuild in automation is not implemented (stubbed).
- Route-level capability enforcement is incomplete.
- Realtime data sync model is absent from core data service.

### 10) BUGS & RISKS
- Authorization inconsistencies at route layer.
- Enum/schema drift around contract and maintenance statuses.
- Optional schema drift CI execution can hide DB drift in some runs.

---

## Step 4 Cleanup Log (Performed)

### Files deleted (unused/dead)
- `src/components/reports/ReportViews.tsx` — unreferenced duplicate/unused report renderer module.
- `src/components/reports/views/ReportContentRenderer.tsx` — unreferenced duplicate/unused report renderer module.
- `src/hooks/useDataLoader.ts` — unreferenced hook.
- `src/hooks/useUIState.ts` — unreferenced hook.
- `src/utils/numberToArabic.ts` — unreferenced utility.
- `src/agents/README.md` — markdown file inside `src/` (cleanup rule).

### Root SQL files deleted (orphaned migration files outside `supabase/migrations/`)
- `supabase_migration_add_missing_columns.sql`
- `supabase_migration_v3.sql`
- `supabase_migration_v4_security_scalability.sql`
- `supabase_migration_v5_anti_mistake_engine.sql`
- `supabase_migration_v6_schema_hotfix.sql`
- `supabase_migration_v7_reporting_rpcs.sql`
- `supabase_migration_v8_automatic_balance_updates.sql`
- `supabase_migration_v9_secure_rls_policies.sql`
- `supabase_migration_v10_comprehensive_fixes.sql`
- `supabase_migration_v11_financial_summary.sql`
- `supabase_migration_v12_storage_bucket_attachments.sql`
- `supabase_migration_v13_attachments_table_refactor.sql`
- `supabase_schema.sql`

### Imports removed
- No explicit import-line edits were required; deleted files had zero active imports/references.

### Validation after cleanup
- `npm run typecheck` — passed.
- `npm run build` — passed.
