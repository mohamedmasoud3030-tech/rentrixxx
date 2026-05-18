# Phase 12 — Beta Readiness Audit and Implementation Plan

Date: 2026-05-18  
Active phase: Phase 12 — Beta Readiness / Deployment & QA  
PR: Phase 12 PR 12.1 — Beta readiness audit and implementation plan  
Mode: docs-first audit and safe implementation plan only. No runtime app code, schema, migration, RLS, auth, financial workflow, or accounting changes.

## Prerequisite confirmation

- Confirmed Phase 11 completion artifact exists on the current branch: `docs/PHASE_11_COMMERCIAL_READINESS_COMPLETION_REPORT_2026_05_18.md`.
- Confirmed Phase 11 completion report states that Phase 11 is complete and recommends starting Phase 12 with a docs-first beta readiness, deployment, and QA audit.
- Phase 12 PR 12.1 is intentionally documentation-only and does not alter product behavior.

## Areas inspected for this audit

This audit inspected the required Phase 11/10/9/8/7/6 completion and planning documents, the code inventory and wiring audit, package/build configuration, Vite configuration, route inventory, feature folders, shared libraries, domain/database types, Supabase migrations, repository CI, and Vercel configuration.

Primary artifacts reviewed:

- `docs/PHASE_11_COMMERCIAL_READINESS_COMPLETION_REPORT_2026_05_18.md`
- `docs/PHASE_11_COMMERCIAL_READINESS_AUDIT_AND_PLAN_2026_05_18.md`
- `docs/PHASE_10_REPORTING_COMPLETION_REPORT_2026_05_18.md`
- `docs/PHASE_9_EXPENSES_COMPLETION_REPORT_2026_05_18.md`
- `docs/PHASE_8_MAINTENANCE_COMPLETION_REPORT_2026_05_18.md`
- `docs/PHASE_7_OWNER_MODEL_COMPLETION_REPORT_2026_05_18.md`
- `docs/PHASE_6_PROPERTIES_UNITS_COMPLETION_REPORT_2026_05_18.md`
- `docs/RENTRIX_CODE_INVENTORY_AND_WIRING_AUDIT.md`
- `artifacts/rentrix/package.json`
- `artifacts/rentrix/vite.config.ts`
- `artifacts/rentrix/src/routes`
- `artifacts/rentrix/src/features/dashboard` (requested area; no standalone directory in this snapshot, dashboard implementation is under `artifacts/rentrix/src/app`)
- `artifacts/rentrix/src/features/properties`
- `artifacts/rentrix/src/features/units`
- `artifacts/rentrix/src/features/contracts`
- `artifacts/rentrix/src/features/invoices` (requested area; represented under `artifacts/rentrix/src/features/financials/invoices` in this snapshot)
- `artifacts/rentrix/src/features/payments` (requested area; represented under `artifacts/rentrix/src/features/financials/payments` in this snapshot)
- `artifacts/rentrix/src/features/receipts` (requested area; represented under `artifacts/rentrix/src/features/financials/receipts` in this snapshot)
- `artifacts/rentrix/src/features/maintenance`
- `artifacts/rentrix/src/features/financials`
- `artifacts/rentrix/src/features/reports`
- `artifacts/rentrix/src/features/settings`
- `artifacts/rentrix/src/lib`
- `artifacts/rentrix/src/types/domain.ts`
- `artifacts/rentrix/src/types/database.ts`
- `supabase/migrations`
- `.github/workflows/ci.yml`
- `vercel.json`
- `artifacts/rentrix/vercel.json`

Notes from inspection:

- `supabase/config.toml` is not present in this repository snapshot.
- Requested standalone feature folders for dashboard, invoices, payments, and receipts are not present as separate directories; this audit inspected the routed dashboard implementation under `src/app` and the financial subfeatures under `src/features/financials`.
- The app uses Vite, React, TanStack Router, React Query, and Supabase client-side environment variables.
- CI exists for install, typecheck, lint, and build on pull requests and pushes to `main`.
- Root Vercel configuration includes build/install settings, SPA rewrite, output directory, CSP, and common security headers.
- The nested `artifacts/rentrix/vercel.json` only contains the SPA rewrite; the root Vercel file is the deployment-relevant configuration if deploying from the repository root.

