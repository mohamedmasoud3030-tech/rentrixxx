# Phase 13 — Production Launch Guardrails Audit and Plan

Date: 2026-05-18
Active phase: Phase 13 — Production Launch Guardrails / Monitoring & Runbook
PR: Phase 13 PR 13.1 — Production launch guardrails audit and plan
Mode: docs-only audit and implementation plan.

## 1) Executive summary

Phase 13 should begin with production-launch guardrails, not new product behavior. The immediate need is a clear, reversible constrained-beta launch process that tells the team what to verify before launch, what to smoke test after deployment, how to roll back, what issues stop beta, and how support is handled while accounting-grade workflows remain blocked.

This PR is intentionally docs-only. It does not change runtime application code, deployment configuration, monitoring services, Supabase schema, RLS, auth settings, RPC contracts, financial calculations, accounting behavior, or financial workflows.

The recommended conclusion is to keep Phase 13 docs/runbook-first:

- Do not add monitoring services yet.
- Do not change deployment configuration yet.
- Do not change runtime code.
- Do not change Supabase schema, RLS, auth, or RPC behavior.
- Create clear launch and rollback instructions first.
- Create a manual monitoring and beta-support checklist first.
- Keep beta launch constrained, observable, and reversible.

## 2) Current launch readiness status

Current status: **not ready for unattended production launch; conditionally ready to prepare a constrained operational beta runbook**.

Phase 12 closed with a conditional beta recommendation: Rentrix may proceed to constrained operational beta only after the Phase 12 manual QA checklist is executed and all required rows are **PASS** or explicitly **BLOCKED** only for deferred accounting-grade features.

The Phase 13 audit confirms:

- The Phase 12 completion report exists and marks accounting-grade production use as not ready.
- The Phase 12 QA checklist exists and should be the source of pre-launch evidence.
- The app is a Vite/React app with Supabase client environment variables required at runtime/build time.
- The app uses TanStack Router routes for dashboard, properties, people, owners, tenants, contracts, invoices, arrears/financials, maintenance, reports, accounting, settings, and auth/login surfaces.
- CI currently runs install, typecheck, lint, and build on pull requests and main pushes.
- Vercel configuration files exist, including root deployment output/rewrites/headers and an app-level SPA rewrite file.
- Supabase migrations exist and include prior schema, auth/RLS, RPC, advisor, and hardening work.
- `supabase/config.toml` is not present in this repository snapshot, so project-level Supabase launch settings must be verified through the Supabase dashboard or management API rather than local config review.
- No dedicated application monitoring SDK is currently wired in the app source by this audit. Initial beta monitoring should therefore rely on Vercel deployment/log visibility, Supabase logs/advisors, browser console/error reports captured by QA/support, and a manual incident log until an explicit monitoring PR is approved.

## 3) Production runbook requirements

A constrained beta production runbook is needed before launch. It should be a step-by-step operator document with named owners, required evidence, go/no-go gates, rollback instructions, and stop conditions.

The runbook should include:

1. **Release owner and decision owner**
   - Name the person responsible for the deployment.
   - Name the person authorized to make the final go/no-go decision.
   - Name the person responsible for Supabase checks.
   - Name the person responsible for beta support triage.

2. **Release artifact details**
   - Git commit SHA.
   - PR number and merge time.
   - Vercel deployment URL.
   - Vercel deployment ID.
   - Supabase project ref/name.
   - Environment name, for example constrained beta / production.

3. **Pre-launch checklist**
   - Confirm Phase 12 QA checklist status.
   - Confirm environment variables.
   - Confirm deployment configuration.
   - Confirm Supabase project safety checks.
   - Confirm Auth/RLS/advisor checks.
   - Confirm no accounting-grade production promises are included in release notes.

4. **Launch execution steps**
   - Deploy or promote the reviewed Vercel build.
   - Record the deployment URL and deployment ID.
   - Confirm the deployment points to the intended Supabase project.
   - Run post-deployment smoke tests immediately.
   - Record evidence and screenshots/notes where appropriate.

5. **Rollback steps**
   - Identify the last known good Vercel deployment.
   - Revert or roll back Vercel traffic to the last known good deployment.
   - Do not run emergency database migrations as a rollback shortcut.
   - If data integrity is in question, stop beta before additional writes continue.

