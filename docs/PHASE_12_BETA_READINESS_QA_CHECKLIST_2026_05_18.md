# Phase 12 — Beta Readiness QA Checklist

Date: 2026-05-18  
Active phase: Phase 12 — Beta Readiness / Deployment & QA  
PR: Phase 12 PR 12.2 — Beta readiness QA checklist  
Mode: documentation-only manual QA checklist. No runtime app code, schema, migration, RLS, auth, financial workflow, or accounting changes.

## Purpose

Use this checklist before each constrained beta deployment cut. It translates the Phase 12 PR 12.1 audit into a manual go/no-go worksheet for operators, reviewers, and QA owners.

A constrained beta is acceptable only when the team can record evidence that the deployment, Supabase project, auth lifecycle, protected routing, core operational workflows, reports, settings, not-found handling, and mobile smoke tests have been checked against the intended beta environment.

## Scope confirmation

This checklist is intentionally docs/UI-only and non-invasive:

- No new product workflows.
- No schema changes, migrations, RLS changes, auth changes, or RPCs.
- No financial behavior, accounting logic, invoice/payment/receipt/expense workflow, or contract workflow changes.
- No owner statements, tenant billing automation, vendor payments, ledger posting, reporting exports, or dashboard rewrite.
- No new routes or data-fetching paths.

## How to use the status columns

Use one row per beta cut and fill the columns during manual QA:

| Column | Meaning |
|---|---|
| Pass | Check completed successfully in the intended beta environment. |
| Fail | Check was attempted and produced an unexpected result that must be fixed or accepted by the release owner before beta invite. |
| Blocked | Check could not be completed because access, environment setup, data, credentials, or a deferred/non-goal product capability is unavailable. |
| Evidence / notes | Link screenshots, deployment URL, Supabase project reference, issue number, reviewer initials, or blocker explanation. |

## Go/no-go summary

| Gate | Required beta outcome | Pass | Fail | Blocked | Evidence / notes |
|---|---|---|---|---|---|
| Deployment target | Vercel deploy uses the intended branch, root project configuration, and beta URL. |  |  |  |  |
| Environment variables | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` point to the intended beta Supabase project; no privileged secrets are exposed to the client. |  |  |  |  |
| Supabase target | Target Supabase project is dedicated to beta or otherwise explicitly approved for constrained beta data. |  |  |  |  |
| Auth lifecycle | Login, logout, session restore, and logged-out protected redirects work on the deployed URL. |  |  |  |  |
| Core operational flows | Dashboard, properties, units, people, contracts, invoices, payments/receipts, maintenance, expenses, reports, and settings pass smoke testing. |  |  |  |  |
| Deferred accounting boundary | Ledger, owner statements, tenant billing, vendor payments, accounting statements, and maintenance-to-expense automation remain blocked/deferred. |  |  |  |  |
| Mobile smoke | Key pages remain usable at a narrow mobile viewport with readable Arabic/RTL labels and reachable actions. |  |  |  |  |
| Release decision | Release owner records go/no-go decision and any accepted beta limitations. |  |  |  |  |

## Deployment and environment checklist

| Area | Manual QA check | Pass | Fail | Blocked | Evidence / notes |
|---|---|---|---|---|---|
| Vercel project | Confirm project root/build settings match the repository layout and use the root deployment configuration. |  |  |  |  |
| Build command | Confirm Vercel build command is `pnpm run build`. |  |  |  |  |
| Install command | Confirm Vercel install command is `pnpm install --frozen-lockfile`. |  |  |  |  |
| Output directory | Confirm Vercel output directory is `artifacts/rentrix/dist/public`. |  |  |  |  |
| Deployment URL | Open the latest preview or production beta URL and record it. |  |  |  |  |
| Deep-link rewrite | Refresh `/properties`, `/contracts/new`, `/reports`, and `/settings` on the deployed URL and confirm the SPA loads. |  |  |  |  |
| Security headers | Confirm deployed responses include CSP, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`. |  |  |  |  |
| Supabase URL variable | Confirm `VITE_SUPABASE_URL` is configured for the intended beta project. |  |  |  |  |
| Supabase anon key variable | Confirm `VITE_SUPABASE_ANON_KEY` matches the intended beta project anon key. |  |  |  |  |
| Secret exposure | Confirm no service-role key or privileged database secret is present in Vercel client-side variables. |  |  |  |  |
| Base path | Confirm `BASE_PATH` is unset or intentionally configured for the deployed domain. |  |  |  |  |
| Preview data safety | Confirm preview deployments do not point at irreversible production data unless explicitly approved. |  |  |  |  |

