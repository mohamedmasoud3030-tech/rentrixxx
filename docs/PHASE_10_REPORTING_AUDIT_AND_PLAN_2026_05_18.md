# Phase 10 — Reporting / Commercial Reports Audit and Implementation Plan

Date: 2026-05-18  
Active phase: Phase 10 — Reporting / Commercial Reports  
PR: Phase 10 PR 10.1 — Reporting audit and implementation plan  
Mode: docs-first audit and safe implementation plan only (no runtime reporting/accounting behavior changes, no schema/RLS/RPC changes).

## Prerequisite confirmation

Phase 9 completion report exists at `docs/PHASE_9_EXPENSES_COMPLETION_REPORT_2026_05_18.md` and confirms Phase 9 boundaries were preserved before Phase 10 starts.

## Executive conclusion

The safest Phase 10.1 outcome is a read-only reporting plan that separates:

1. **Operational/commercial reporting previews** (cash collection, overdue follow-up, rent roll visibility, period totals), from
2. **Accounting-grade financial statements** (income statement, balance sheet, trial balance, owner/tenant statements) that must stay deferred until a dedicated accounting/ledger phase.

Current reporting already has a meaningful read-only foundation in `features/reports` and `features/financials/reports`, including data filtering, aggregation helpers, and CSV exports. Phase 10 PR 10.2 should reuse this foundation, tighten consistency, and avoid introducing new financial posting behavior.

---

## 1) Current reporting inventory

## Route/page inventory

- `/reports` is wired to `ReportsPage` via `_protected.reports.tsx`.  
- `ReportsPage` renders multiple report sections and read-only export actions.  
- `/financials` still renders a smaller reports preview section via `FinancialReportsPreviewSection` + `useCollectionSummaryReport`.

## Report services and hooks that already exist

### Service: `financialReportsService.ts`

Existing report loaders/helpers include:

- `getCollectionSummaryReport`
- `getDailyCollectionReport`
- `getFinancialPeriodSummaryReport`
- `getFinancialCashflowReport`
- `getInvoiceTotalsReport`
- `getPaymentTotalsReport`
- `getExpenseTotalsReport`
- `getExpenseBreakdownReport`
- `getOutstandingBalanceReport`
- `getOverdueInvoicesReport`
- `getAgedReceivablesReport`
- `getArrearsSummaryReport`

### Hook layer: `useFinancialReports.ts`

Existing hooks expose all major report types with dedicated query keys (`financialReportKeys`) and are designed for read-only queries.

### Current report UI surfaces

- `features/reports/reports-page.tsx` (primary report workspace):
  - Financial Summary section
  - Daily Collection section
  - Invoice Totals section
  - Payment Totals section
  - Expense Totals/Breakdown section
  - Outstanding Balance section
  - Overdue Invoices section
  - Aged Receivables section
  - Rent Roll preview section
  - Receipt preview/download actions
  - Deferred statements panel (income statement / balance sheet / trial balance)
- `features/financials/components/financial-reports-preview-section.tsx` (limited collection summary preview).

---

## 2) Operational previews vs financial/accounting-style reports

## Operational/commercial-style (currently safe)

- Daily collection trend and totals.
- Period summary (`invoiced`, `paid`, `outstanding`, `expenses`, `netCash`).
- Invoice/payment/expense totals and counts.
- Expense category/property breakdown.
- Overdue invoices and aged receivables follow-up.
- Rent roll and receipt preview links.

These are currently presented as read-only snapshots over operational data, not journal-posted accounting statements.

## Financial/accounting-style (must remain deferred)

- Income statement.
- Balance sheet.
- Trial balance.
- Owner statement.
- Tenant statement.

Database RPCs and migration history indicate these accounting-grade report functions exist or were hardened at DB level, but the UI intentionally marks key statements as deferred and does not safely present a completed accounting workflow in current runtime.

---

## 3) Data source map by report dependency

Current report loaders read from canonical transactional tables/services:

- **Invoices**: invoice amount, paid amount, due date, status, contract linkage.
- **Payments**: posted payments used for collection totals and daily collection rows.
- **Receipts**: receipt identifiers/dates used for preview/export navigation.
- **Contracts**: contract/property/unit/tenant fields for overdue/rent-roll context.
- **Expenses**: expense totals and category/property breakdown.
- **Properties**: labels/lookup context, especially in rent roll and expense/property views.
- **Units**: unit labels/occupancy context used in commercial/rent-roll style reporting.
- **Maintenance**: not a direct canonical report input in current financial report service calculations.
- **Owners**: no safe end-user owner statement workflow in current report page.
- **Dashboard summaries**: `dashboardService` exists separately; report page relies mainly on financial report hooks rather than dashboard aggregate cards.

Operationally, the main report calculations are built from invoice/payment/expense datasets and related display joins (contracts/properties/units/people labels), not from accounting ledger postings.

---

## 4) Canonical derived totals vs duplicated/local calculations

## Derived via canonical report service/helpers (preferred)

- Most report totals in `ReportsPage` are fetched via `useFinancialReports` hooks backed by `financialReportsService` summarize/filter helpers.
- Query invalidation from invoice/payment/expense mutations targets `financialReportKeys.all`, so these report reads stay synchronized with current canonical service calculations.

## Local/duplicated calculation patterns to watch