## Executive summary

Rentrix is **conditionally ready for a constrained beta** if the beta is positioned as an operational property-management validation, not a production accounting system. The app has routed, protected operational workflows for login, dashboard, properties, units through property detail, people, tenants, owners, contracts, invoices, arrears, receipts, financials, maintenance, reports, settings, and a clearly deferred accounting route.

The strongest beta posture is narrow and honest:

1. Validate operational workflows with a small internal or closely supervised user cohort.
2. Use a dedicated Supabase project/environment for beta data.
3. Confirm Vercel environment variables and deployment headers before inviting users.
4. Run manual smoke tests across auth, navigation, CRUD, operational finance, reports, and settings.
5. Keep all accounting-grade claims, owner statements, tenant billing automation, vendor workflows, and ledger behavior blocked.

PR 12.1 should not implement anything beyond this document. The smallest safe next PR is **Phase 12 PR 12.2 — Beta readiness checklist and QA polish**, limited to docs/UI-only checklist surfaces or very small non-invasive QA polish if the checklist confirms it is safe.

## Current beta readiness status

### Overall answer: constrained beta readiness

**Status: Ready only for constrained beta after environment, Supabase, auth/RLS, and manual QA checks are completed.**

The app is not ready for unconstrained public launch or accounting-grade production use. It can be evaluated by a limited group if the team sets clear expectations, uses production-like but controlled infrastructure, and avoids financial/accounting expansion.

### Readiness by area

| Area | Beta status | Current assessment | Beta boundary |
|---|---|---|---|
| Auth and protected routing | Conditionally ready | Supabase session-based auth and protected route redirects are present. | Must verify production auth settings, invite/login/logout, and redirect behavior manually. |
| Dashboard | Beta usable | Operational KPIs and overview are available. | Not an accounting command center or reconciled financial dashboard. |
| Properties | Beta usable | List, create, edit, detail, archive-oriented safety, and property-scoped unit management are present. | Advanced portfolio intelligence and owner-accounting behavior remain deferred. |
| Units | Beta usable through properties | Unit creation/editing is reachable inside property detail workflows. | No standalone unit workspace; occupancy automation remains limited. |
| People/Tenants/Owners | Beta usable for directory/relationship basics | People directory, tenants workspace, owners area, and owner relationship foundations exist. | No owner statements, portals, payout workflows, or advanced relationship governance. |
| Contracts | Beta usable for core lifecycle | Contract list, create/edit/detail, and supporting services exist. | Downstream accounting, billing automation, and ledger posting remain blocked. |
| Invoices/Payments/Receipts | Operational-only | Existing flows support operational tracking and receipt/payment behavior. | Not accounting-grade subledger behavior; do not add or market accounting claims. |
| Arrears | Operational visibility | Arrears route exists for collections/attention workflow visibility. | No legal, collections automation, or accounting treatment should be implied. |
| Maintenance | Beta usable for operations | Service request intake/status/filtering is present. | No vendor assignment/payment/AP lifecycle and no automatic accounting conversion. |
| Expenses | Operational-only | Expense records and filtering are usable. | No chargebacks, vendor AP, owner allocation, or ledger posting. |
| Reports | Commercial read-only beta usable | Reports are framed as operational/commercial visibility. | Accounting statements, owner statements, tenant billing reports, and ledger-backed outputs remain deferred. |
| Settings | Beta usable with checks | Company settings persistence and validation are present. | Broader admin, role governance, and deployment-specific settings must be manually verified. |
| Accounting | Deferred | Route exists as placeholder/deferred surface. | Must remain blocked until a dedicated ledger/accounting phase exists. |

## Deployment/environment checklist

### Required before beta invite

- [ ] Confirm Vercel project root and build settings match the repository layout:
  - install command: `pnpm install --frozen-lockfile`
  - build command: `pnpm run build`
  - output directory: `artifacts/rentrix/dist/public`