6. **Monitoring and support process**
   - Define who watches Vercel logs.
   - Define who watches Supabase logs/advisors.
   - Define where beta issues are reported.
   - Define severity levels and response targets.
   - Define when beta must stop.

## 4) Environment/deployment verification checklist

Before launch, verify and record evidence for each item below.

| Area | Launch check | Expected result | Evidence to capture |
|---|---|---|---|
| Git state | Confirm launch commit SHA is the intended merged commit. | Exact commit is recorded in the runbook. | Commit SHA and PR link. |
| Package manager | Confirm install uses pnpm with frozen lockfile. | Deployment matches repository package-manager expectations. | Vercel build log or CI log. |
| Build command | Confirm Vercel/root build command remains `pnpm run build`. | Build command produces the Rentrix app output. | Vercel project build settings or `vercel.json`. |
| Output directory | Confirm Vercel output directory is `artifacts/rentrix/dist/public`. | Vercel serves the built Vite app. | Vercel project settings or `vercel.json`. |
| SPA routing | Confirm fallback rewrite to `index.html`. | Deep links to protected app routes do not 404 at the edge. | Vercel config and smoke-test evidence. |
| Security headers | Confirm configured headers are present on deployed responses. | CSP, frame, content-type, and referrer policies are active where configured. | Response headers from deployment URL. |
| `VITE_SUPABASE_URL` | Confirm value exists and points to intended Supabase project. | App loads against the intended beta/prod Supabase project only. | Redacted environment-variable evidence. |
| `VITE_SUPABASE_ANON_KEY` | Confirm anon key exists and belongs to intended project. | Client auth/data access works through anon key and RLS only. | Redacted environment-variable evidence. |
| `BASE_PATH` | Confirm unset or intentionally set. | Vite base path matches deployed URL path. | Vercel env/build log. |
| `PORT` | Confirm not forcing an invalid build/preview value. | Local preview and Vercel build are not blocked by invalid port parsing. | Build log if applicable. |
| Production build | Run the build before deployment or rely on passing CI. | Build completes successfully. | CI or local command result. |
| Runtime route load | Load login and protected routes via direct URL. | Login route loads; protected routes route through auth behavior without edge 404. | Manual smoke evidence. |

## 5) Supabase/Auth/RLS/advisor launch checklist

Repeat these checks before each constrained beta launch or promotion.

| Area | Launch check | Expected result | Evidence to capture |
|---|---|---|---|
| Project targeting | Confirm the deployed app targets the intended Supabase project. | No staging/local project is used for beta users unless explicitly approved. | Project ref/name and redacted URL. |
| Migration state | Confirm production migration history is current and expected. | No pending, failed, or out-of-order migration surprise. | Supabase migration/advisor evidence. |
| RLS state | Confirm RLS is enabled for app-facing public tables. | Authenticated users cannot bypass table policies. | Supabase dashboard/advisor evidence. |
| Auth configuration | Confirm email/password or approved beta auth method is enabled. | Beta users can log in only through approved auth methods. | Auth settings evidence. |
| Access token hook | Confirm custom access token hook status if production relies on role claims. | Role claims are available without breaking login. | Supabase Auth hook evidence. |
| RPC execution | Confirm app-facing RPCs retain intended execution permissions. | Receipt/contract/report RPCs are not publicly executable beyond intended roles. | Supabase function grants/advisor evidence. |
| Advisor warnings | Review database, auth, security, and performance advisors. | No unresolved launch-blocking warnings. | Advisor screenshot/export. |
| Logs | Check recent Auth/API/Postgres logs. | No repeated auth, permission, function, or query failures during smoke tests. | Log links or summarized evidence. |
| Backups | Confirm backup/restore posture for the Supabase project. | Team knows recovery point expectations before beta writes begin. | Dashboard evidence or owner confirmation. |
| Data set | Confirm beta data is allowed and not mixed with accidental test/demo data unless accepted. | Operators know which records are safe beta records. | QA notes and accepted limitations. |

## 6) Post-deployment smoke test checklist

Immediately after deployment, repeat a short manual smoke test before inviting or continuing beta users.

Required smoke tests:

