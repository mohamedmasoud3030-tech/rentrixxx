# Next Phase Roadmap (Post-Critical Stabilization)

## Phase 2 — Type Safety Hardening
1. Replace `any`/`as any` usages in `Dashboard`, `Accounting`, `Reports` and services with concrete types from `src/types.ts`.
2. Introduce shared typed selectors for commonly derived data (`tenantById`, `unitById`, finance aggregates).
3. Enforce stricter TS checks incrementally (`noImplicitAny` first for changed modules).

## Phase 3 — Reports Modularization
1. Split `src/pages/Reports.tsx` into feature modules:
   - `reports/tenant-report`
   - `reports/owner-report`
   - `reports/finance-report`
2. Extract reusable chart/table blocks and filters to `src/components/reports`.
3. Add contract tests for report calculations and export payloads.

## Phase 4 — Navigation & UX Consistency
1. Keep unified confirmation UX for any remaining destructive flows.
2. Normalize route ownership: every route must have sidebar discoverability or explicit deep-link intent.
3. Add route registry validation to prevent stale metadata/routes mismatch.

## Phase 5 — Quality Gates
1. Add CI job for `npm run build` + lint/type-check.
2. Add smoke test for key routes (`/`, `/properties`, `/finance/*`, `/settings/*`).
3. Add schema-backed fixtures to test financial workflows end-to-end.
