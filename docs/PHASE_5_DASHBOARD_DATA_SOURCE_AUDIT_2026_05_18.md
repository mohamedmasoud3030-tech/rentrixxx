# Phase 5 Dashboard Data-Source Audit — 2026-05-18

Active phase: **Phase 5 — Dashboard**.

This is PR 5.1 for Phase 5. It is documentation-only and does not change runtime dashboard behavior.

## Executive confirmation

The current dashboard is already wired to real current-app data. It is not a blank or mock dashboard. It currently reads operational counts through `artifacts/rentrix/src/app/dashboardService.ts`, active contract data through the contracts feature, and financial report data through `artifacts/rentrix/src/features/financials/reports/useFinancialReports.ts`.

Phase 5 can proceed without schema changes if the implementation remains read-only, uses existing Supabase services/report helpers, and avoids conflicting financial calculations.

## Master Plan Phase 5 goals

- Rent due
- Collected rent
- Outstanding rent
- Expenses
- Net profit/loss
- Occupancy
- Expiring contracts
- Recent payments
- Overdue tenants

## Files/modules inspected

- `docs/RENTRIX_MASTER_PLAN.md`
- `docs/PHASE_4_COMPANY_SETTINGS_READINESS_AUDIT_2026_05_18.md`
- `artifacts/rentrix/src/app/dashboard-page.tsx`
- `artifacts/rentrix/src/app/dashboardService.ts`
- `artifacts/rentrix/src/features/contracts/useContracts.ts`
- `artifacts/rentrix/src/features/contracts/services/contractService.ts`
- `artifacts/rentrix/src/features/financials/reports/useFinancialReports.ts`
- `artifacts/rentrix/src/features/financials/reports/financialReportsService.ts`
- `artifacts/rentrix/src/features/settings/useCompanySettings.ts`
- `artifacts/rentrix/src/lib/companyFormatters.ts`
- `artifacts/rentrix/src/lib/formatters.ts`
- `artifacts/rentrix/src/types/database.ts`
- `supabase/migrations` for dashboard/RPC awareness

## Current dashboard state

`dashboard-page.tsx` currently renders:

- Operational hero/header.
- KPI card grid.
- Expiring contracts panel.
- Quick actions.
- Arrears/aging bucket panel.
- Monthly financial summary.
- Partial-error card if one or more queries fail.

It currently uses:

- `getDashboardOverview(now)` via React Query.
- `useContracts({ status: 'active' })`.
- `useFinancialPeriodSummaryReport(periodFilters)`.
- `useOverdueInvoicesReport(arrearsFilters)`.
- `useArrearsSummaryReport(arrearsFilters)`.
- `useAgedReceivablesReport(arrearsFilters)`.

## Current dashboard service state

`dashboardService.ts` exposes `getDashboardOverview(date)`.

It reads:

- `rpt_financial_summary` RPC for monthly financial totals.
- Count-only Supabase queries for properties, units, active contracts, expiring contracts, vacant units, and overdue invoices.

This service is read-only and does not mutate data.

## Existing financial report sources

`financialReportsService.ts` already exposes report loaders and summary helpers for:

- Invoice totals
- Payment totals
- Expense totals
- Outstanding balances
- Collection summary
- Financial period summary
- Financial cashflow
- Expense breakdown
- Overdue invoices
- Aged receivables
- Arrears summary
- Daily collection

Dashboard work should reuse these helpers and their financial math boundaries instead of adding duplicate formulas.

## Metric source strategy