## Supabase project checklist

| Area | Manual QA check | Pass | Fail | Blocked | Evidence / notes |
|---|---|---|---|---|---|
| Project selection | Confirm beta uses a dedicated Supabase project or approved separated beta data environment. |  |  |  |  |
| URL/key match | Confirm Supabase project URL and anon key match the deployed frontend environment variables. |  |  |  |  |
| Migration posture | Confirm the target project has all expected migrations applied and no known unapplied local migration. |  |  |  |  |
| App tables | Confirm required app tables exist for properties, units, people, owners, contracts, invoices, payments, expenses, maintenance, and company settings. |  |  |  |  |
| Auth method | Confirm the intended beta auth method is enabled and beta users can be invited or created. |  |  |  |  |
| Logs | Confirm Supabase logs can be inspected during first beta sessions. |  |  |  |  |
| Backup posture | Confirm backup/retention expectations are acceptable for beta data criticality. |  |  |  |  |
| Access control | Confirm who can access the Supabase dashboard and who can apply migrations during beta. |  |  |  |  |

## Auth and protected routing checklist

| Area | Manual QA check | Pass | Fail | Blocked | Evidence / notes |
|---|---|---|---|---|---|
| Login | Log in with a real beta account on the deployed URL. |  |  |  |  |
| Logout | Log out and confirm the session is cleared. |  |  |  |  |
| Session restore | Log in, refresh the browser, and confirm the protected app restores the session. |  |  |  |  |
| Logged-out protection | Open protected deep links while logged out and confirm redirect to login/protected state. |  |  |  |  |
| Logged-in login route | Open `/login` while logged in and confirm expected redirect away from login. |  |  |  |  |
| Not-found handling | Open an unknown route and confirm the not-found/error experience is safe and understandable. |  |  |  |  |

## Core operational workflow checklist

| Area | Manual QA check | Pass | Fail | Blocked | Evidence / notes |
|---|---|---|---|---|---|
| Dashboard | Load the dashboard and confirm operational KPI cards/sections render without blocking errors. |  |  |  |  |
| Properties list | Load the properties page, search/filter if available, and confirm list state renders. |  |  |  |  |
| Properties create | Create a beta test property, record the property name/id, and confirm it appears in the list. |  |  |  |  |
| Properties edit | Edit the beta test property and confirm the updated values persist after refresh. |  |  |  |  |
| Properties archive | Exercise the existing archive/safe status behavior only on beta test data and confirm the result is visible. |  |  |  |  |
| Property detail | Open the property detail page and confirm property summary and related units area render. |  |  |  |  |
| Units create | Create a beta test unit from the property detail flow and confirm it is scoped to the property. |  |  |  |  |
| Units edit | Edit the beta test unit and confirm rent/status/property-scoped values persist after refresh. |  |  |  |  |
| Units archive | Exercise the existing unit archive/safe status behavior only on beta test data. |  |  |  |  |
| People | Create/edit currently supported people records and confirm owners/tenants/contact-style records display as expected. |  |  |  |  |
| Owners | Confirm owner basics and property ownership relationships display without accounting or payout claims. |  |  |  |  |
| Tenants | Confirm tenant records display and remain limited to currently supported operational data. |  |  |  |  |
| Contracts list | Load contracts list, search/filter if available, and confirm status/date/rent visibility. |  |  |  |  |
| Contracts create | Create a beta test contract with currently supported fields and unit selection guardrails. |  |  |  |  |
| Contracts edit | Edit the beta test contract and confirm changes persist after refresh. |  |  |  |  |
| Contracts detail | Open the contract detail page and confirm the detail/tabs render without accounting promises. |  |  |  |  |
| Invoices list | Load invoice list and confirm operational invoice rows/status display without ledger language. |  |  |  |  |
| Invoices detail | Open an invoice detail view where available and confirm status/amount display is readable. |  |  |  |  |
| Invoices search | Search/filter invoices where available and confirm expected beta test data is findable. |  |  |  |  |
| Invoice status display | Verify draft/open/paid/overdue or equivalent labels match current operational state only. |  |  |  |  |
| Payments | Exercise existing payment operational flow only with beta test data and confirm no ledger posting claim is shown. |  |  |  |  |
| Receipts | Open receipt operational views and confirm receipt details render for beta test data. |  |  |  |  |
| Maintenance filters | Load maintenance, apply filters/search where available, and confirm expected test records display. |  |  |  |  |
| Maintenance status | Exercise existing maintenance status update behavior only on beta test data. |  |  |  |  |
| Expenses filters | Load expenses/financials area, apply expense filters where available, and confirm expected test records display. |  |  |  |  |
| Reports preview | Load reports, adjust filters, and confirm reports remain read-only/commercial previews. |  |  |  |  |
| Settings/company | Load settings, validate company formatting fields, save beta-safe values, and confirm persistence after refresh. |  |  |  |  |
| Data reload | Refresh after each major mutation and confirm persisted state matches the expected beta test record. |  |  |  |  |
| Validation states | Exercise required-field, invalid date, invalid amount, and guarded duplicate/overlap validations where available. |  |  |  |  |