- Load the deployed root URL.
- Load `/login` directly.
- Log in with an approved beta user.
- Log out and confirm session handling.
- Refresh the dashboard while authenticated.
- Direct-load protected routes to confirm SPA rewrite behavior.
- Open properties list and one property detail page.
- Open people, owners, tenants, contracts, invoices, financials/arrears, maintenance, reports, and settings routes.
- Create or edit only beta-safe test records if the release owner has approved write smoke testing.
- Confirm settings/company values load without exposing secrets or internal errors.
- Confirm invoice/payment/receipt/expense/contract screens do not claim ledger-backed accounting readiness.
- Confirm reports remain operational/read-only where applicable and are not represented as audited accounting statements.
- Confirm mobile viewport navigation reaches core beta areas.
- Check browser console for repeated runtime errors.
- Check Vercel logs for deployment/runtime errors.
- Check Supabase Auth/API/Postgres logs for permission, RLS, RPC, or query failures.

If any required smoke test fails outside an explicitly deferred accounting-grade feature, stop launch and follow the rollback plan.

## 7) Rollback plan

Use rollback when the deployment breaks login, routing, core operational flows, data safety, Supabase access, or any non-deferred smoke-test requirement.

Recommended rollback steps:

1. **Stop the launch window**
   - Pause beta-user invitations or operator activity.
   - Announce that the team is rolling back or investigating.

2. **Identify severity**
   - Confirm whether the issue is app-only, environment/config, Supabase/Auth/RLS, data integrity, or user-support related.
   - If data integrity is uncertain, stop beta writes immediately.

3. **Roll back Vercel first for app-only failures**
   - Use Vercel deployment history to promote the last known good deployment.
   - Record the rollback deployment ID and time.
   - Do not change Supabase schema, RLS, auth, or RPCs as an emergency shortcut unless a separate emergency plan is approved.

4. **Verify rollback**
   - Repeat login, route load, dashboard, settings, and one core operational flow.
   - Check Vercel and Supabase logs again.

5. **Document incident**
   - Record symptoms, affected users, affected routes, suspected cause, rollback time, recovery verification, and follow-up PR/issue.

6. **Resume beta only after explicit approval**
   - Resume only when required smoke tests pass and the release owner approves.

## 8) Beta stop conditions

Stop beta immediately if any of the following occur:

- Users can access data they should not access.
- RLS appears disabled, bypassed, or misconfigured for app-facing tables.
- Auth fails broadly or allows unintended access.
- The app points to the wrong Supabase project.
- Invoices, payments, receipts, expenses, contracts, or financial workflows mutate unexpectedly.
- Duplicate, missing, or corrupted financial records are observed.
- Receipt posting, contract renewal, or protected RPC behavior appears unauthorized or inconsistent.
- Accounting-grade reports/statements are presented as production-ready when ledger foundations are still absent.
- Production data is mixed with test/demo data in a way the beta owner has not accepted.
- Deployment produces repeated runtime crashes on core routes.
- Vercel or Supabase logs show repeated high-severity errors during normal beta usage.
- A user reports data loss, cross-tenant data visibility, unauthorized mutation, or privacy/security concern.
- The team cannot identify who owns triage and support during an active incident.

## 9) Monitoring and support notes

Current monitoring posture is **manual and limited**.

Currently available or reviewable:

- GitHub CI for typecheck, lint, and build before merge.
- Vercel build/deployment status and deployment logs.
- Vercel response headers and route behavior checks after deployment.
- Supabase dashboard logs for Auth/API/Postgres/function issues.
- Supabase advisors for database, auth, security, and performance warnings.
- Browser console observations during manual QA and beta support.
- Manual issue reports from beta users/operators.

Currently not established by this PR:

- No new monitoring SDK/service is added.
- No application error tracking integration is wired.
- No alert routing or on-call integration is configured.
- No automated uptime probe is added.
- No deployment configuration is changed.

Minimum beta support process:

- Create one beta-support intake location, such as a GitHub issue template, shared tracker, or support inbox.
- Require each report to include user, time, deployment URL, route, action attempted, expected result, actual result, screenshot/video if available, and whether data was changed.
- Triage issues as **Stop Beta**, **High**, **Medium**, or **Low**.
- Treat auth/RLS/data-visibility/data-loss/financial-mutation issues as **Stop Beta** until investigated.
- Review Vercel and Supabase logs during each support triage window.
- Keep a manual incident log with timestamps, owner, decision, and follow-up issue/PR.