| Metric | Safe source now | Implementation strategy | Deferred notes |
| --- | --- | --- | --- |
| Rent due | `getFinancialPeriodSummaryReport()` / invoice totals | Present as period invoiced or due amount with precise labeling | Do not invent separate due formulas |
| Collected rent | `getFinancialPeriodSummaryReport().paid` / payment report paths | Use financial reports as preferred source | No payment mutation |
| Outstanding rent | `getFinancialPeriodSummaryReport().outstanding` and arrears reports | Use report outstanding; keep overdue separate | No duplicate balance math |
| Expenses | `getFinancialPeriodSummaryReport().expenses` | Add first-class card | No report rewrite |
| Net profit/loss | `getFinancialPeriodSummaryReport().netCash` | Label as net cash/position | Avoid ledger/accounting semantics |
| Occupancy | units count and vacant units count from dashboard service | Derive rate only from current unit statuses | Do not change unit status rules |
| Expiring contracts | `useContracts({ status: 'active' })` with date window | Keep or move to dashboard snapshot helper | No contract mutation |
| Recent payments | Existing payment report paths can read payment data | Implement only if safe row context exists | No receipt/payment actions |
| Overdue tenants | `getOverdueInvoicesReport()` rows with tenant context | Add read-only grouped overdue display | No tenant statement workflow |

## Safe data sources now

1. `getFinancialPeriodSummaryReport(filters)` for collected, invoiced/due, outstanding, expenses, and net cash.
2. `getOverdueInvoicesReport(filters)` for overdue totals and overdue tenant/contract rows.
3. `getAgedReceivablesReport(filters)` and `getArrearsSummaryReport(filters)` for arrears and aging summaries.
4. `useContracts({ status: 'active' })` for expiring contracts and active-contract count.
5. `getDashboardOverview(date)` for current operational/RPC compatibility.
6. Phase 4 company settings contract and company-aware formatters for display.

## Deferred items

- Tenant statements and tenant-level ledgers: future Tenant/Reports/Payments phases.
- Receipt/invoice generation: Payments/Receipts and document phases.
- Accounting-grade profit/loss: Accounting/Ledger phase.
- Per-record currency and exchange rates: future schema/product scope.
- Unit occupancy rule changes: Properties/Units phase.
- Dashboard write actions: out of scope for current Dashboard phase.

## Recommended PR sequence

1. **PR 5.2 — Dashboard query/service foundation**
   - Add a typed read-only dashboard snapshot/service boundary.
   - Reuse financial report helpers.
   - Keep unavailable/deferred metric states explicit.
   - Add focused tests.

2. **PR 5.3 — Dashboard summary cards**
   - Wire the page to the snapshot.
   - Add cards for safe Phase 5 metrics.
   - Use company-aware money/date formatting.
   - Add loading, empty, error, and retry states.

3. **PR 5.4 — Dashboard operational lists**
   - Add or refine recent payments, overdue tenants, expiring contracts, and vacancy/occupancy sections where safe.
   - Keep all sections read-only.

4. **PR 5.5 — Dashboard commercial readiness polish**
   - Improve visual organization, RTL/LTR safety, money formatting, badges, and state coverage.
   - Fix Sonar/Codacy/Vercel issues.

5. **PR 5.6 — Phase 5 Dashboard completion report**
   - Verify Phase 5 goals and deferrals.
   - Recommend whether Phase 6 can start.

## Risks and guardrails

- `rpt_financial_summary` RPC exists and should not be removed blindly.
- `DashboardPage` currently orchestrates many queries directly; PR 5.2 should reduce page coupling through a snapshot boundary.
- Current dashboard uses `formatDefaultCompanyMoney()` in places; Phase 5 should move safe displays to company-aware formatting.
- Use precise Arabic labels so dashboard cards do not imply ledger-grade accounting where only period reports exist.
- Recent payment rows need safe context before implementation.
- Overdue tenant rows must handle null tenant/property/unit context.

## Intentionally not changed

- No runtime code changed.
- No dashboard UI changed.
- No schema or Supabase migrations added.
- No payment/receipt mutations added.
- No invoice/receipt/PDF/document generation added.
- No accounting/ledger work started.
- No communications/WhatsApp work started.
- PR #527 not touched.

## Validation

Docs-only PR validation:

```bash
git diff --check
rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true
```

Full validation is recommended if feasible:

```bash
pnpm --filter ./artifacts/rentrix run typecheck
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix run build
pnpm --filter ./artifacts/rentrix run lint
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
```