## Mobile viewport and accessibility smoke checklist

| Area | Manual QA check | Pass | Fail | Blocked | Evidence / notes |
|---|---|---|---|---|---|
| Mobile login | Login page is readable and usable at a narrow mobile viewport. |  |  |  |  |
| Mobile navigation | Main navigation can reach dashboard, properties, contracts, maintenance, reports, and settings. |  |  |  |  |
| Mobile forms | Property, unit, people, contract, maintenance, and settings forms remain readable and actionable. |  |  |  |  |
| Mobile tables/lists | Key lists are scrollable/readable without losing primary actions. |  |  |  |  |
| Keyboard reachability | Critical form fields and submit/cancel actions are keyboard reachable. |  |  |  |  |
| Arabic/RTL labels | Arabic labels and RTL-oriented copy remain readable in mobile and desktop smoke tests. |  |  |  |  |
| Error states | Empty, loading, validation, and error states are understandable and do not expose sensitive internals. |  |  |  |  |

## Accounting-grade flows explicitly blocked/deferred

These rows should remain **Blocked** or **Deferred by scope** for Phase 12 PR 12.2. A Pass here means the team confirmed the feature is not available or not promised during constrained beta.

| Deferred area | Expected beta result | Pass | Fail | Blocked | Evidence / notes |
|---|---|---|---|---|---|
| Ledger | No chart of accounts, journal entries, double-entry postings, or ledger mutation flow is introduced. |  |  |  |  |
| Owner statements | No owner statements, owner payable balances, or payout calculations are presented as available. |  |  |  |  |
| Tenant billing | No automated tenant billing cycle or tenant statement workflow is presented as available. |  |  |  |  |
| Vendor payments | No vendor/AP workflow, vendor bills, or vendor payments are presented as available. |  |  |  |  |
| Maintenance-to-expense automation | Maintenance requests do not automatically create accounting/expense entries as part of this beta checklist. |  |  |  |  |
| Accounting statements | No ledger-backed income statement, balance sheet, trial balance, cashflow statement, tax report, or audited statement is presented as available. |  |  |  |  |
| Financial calculations | No financial calculation change is introduced by this checklist. |  |  |  |  |
| Schema/RLS/RPC | No schema, migration, RLS, auth, or RPC change is introduced by this checklist. |  |  |  |  |

## Evidence capture template

Copy this block into the release issue or PR comment after manual QA:

```text
Beta cut date:
Deployment URL:
Vercel deployment id:
Supabase project ref/name:
QA owner:
Browser/device coverage:
Mobile viewport used:
Known blockers:
Accepted beta limitations:
Go/no-go decision:
Follow-up issues:
```

## Next step

After this checklist is used and evidence is collected, prepare **Phase 12 PR 12.3 — Beta readiness completion report** with the recorded manual QA status, blockers, accepted limitations, and go/no-go recommendation.
