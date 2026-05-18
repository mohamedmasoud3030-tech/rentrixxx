# Phase 5 Dashboard Completion Report — 2026-05-18

## Executive confirmation

Phase 5 — Dashboard is complete for the approved read-only commercial dashboard scope.

The dashboard now has a documented data-source strategy, a typed snapshot service boundary, company-aware summary cards, operational lists, commercial readiness polish, loading/empty/error/retry states, and Arabic-first presentation without introducing schema changes, mutations, generated documents, or conflicting financial calculations.

Phase 6 — Properties and Units can start after this report is reviewed and merged.

No blocker remains inside the approved Phase 5 Dashboard scope.

## Completed Phase 5 PRs

### #530 — Dashboard data-source audit

- Added `docs/PHASE_5_DASHBOARD_DATA_SOURCE_AUDIT_2026_05_18.md`.
- Confirmed the existing dashboard already used current-app data, including `dashboardService`, contracts data, and financial report hooks.
- Mapped Phase 5 metrics to safe current sources.
- Identified deferrals and guardrails before runtime work started.

Why it fits Phase 5: it established the Dashboard source-of-truth plan and prevented conflicting financial calculations.

### #531 — Dashboard snapshot service foundation

- Added `artifacts/rentrix/src/app/dashboardSnapshot.ts`.
- Added `DashboardSnapshot`, dashboard period helpers, occupancy calculation, financial metric mapping, operational summary mapping, and arrears mapping.
- Reused existing current-app sources:
  - `getDashboardOverview()`
  - `getFinancialPeriodSummaryReport()`
  - `getOverdueInvoicesReport()`
  - `getArrearsSummaryReport()`
  - `getAgedReceivablesReport()`
  - `listContracts({ status: 'active' })`
- Added tests in `dashboardSnapshot.test.ts`.

Why it fits Phase 5: it created a typed read-only Dashboard boundary that avoids UI-level duplicated financial formulas.

### #532 — Dashboard summary cards

- Wired `DashboardPage` to `getDashboardSnapshot()`.
- Added or refreshed summary cards for:
  - rent due / invoiced
  - collected rent
  - outstanding rent
  - expenses
  - net position
  - occupancy
  - expiring contracts
- Used Phase 4 normalized company settings and company-aware money/date formatting.
- Added retryable error state.
- Added summary-card tests.
- Fixed Sonar readability issues inside the same PR before merge.

Why it fits Phase 5: it delivered the main dashboard KPI surface from the approved snapshot path.

### #533 — Dashboard operational lists

- Added read-only overdue tenants panel based on existing overdue invoice rows from the dashboard snapshot.
- Kept expiring contracts read-only.
- Preserved arrears display and company-aware formatting.
- Added null-safe fallbacks for tenant/property/unit values.
- Added tests for overdue tenant row mapping.

Why it fits Phase 5: it delivered the operational dashboard lists without payment, receipt, contract, tenant, or report mutations.

### #534 — Dashboard commercial readiness polish

- Polished the dashboard layout after the summary cards and operational lists were added.
- Extracted the monthly financial panel for a clearer dashboard structure.
- Kept all money/date displays company-aware.
- Replaced a remaining English label with Arabic-first copy.
- Preserved Sonar-safe readability patterns.

Why it fits Phase 5: it completed the approved commercial-readiness pass without expanding scope.

## Dashboard checklist status