## 10) Deferred accounting/ledger blockers

The following must remain blocked until accounting/ledger foundations exist and are explicitly scoped, implemented, reviewed, and tested:

- Ledger.
- Chart of accounts.
- Journal entries.
- Owner statements.
- Tenant billing.
- Vendor payments and accounts payable workflows.
- Maintenance-to-expense automation.
- Ledger-backed income statement.
- Ledger-backed balance sheet.
- Trial balance.
- Cashflow statement.
- Tax/audit-grade accounting statements.
- Automated accounting close/reconciliation workflows.

Operational financial screens may be used only within their existing bounded behavior. They must not be represented as complete accounting or audited financial statements during constrained beta.

## 11) Recommended Phase 13 implementation path

Recommended path:

1. **PR 13.1 — Production launch guardrails audit and plan**
   - Add this docs-only audit and plan.
   - Do not change runtime code, deployment config, monitoring services, Supabase, auth, RLS, RPCs, or financial behavior.

2. **PR 13.2 — Production launch runbook and support checklist**
   - Add a concrete runbook/checklist document operators can execute.
   - Include owner fields, environment fields, launch steps, rollback steps, smoke-test rows, manual monitoring rows, support triage rows, and incident log template.
   - Keep it docs-only unless a separate approval explicitly expands scope.

3. **Later Phase 13 PRs only if needed and explicitly approved**
   - Consider monitoring-service integration after the manual runbook is accepted.
   - Consider deployment configuration changes only after documenting the exact desired guardrail and risk.
   - Consider support templates only if they remain docs/process-only or are explicitly requested.

## 12) Explicit non-goals

This PR intentionally does not:

- Change runtime app code.
- Add monitoring SDKs or services.
- Change deployment configuration.
- Add or change Vercel configuration.
- Add accounting or ledger entries.
- Create or mutate invoices, payments, receipts, expenses, contracts, or financial workflows.
- Mutate financial calculations.
- Add owner statements.
- Add tenant billing.
- Add vendor workflows.
- Add Supabase migrations.
- Change Supabase schema.
- Change RLS.
- Change auth.
- Add new RPCs.
- Import from `legacy-src`.
- Introduce `useApp`, `AppContext`, `dataService`, local DB, or `react-router-dom` usage.
- Touch unrelated files beyond this new documentation file.

## 13) Proposed PR 13.2 scope

Smallest safe PR 13.2 scope: **docs-only production launch runbook and beta support checklist**.

PR 13.2 should add one runbook/checklist document that includes:

- Release owner fields.
- Deployment URL and deployment ID fields.
- Supabase project ref/name fields.
- Environment-variable verification rows.
- Supabase/Auth/RLS/advisor verification rows.
- Post-deployment smoke-test rows.
- Manual monitoring checklist rows.
- Rollback checklist rows.
- Beta stop-condition checklist rows.
- Support intake and triage checklist rows.
- Incident log template.
- Final go/no-go sign-off fields.

PR 13.2 should not add monitoring services, deployment config changes, runtime code changes, Supabase migrations, RLS/auth changes, RPC changes, or financial/accounting workflow changes.

## 14) Validation checklist

Before PR 13.1 is considered ready, confirm:

- [x] Only `docs/PHASE_13_PRODUCTION_LAUNCH_GUARDRAILS_AUDIT_AND_PLAN_2026_05_18.md` is changed.
- [x] The Phase 12 completion report exists on the branch.
- [x] Phase 12 QA and audit documents were reviewed.
- [x] Phase 11 commercial-readiness completion report was reviewed.
- [x] Repository wiring/config areas were inspected, including package scripts, Vite config, routes, lib, settings, financials, reports, types, Supabase migrations, GitHub workflows, and Vercel config files.
- [x] The document preserves the constrained-beta recommendation.
- [x] The document marks accounting-grade production use as blocked.
- [x] No runtime app code is changed.
- [x] No financial calculations are changed.
- [x] No Supabase schema, migration, RLS, auth, or RPC changes are introduced.
- [x] No monitoring service or SDK is added.
- [x] No deployment configuration is changed.
- [x] Required validation commands are run and recorded in the PR body.