- [ ] Confirm Vercel deploys from the intended branch and uses the root `vercel.json` rather than relying on the minimal nested `artifacts/rentrix/vercel.json`.
- [ ] Confirm `VITE_SUPABASE_URL` is set in Vercel for preview and production as appropriate.
- [ ] Confirm `VITE_SUPABASE_ANON_KEY` is set in Vercel and corresponds to the intended beta Supabase project.
- [ ] Confirm no service-role key or privileged database secret is exposed to the Vite client.
- [ ] Confirm `BASE_PATH` is unset or set intentionally for the deployed domain.
- [ ] Confirm `PORT` is not misconfigured for local preview/build contexts.
- [ ] Confirm production deployment serves the SPA rewrite for deep links such as `/properties`, `/contracts/new`, `/reports`, and `/settings`.
- [ ] Confirm security headers from root `vercel.json` are present in the deployed response:
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] Confirm CSP permits the selected Supabase project and does not block auth/session requests, realtime/websocket requests, font loading, or required image/document assets.
- [ ] Confirm preview deployments are not connected to irreversible production data unless intentionally approved.
- [ ] Confirm beta testers receive the correct URL and no stale Replit/local/dev URL.

### Recommended before beta invite

- [ ] Add or document a deployment runbook with environment variable names, Vercel project settings, Supabase project reference, rollback steps, and smoke-test owner.
- [ ] Add a manual beta go/no-go checklist that can be completed before each beta cut.
- [ ] Capture screenshots of key deployed pages during manual QA for evidence and regression reference.
- [ ] Confirm browser support expectations for the beta cohort.
- [ ] Confirm error-monitoring/log-review process, even if only Vercel logs plus Supabase logs for the initial beta.

## Supabase production readiness checklist

### Project/environment checks

- [ ] Use a dedicated beta Supabase project or a clearly separated beta schema/data environment.
- [ ] Confirm the database has all migrations applied through `20260518134500_harden_remaining_function_advisors.sql`.
- [ ] Confirm there are no unapplied local migrations in the deployment project.
- [ ] Confirm database backups/PITR posture is acceptable for beta data criticality.
- [ ] Confirm seed/demo data is separated from real beta user data.
- [ ] Confirm data retention, export, and deletion expectations before onboarding real users.
- [ ] Confirm storage buckets, if any are used later, are not publicly exposed unintentionally.
- [ ] Confirm API rate limits, project plan limits, email rate limits, and auth limits are acceptable for the beta cohort.
- [ ] Confirm Supabase project URL and anon key match the frontend environment variables.

### Database/migration checks

- [ ] Run migration status against the target Supabase project before beta.
- [ ] Verify tables used by the app exist in target project: `properties`, `units`, `people`, `contracts`, `invoices`, `payments`, `expenses`, `maintenance_requests`, `company_settings`, `owners`, and `property_owners`.
- [ ] Verify required functions/RPCs exist and are callable by the intended roles only, including invoice generation, receipt posting, reports, contract renewal, and validation functions.
- [ ] Verify `public.set_updated_at()` and updated-at trigger patterns are present where expected.
- [ ] Verify indexes from the advisor-hardening migrations are present in the target project.
- [ ] Verify no destructive migration or test reset has been applied to beta/prod data.

### Operational checks

- [ ] Confirm Supabase logs are monitored during first beta sessions.
- [ ] Confirm failed RPC calls and RLS denials can be inspected quickly.
- [ ] Confirm rollback plan if a beta deployment points to the wrong project.
- [ ] Confirm who can access Supabase dashboard and who can apply migrations.
- [ ] Confirm no manual database editing is used as routine support during beta except documented emergency procedures.

## Auth/RLS/advisor checklist

### Auth checks

- [ ] Confirm email/password auth is enabled if that is the intended beta login method.
- [ ] Confirm beta users can be invited or created using an approved process.
- [ ] Confirm login works with a real beta account on the deployed domain.
- [ ] Confirm logout clears the app session and returns the user to the correct protected/login state.
- [ ] Confirm a logged-out user cannot access protected deep links.
- [ ] Confirm a logged-in user is redirected away from `/login`.
- [ ] Confirm Supabase auth redirect/site URL settings include the beta domain and any preview domain policy the team wants to support.
- [ ] Confirm password reset/email templates are either configured or explicitly out of beta scope.
- [ ] Confirm custom access token hook behavior is enabled in Supabase if the project relies on role claims.