| Dashboard item | Status | Evidence / notes |
| --- | --- | --- |
| Rent due | Complete | Summary card uses dashboard snapshot financial `rentDue`, mapped from current financial period report as invoiced/due-for-period display. |
| Collected rent | Complete | Summary card uses snapshot `collectedRent`, derived from existing financial period report payment totals. |
| Outstanding rent | Complete | Summary card uses snapshot `outstandingRent`, derived from existing financial period report outstanding totals. |
| Expenses | Complete | Summary card uses snapshot `expenses`, derived from existing expense/report paths. |
| Net profit/loss | Complete within dashboard wording | Dashboard shows `netPosition` / net cash from existing financial reports. Accounting-grade profit/loss remains deferred. |
| Occupancy | Complete | Summary card uses snapshot occupancy rate from units/vacant units count without changing unit status rules. |
| Expiring contracts | Complete | Read-only panel displays active contracts ending within 30 days, using company-aware date formatting. |
| Recent payments | Deferred | Not implemented because a safe row-level payment context/action boundary was not added in Phase 5. No payment/receipt actions were introduced. |
| Overdue tenants | Complete | Read-only overdue tenants panel uses existing overdue invoice report rows, sorted and null-safe. |
| Loading states | Complete | KPI grid, expiring contracts, arrears, overdue tenants, and monthly financial panel use skeleton/loading states. |
| Empty states | Complete | Expiring contracts and overdue tenants show empty states. |
| Error/retry state | Complete | Dashboard has retryable error card for snapshot query failure. |
| Company-aware money formatting | Complete | Dashboard display routes money through `formatCompanyMoney()` with `useCompanySettingsContract()`. |
| Company-aware date formatting | Complete | Dashboard display routes dates through `formatCompanyDate()` with `useCompanySettingsContract()`. |
| Read-only behavior | Complete | Dashboard did not add mutations, payment posting, receipts, invoices, documents, or WhatsApp actions. |
| Legacy architecture guardrails | Complete | No `legacy-src`, `useApp`, `AppContext`, `dataService`, local DB, or `react-router-dom` patterns were introduced. |

## Metrics implemented

Implemented in the Dashboard phase:

- Rent due / current-period invoiced amount
- Collected rent
- Outstanding rent
- Expenses
- Net position / net cash
- Occupancy percentage
- Active/expiring contracts operational display
- Overdue tenant rows from overdue invoice report data
- Arrears totals and aging buckets
- Monthly financial summary
- Quick links to relevant existing application areas

## Metrics and items deferred

### Recent payments

Deferred because Phase 5 did not add a safe row-level recent payment display context with tenant/property/contract hydration. This should be handled in a future Payments/Receipts or Dashboard follow-up after confirming the canonical payment display service.

Schema approval needed: no, if built from existing payment/report services only.

### Tenant statements

Deferred because tenant statements belong to Tenant/Reports phases. The dashboard only shows overdue tenant rows and does not calculate or present a full tenant statement.

Schema approval needed: possibly, depending on the future statement/export scope.

### Accounting-grade profit/loss

Deferred because accounting-grade profit/loss belongs to the later Accounting/Ledger phase. The dashboard shows net cash/position from existing report helpers only.

Schema approval needed: likely for ledger-grade accounting features.

### Receipt/invoice/document generation

Deferred because Phase 5 was read-only. Generated receipts, invoice numbers, PDF output, print, and send actions belong to Payments/Receipts and document/PDF phases.

Schema approval needed: yes if generated numbering or persisted artifacts change.

### Per-contract/per-invoice currency and exchange rates

Deferred by the Master Plan. Dashboard uses company default currency formatting and does not implement exchange conversion.

Schema approval needed: yes for per-record currency.

### Unit occupancy business rules

Deferred to Phase 6 Properties and Units. Dashboard only reads existing counts and does not change occupancy rules.

Schema approval needed: only if Phase 6 changes storage/rules.

## Validation summary

Expected validation for the Phase 5 code PRs:

```bash
pnpm --filter ./artifacts/rentrix run typecheck
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix run build
pnpm --filter ./artifacts/rentrix run lint
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
git diff --check
rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true
```

Hosted checks were handled per PR during the Dashboard sequence. Any Sonar issues found during Phase 5 were fixed in the same PR branch before merge.

## Risks and notes

- The dashboard still depends on existing Supabase/report paths and the `rpt_financial_summary` compatibility path through `dashboardService`.
- Rent due wording is period-report based and should not be treated as a new ledger formula.
- Net position is not an accounting ledger profit/loss statement.
- Recent payment rows remain intentionally deferred.
- Dashboard remains read-only.
- No schema or Supabase migrations were added.
- No payment, receipt, invoice, PDF, document, accounting, WhatsApp, or communications flows were added.
- PR #527 was not touched.

## Final recommendation

Phase 5 Dashboard is complete within the approved scope.

Recommended next phase:

**Phase 6 — Properties and Units**

Exact next task title:

**Phase 6 PR 1 — Properties and Units data/state audit**