- Some feature pages outside `reports-page` still calculate local summaries (for example contract page summary cards, invoice workspace summaries, operational maintenance/property summary cards). Those are not all part of the central reporting module and can drift in naming/definition.
- `financials-page` contains a separate preview section using collection summary only, creating partial overlap with `/reports` totals.

Phase 10.2 should reduce divergence in labels/definitions and prefer canonical report service outputs where practical.

---

## 5) Schema / RPC / cache observations

## Report cache/query keys

- React Query cache namespace is explicit (`financialReportKeys.*`) and already used by:
  - report hooks for read queries,
  - invoice/payment/expense mutations for invalidation.

This is app-query cache coupling only (client-side query cache), not DB materialized-report table writes.

## Supabase RPC coupling

- Runtime report service is primarily implemented as table reads + TypeScript summarization (bounded, batched loaders).
- Separate RPCs exist in migrations/types for reporting/accounting signatures (for example `rpt_financial_summary`, `rpt_aged_receivables`, etc.) and hardening migrations adjusted execution permissions.
- Current report UI path should continue preferring existing safe service/hook reads unless an RPC is explicitly validated as canonical in a later accounting phase.

## Schema observations

- No Phase 10.1 need for schema migrations, RLS updates, or new RPCs.
- Existing `types/database.ts` includes reporting RPC signatures, but this PR intentionally remains docs-only.

---

## 6) Read-only vs mutation behavior assessment

- Report hooks/services are read-only by design.
- Financial mutations are performed by dedicated invoice/payment/expense flows outside report components.
- No evidence that current report page directly inserts/updates/deletes financial rows.

Safety note: payment posting uses RPC (`post_receipt_atomic`) in the payments feature and invoice generation uses RPC (`generate_invoices_from_active_contracts`) in invoices feature; reporting must remain a consumer-only surface and not trigger these workflows.

---

## 7) Risks

1. **Terminology risk**: UI labels may imply accounting-grade statements where data is operational/commercial only.
2. **Definition drift risk**: overlapping summaries across financials/contracts/dashboard/reports can diverge if not normalized.
3. **Scope creep risk**: adding “report enhancements” can accidentally introduce posting/mutation or new statement logic.
4. **RPC overreach risk**: directly wiring partially governed accounting RPCs into end-user reports before ledger-phase guardrails.
5. **Trust risk**: users may treat operational net-cash previews as audited accounting outputs.

---

## 8) Recommended Phase 10 implementation path (safe and small)

## Phase 10 PR 10.2 proposed implementation focus

Read-only commercial reporting polish only:

- Improve report section labeling to explicitly mark **operational/commercial** scope.
- Clarify date-range/filter behaviors and empty states.
- Improve consistency of metric names/definitions across report cards.
- Strengthen export readiness (CSV naming/column clarity) using existing data already loaded.
- Reuse canonical `financialReportsService` outputs rather than introducing duplicate on-page math.
- Keep deferred accounting statements visible as deferred (no false activation).

## Constraints to enforce in PR 10.2

- Do not create or mutate invoices/payments/receipts/expenses from report UI.
- Do not add ledger/accounting entries.
- Do not alter contract/payment/receipt lifecycle behavior.
- Do not add owner statements or owner chargebacks.
- Do not add tenant billing.
- Do not add dashboard rewrites.
- Do not add supabase migrations or RLS changes.
- Do not add new report RPC runtime dependencies in this phase.

---

## 9) Explicit non-goals (Phase 10.1 and 10.2 boundary)

- No ledger/journal/accounting posting work.
- No new financial statement engine.
- No invoice/payment/receipt/expense creation workflows from reports.
- No owner accounting outputs.
- No tenant billing outputs.
- No schema changes/RLS changes/migration batch.
- No legacy import path adoption.

---

## 10) Proposed PR 10.2 scope

1. Report-page copy/section taxonomy update:
   - Operational reports vs deferred accounting statements.
2. Minor read-only UX improvements:
   - filter clarity, metric helper text, empty/loading/error messaging alignment.
3. Export readiness improvements:
   - stable CSV labels/ordering for existing report datasets.
4. Service/hook alignment pass:
   - ensure report UI uses existing canonical hooks/helpers consistently.

No data-model, migration, posting, or accounting-rule changes.

---

## 11) Validation checklist

Before merge of PR 10.2 (and any Phase 10 reporting UI changes), verify:

- [ ] Reports remain read-only (no insert/update/delete/rpc-posting side effects from report actions).
- [ ] No new Supabase migrations under `supabase/migrations`.
- [ ] No RLS or policy changes.
- [ ] No new accounting/ledger logic.
- [ ] No invoice/payment/receipt/expense creation buttons added to reports.
- [ ] Existing canonical report hooks/services are reused instead of duplicate calculations.
- [ ] Deferred accounting statements remain explicitly deferred.
- [ ] Required quality checks pass:
  - `git diff --check`
  - `rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true`
  - `pnpm --filter ./artifacts/rentrix run typecheck`
  - `pnpm --filter ./artifacts/rentrix run build`
  - `pnpm --filter ./artifacts/rentrix run lint`
  - `pnpm --filter ./artifacts/rentrix test`
  - `pnpm --filter ./artifacts/rentrix run test:financials`

---

## Scope confirmation for PR 10.1

This PR 10.1 is docs-only and intentionally does **not** change runtime code, reporting queries, accounting logic, schema, RLS, or migrations.