### RLS checks

- [ ] Confirm RLS is enabled for all application tables that contain tenant, property, contract, invoice, payment, receipt, expense, maintenance, owner, or settings data.
- [ ] Confirm existing policies intentionally allow authenticated app users to manage shared operational data for beta.
- [ ] Confirm this shared-authenticated-user policy model is acceptable only for constrained beta and not for multi-company production isolation.
- [ ] Confirm anonymous users cannot read or mutate application tables.
- [ ] Confirm RPC functions do not bypass expected authorization checks.
- [ ] Confirm payment/receipt immutability and receipt authorization hardening are present in the target Supabase project.

### Advisor/security checks

- [ ] Run Supabase Security Advisor against the beta project.
- [ ] Run Supabase Performance Advisor against the beta project.
- [ ] Confirm function `search_path` warnings remain resolved after the Phase 11/previous advisor-hardening migrations.
- [ ] Confirm remaining warnings are documented with owner, risk, and decision before inviting real users.
- [ ] Treat any new RLS-disabled, exposed-function, leaked-secret, or broad-public-access warning as a beta blocker.
- [ ] Treat performance warnings as beta blockers only if they affect core beta flows or represent unsafe missing indexes on frequently queried tables.

## Manual smoke-test plan

Run these against the deployed beta URL with a clean browser session and a known beta Supabase project.

### Smoke test setup

- [ ] Prepare at least one beta user account.
- [ ] Prepare a small test dataset or create it during smoke testing.
- [ ] Record the Supabase project reference and deployed commit SHA.
- [ ] Confirm testers know which records are test-only and which records are real beta data.

### Minimum smoke tests

| Flow | Steps | Expected result |
|---|---|---|
| Auth login/logout | Visit `/login`, sign in, sign out. | Login succeeds, protected shell loads, logout clears session. |
| Protected route guard | Visit `/properties` while logged out. | User is redirected to login. |
| Deep link routing | Open `/contracts/new`, `/reports`, `/settings` directly after login. | SPA rewrite and route guards work. |
| Dashboard load | Open `/`. | Dashboard renders without console/runtime errors. |
| Properties | Create property, edit it, open detail page. | Data persists and detail loads. |
| Units | Add/edit a unit from property detail. | Unit appears under the correct property. |
| People | Create/edit a person. | Person appears in directory without breaking tenant/owner flows. |
| Owners | Open owners area and verify relationship basics. | Owner screen loads and does not imply owner accounting. |
| Tenants | Open tenants area. | Tenant workspace loads with expected data boundaries. |
| Contracts | Create a contract using valid property/unit/person data; open detail/edit. | Contract lifecycle basics work without duplicate/invalid unit selection. |
| Invoices | Open invoices/financial workspace and verify list/generation behavior if enabled for beta data. | Operational invoices display correctly; no accounting claims. |
| Payments/Receipts | Post a small test payment only in beta data and inspect receipt/detail if enabled. | Receipt/payment flow works and does not create ledger/accounting entries. |
| Arrears | Open arrears route. | Arrears visibility loads and remains operational. |
| Expenses | Create/filter an expense only in beta data if expense entry is enabled. | Expense is tracked operationally, not posted to accounting. |
| Maintenance | Create/filter/update service request. | Status and priority workflow renders correctly. |
| Reports | Open reports and change available filters. | Reports remain read-only and commercially framed. |
| Settings | Load/update company settings only with beta-approved values. | Validation and persistence work. |
| Not found | Visit an invalid route. | Not-found page appears without crashing. |

### Browser/runtime checks

- [ ] No blank screen on refresh of protected deep links.
- [ ] No uncaught runtime errors in browser console for core flows.
- [ ] No failed Supabase requests except expected validation/RLS failures from negative tests.
- [ ] Loading, empty, and error states are understandable in Arabic/RTL context.
- [ ] Navigation remains usable on the smallest supported beta screen size.

## Core flow QA checklist

### Before real users

- [ ] Auth lifecycle: login, logout, protected redirect, session restore after refresh.
- [ ] Navigation lifecycle: every top-level nav item loads, deep-link refresh works, not-found route works.
- [ ] Property lifecycle: create, edit, view, archive/safe status behavior, property detail.
- [ ] Unit lifecycle: add, edit, status/rent visibility, property scoping.
- [ ] People lifecycle: create/edit tenant, owner, and contact-style records as currently supported.
- [ ] Owner basics: owners and property ownership relationships display without accounting claims.
- [ ] Contract lifecycle: create, edit, detail, unit selection guardrails, status/date/rent visibility.
- [ ] Invoice operational flow: list/generate/view operational invoice state only if approved for beta test data.
- [ ] Payment/receipt operational flow: post/view only in beta test data and confirm no accounting/ledger representation.
- [ ] Arrears operational flow: identify overdue/attention items and verify no collections automation claim.
- [ ] Expense operational flow: create/filter/view operational expenses without chargeback/AP/ledger behavior.
- [ ] Maintenance flow: create, filter, status update, priority/property visibility.
- [ ] Reports flow: load reports, adjust filters, verify read-only/commercial copy.
- [ ] Settings flow: load, validate, save, reload company settings.
- [ ] Data reload: refresh browser after each major mutation and confirm persisted state matches expectations.
- [ ] Negative validation: required fields, invalid dates/amounts, duplicate/overlap contract attempts where guarded.
- [ ] Accessibility/RTL: keyboard reachability for critical forms, Arabic labels, readable error states.

## Data safety risks

The following risks remain acceptable only for constrained beta with clear boundaries and monitoring:

1. **Shared authenticated access model risk**: current RLS posture appears designed for authenticated app users managing shared operational data, not strict tenant/company isolation. This is acceptable only if the beta cohort shares the same managed dataset or data-separation expectations are explicitly limited.
2. **Operational finance vs accounting confusion**: invoices, payments, receipts, expenses, arrears, and reports can look financially significant even though a real ledger/accounting system is deferred.
3. **Manual data correction risk**: without mature admin/audit tooling, mistakes may require careful database-level correction by maintainers.
4. **Beta data contamination risk**: demo/test records can mix with real user records if the beta data plan is not enforced.
5. **Environment mispointing risk**: preview/prod frontends could accidentally point to the wrong Supabase project if Vercel variables are not reviewed.
6. **RPC privilege risk**: security-definer functions must remain reviewed and advisor-clean before real data usage.
7. **Report interpretation risk**: read-only commercial reports may be misread as audited statements unless product copy and onboarding are explicit.
8. **Owner/tenant/vendor expectation risk**: beta users may expect statements, billing, payouts, and AP workflows that are intentionally not implemented.
9. **Backup/rollback risk**: beta data may become operationally important before formal backup, retention, export, and rollback procedures are mature.
10. **Limited automated coverage risk**: existing scripted checks are useful but do not replace manual deployed QA across all real user flows.

## Deferred accounting/ledger blockers

The following must remain blocked until a dedicated accounting/ledger phase exists:

- Chart of accounts.
- General ledger tables and journal entries.
- Double-entry posting rules.
- Owner statements and owner payable/payout balances.
- Tenant billing statements beyond current operational invoice/payment views.
- Vendor workflows, vendor bills, accounts payable, and vendor payments.
- Maintenance-to-expense/accounting automation.
- Expense chargebacks or owner/tenant allocation rules.
- Ledger-backed income statement, balance sheet, trial balance, cashflow statement, or audited statements.
- Accounting period close/reopen controls.
- Reconciliation workflows.
- Tax/VAT/compliance reporting.
- Any automatic mutation of invoices, payments, receipts, expenses, or contracts for accounting purposes.
- Any schema/RLS/RPC changes intended to support accounting in a beta-readiness PR.

## Recommended Phase 12 implementation path

### PR 12.1 (this PR)

- Add this docs-only beta readiness audit and implementation plan.
- Confirm Phase 11 completion artifact exists.
- Inventory deployment, environment, Supabase, Auth/RLS/advisor, and manual QA checks.
- Preserve all non-goals: no runtime code, no migrations, no auth/RLS changes, no financial behavior changes.

### PR 12.2 (smallest safe next step)

Recommended title: **Phase 12 PR 12.2 — Beta readiness checklist and QA polish**

Smallest safe scope:

1. Add a docs-only or UI-adjacent beta readiness checklist that operators can use before each beta deployment.
2. If runtime changes are allowed after review, limit them to non-invasive QA polish such as clearer beta/deferred copy, checklist links, or existing empty/error copy refinements.
3. Do not add product workflows, financial behavior, schema, migrations, RLS, auth changes, RPCs, accounting logic, or data mutations.
4. Keep changes limited to documentation and, only if justified, small presentation-only surfaces.

### Later Phase 12 PRs only if explicitly approved

- Deployment runbook or release checklist documentation.
- Manual QA evidence template.
- Non-invasive monitoring/logging documentation.
- Small UI copy fixes discovered during deployed QA.
- Test coverage improvements that do not change product behavior.

## Explicit non-goals

Phase 12 PR 12.1 explicitly does not do any of the following:

- Runtime app code changes.
- Product workflow changes.
- Supabase migrations.
- Schema changes.
- RLS changes.
- Auth changes.
- New RPCs.
- Financial calculation changes.
- Invoice, payment, receipt, expense, contract, or maintenance mutation changes.
- Accounting/ledger entries.
- Owner statements.
- Tenant billing automation.
- Vendor workflows.
- Report logic changes.
- Dashboard rebuilds.
- Legacy-source imports or wiring.
- `useApp`, `AppContext`, `dataService`, local DB, or `react-router-dom` reintroduction.
- Broad refactors, dependency changes, or deployment configuration changes.

## What is out of scope for beta

For constrained beta, these are not available product promises:

- Full accounting/bookkeeping system.
- Audited financial statements.
- Owner portals or owner statements.
- Tenant portals or automated billing cycles.
- Vendor/AP workflows.
- Tax filing/compliance outputs.
- Bank reconciliation.
- Multi-company/tenant-isolated SaaS governance unless separately validated.
- Production support SLAs.
- Data migration/import guarantees.
- Offline-first guarantees despite the presence of local-cache-related code.
- Automated deployment promotion without manual QA sign-off.

## Validation checklist

### Repository/programmatic checks for PR 12.1

- [ ] `git diff --check`
- [ ] `rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true`
- [ ] `pnpm --filter ./artifacts/rentrix run typecheck`
- [ ] `pnpm --filter ./artifacts/rentrix run build`
- [ ] `pnpm --filter ./artifacts/rentrix run lint`
- [ ] `pnpm --filter ./artifacts/rentrix test`
- [ ] `pnpm --filter ./artifacts/rentrix run test:financials`

### Manual go/no-go checks before beta

- [ ] Vercel deployment uses intended build/output settings.
- [ ] Environment variables point to the intended Supabase project.
- [ ] Supabase migrations are applied to the intended project.
- [ ] Supabase Security Advisor has no beta-blocking warnings.
- [ ] Supabase Performance Advisor has no core-flow beta blockers.
- [ ] Auth login/logout/deep-link guard behavior works on deployed URL.
- [ ] Core flow smoke tests pass with beta test data.
- [ ] Known limitations are documented for beta users.
- [ ] Accounting/ledger/owner statement/vendor/tenant billing expectations are explicitly blocked.
- [ ] Rollback/contact plan exists for first beta users.

## Recommended conclusion

Rentrix can proceed toward a **small, constrained beta** only after deployment/environment, Supabase production, Auth/RLS/advisor, and manual smoke-test checks are completed and recorded.

The safest Phase 12 path is conservative:

- Do not add new product workflows.
- Do not change financial behavior.
- Do not add accounting or ledger logic.
- Do not change schema or RLS in PR 12.1.
- Identify manual QA checks and environment checks first.
- Keep beta scope constrained and honest.
- Use PR 12.2 for a beta readiness checklist and small non-invasive QA polish only if supported by this audit.
