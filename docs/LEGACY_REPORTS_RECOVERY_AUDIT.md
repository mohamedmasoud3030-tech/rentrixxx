# Legacy Reports Recovery Audit

Date: 2026-05-14

## Summary

This audit maps the legacy report-like surface area to the current financial reporting foundation merged in PR #453. It is intentionally docs-only: no app code, schema, report calculations, dashboard UI, print/PDF, exports, or document templates were changed.

The legacy code contains **20 report-like features** across the dedicated reports dashboard, accounting UI, arrears screen, dashboard KPIs/charts/alerts, owner hub, and owner portal summary.

High-level outcome:

- **Already covered by the current reporting engine:** 4 foundational totals/summary reports: invoice totals, payment totals, expense totals, outstanding balance, plus the composed collection summary.
- **Partially covered:** financial summary, income statement shape, daily collection totals, aged/overdue receivables, arrears, owner summaries, dashboard financial KPIs, and rent-roll-adjacent counts.
- **Not covered:** accounting statements backed by journal entries, owner/tenant statements, detailed rent roll, dashboard rebuild metrics, account ledger, chart-of-accounts balance reporting, balance reconciliation, and export/print/PDF variants.
- **Blocked by missing or incomplete current schema/data:** owner model/reporting (`owner_name` exists but no property owner FK), accounting ledger/accounts/journal entries, method-level collection splits, statement ledgers, and reconciliation views.
- **Explicitly deferred:** dashboard rebuild, statements layer, Arabic-safe print/PDF/document generation, CSV/export, and any UI beyond the current foundation.

## Current reporting engine coverage

The current reporting foundation is intentionally narrow. `financialReportsService.ts` defines date-bounded filters with optional property, tenant, contract, and invoice status dimensions, then hydrates current-app invoices, payments, and expenses without importing legacy app state.

| Current report/service | Inputs/filters | Outputs | Legacy coverage value | Notes |
|---|---|---|---|---|
| `getInvoiceTotalsReport` | `dateFrom`, `dateTo`, optional `propertyId`, `tenantId`, `contractId`, `status` | `totalAmount`, `totalPaid`, `totalOutstanding`, `invoicesCount` | Covers aggregate invoice totals used by several legacy financial/dashboard summaries | Uses invoice issue date for date range. It is not an arrears aging report and does not group rows. |
| `getPaymentTotalsReport` | `dateFrom`, `dateTo`, optional property/tenant/contract through invoice/contract hydration | `totalPaid`, `paymentsCount` | Covers gross collections totals | Does not split by payment method or produce daily rows. |
| `getExpenseTotalsReport` | `dateFrom`, `dateTo`, optional `propertyId` | `totalExpenses`, `expensesCount` | Covers aggregate expense totals | No category, owner, tenant, or accounting-account grouping yet. |
| `getOutstandingBalanceReport` | Same invoice filters | `totalOutstanding`, `invoicesCount` where remaining amount is positive | Covers broad outstanding balance totals | Does not apply due-date/as-of aging semantics. |
| `getCollectionSummaryReport` | Same date range/context filters | `invoiced`, `paid`, `outstanding`, `receiptsCount`, `invoicesCount`, `expensesTotal` | Covers the current month “reports financial summary” card | It composes the four foundation summaries; it is not a full legacy financial summary or statement. |

Current schema observations that affect recovery:

- Current properties store `owner_name`, but not a durable `owner_id` relationship from property to `people`.
- Current `people.type` can be `tenant`, `owner`, or `contact`, but current contracts reference `tenant_id` only.
- Current financial tables cover properties, units, people, contracts, invoices, payments, maintenance requests, and expenses.
- Current generated function typing exposes `post_receipt_atomic`, invoice generation, and a small `rpt_financial_summary` signature, but the new reporting service does not use legacy report RPCs.
- Current app has no typed accounts, journal entries, account balances, owner balances, contract balances, tenant balances, report snapshots, balance reconciliation view, or document/PDF report layer in `src/types/database.ts`.

## Legacy reports inventory table

| # | Legacy report-like feature | Domain category | Legacy file(s) | Purpose | Inputs/filters | Output fields/metrics | Implementation mode | Legacy dependency |
|---:|---|---|---|---|---|---|---|---|
| 1 | Financial summary (`summary`, الملخص المالي) | Financial reports; dashboard-like metrics | `legacy-src/components/reports/ReportsDashboard.tsx`; `legacy-src/services/reports/ReportEngine.ts`; `legacy-src/services/reportsService.ts` | Period summary of collections, expenses, net profit, arrears, contracts, occupancy, pending invoices | Date range presets/from/to; RPC params `p_from`, `p_to` | `collected`, `expenses`, `netProfit`, `overdue_amount`, `overdue_count`, `active_contracts`, `occupancy_rate`, `occupied_units`, `total_units`, `pending_invoices`, occupancy pie | Backed by Supabase RPC through legacy `reportEngine` and report snapshot/cache | `useApp` for currency/settings; legacy `reportEngine`; legacy Supabase client; chart UI |
| 2 | Income statement (`income_statement`, قائمة الدخل) | Financial reports; statements | `legacy-src/components/reports/ReportsDashboard.tsx`; `legacy-src/services/accountingService.ts`; `legacy-src/services/pdfService.ts` | Revenue, expense, and net income report by account | Date range presets/from/to; RPC params `p_from`, `p_to`; PDF helper accepted a date range | `total_revenue`/`totalRevenue`, `total_expense`/`totalExpense`, `net_income`, revenue lines (`no`, `name`, `balance`), expense lines | Reports dashboard backed by RPC; accounting service also had frontend journal-entry calculation; PDF helper existed | Requires accounts/journal entries and legacy report RPC/PDF/document controller |
| 3 | Trial balance (`trial_balance`, ميزان المراجعة) | Financial reports; accounting reports; statements | `legacy-src/components/reports/ReportsDashboard.tsx`; `legacy-src/ui/Accounting.tsx`; `legacy-src/services/accountingService.ts`; `legacy-src/services/pdfService.ts` | Verify debit/credit totals and per-account net balances as of a date | `asOf`/end date; RPC param `p_as_of`; Accounting tab date picker | Account `no`, name, type, total debit, total credit, net balance, total debit/credit, balanced flag; PDF export in Accounting tab | Reports dashboard backed by RPC; Accounting tab calculated in frontend from `db.journalEntries`; PDF export helper | Requires legacy `db.accounts`, `db.journalEntries`, `useApp`, PDF document controller |
| 4 | Balance sheet (`balance_sheet`, الميزانية العمومية) | Financial reports; statements | `legacy-src/components/reports/ReportsDashboard.tsx`; `legacy-src/services/accountingService.ts`; `legacy-src/services/pdfService.ts` | Assets/liabilities/equity statement as of a date | `asOf`; RPC param `p_as_of`; PDF helper date | Totals for assets/liabilities/equity, balance flag/difference, hierarchical account rows (`no`, `name`, `balance`) | Reports dashboard backed by RPC; accounting service had frontend calculation; ReportsDashboard had browser print/PDF window | Requires accounts/journal entries/current earnings logic; print/PDF deferred |
| 5 | Aged receivables (`aged_receivables`, أعمار الديون) | Tenant reports; arrears/overdue reports; collection reports | `legacy-src/components/reports/ReportsDashboard.tsx`; `legacy-src/services/accountingService.ts` | Buckets outstanding tenant receivables by age | `asOf`; RPC param `p_as_of` | Buckets current, 1-30, 31-60, 61-90, +90/90+, totals, tenant, phone, property, unit | Reports dashboard backed by RPC; accounting service also had frontend helper from invoices/contracts/tenants | Depends on invoice due dates, remaining amounts, tenants/contracts/properties/units; legacy helper used local `db` |
| 6 | Overdue invoices (`overdue`, المتأخرون عن الدفع) | Arrears/overdue reports; tenant reports; collection reports | `legacy-src/components/reports/ReportsDashboard.tsx` | Actionable overdue tenant invoice list with WhatsApp/tel context | `asOf=today`; search by tenant/unit/property | Total overdue, invoice count, >90-day count, average overdue days, tenant, phone, property, unit, invoice no, due date, days overdue, remaining | Backed by RPC with frontend search/derived KPIs | Requires tenant phone, property/unit context, invoice due dates, legacy `reportEngine`; includes WhatsApp link behavior that should be separate from report engine |
| 7 | Tenant statement (`tenant_statement`, كشف حساب المستأجر) | Tenant reports; contract reports; statements | `legacy-src/components/reports/ReportsDashboard.tsx`; `legacy-src/ui/Tenants.tsx` links into reports | Account statement for a selected contract | Contract selection; RPC param `p_contract_id` | Tenant name, property/unit, final balance, lines with date, description, debit, credit, running balance | Backed by RPC; selected contracts from legacy `db.contracts` | Requires statement ledger semantics and contract/tenant/unit context; legacy `useApp` contracts |
| 8 | Owner statement (`owner_statement`, كشف حساب المالك) | Owner reports; statements | `legacy-src/components/reports/ReportsDashboard.tsx`; `legacy-src/ui/Owners.tsx` links into reports | Owner period statement of collections, deductions, net amount | Owner selection; date range; RPC params `p_owner_id`, `p_from`, `p_to` | Total gross, total deductions, total net, transaction rows date/details/property/gross/deduction/net | Backed by RPC; owner list from legacy `db.owners` | Blocked until current owner relationship/model is settled; legacy `useApp` owners |
| 9 | Daily collection (`daily_collection`, التحصيل اليومي) | Collection/payment reports; financial reports | `legacy-src/components/reports/ReportsDashboard.tsx` | Daily collection trend and method split | Date range; RPC params `p_from`, `p_to` | Total, rows by date: total, cash, bank, POS, other, receipt count; line chart | Backed by RPC | Current payments have payment method, but current report foundation does not group daily or by method |
| 10 | Rent roll (`rent_roll`, قائمة الإيجارات) | Property reports; unit/occupancy reports; contract reports; arrears reports | `legacy-src/components/reports/ReportsDashboard.tsx` | Snapshot of units, occupancy, tenant/contact, contract dates, rent and overdue balance | `asOf=today`; RPC param `p_as_of` | Total units, occupied count, monthly rent, rows: property, unit, unit type, tenant, phone, contract start/end, days to expiry, rent amount, overdue balance | Backed by RPC with frontend roll-up totals | Needs units/properties/contracts/people/invoices; current schema lacks `unit_type` but has unit status/rent amount |
| 11 | Balance reconciliation (`reconciliation`, مطابقة الأرصدة) | Financial reports; accounting reports; admin/audit reports | `legacy-src/components/reports/ReportsDashboard.tsx` | Admin-only comparison of cached balances versus ledger balances | Admin role; reads view `v_balance_reconciliation`; refresh; rebuild snapshots action | Counts by OK/WARN/CRITICAL, rows: entity type/id/name, cached value, ledger value, drift, status, checked_at | Direct Supabase view query plus `useApp().rebuildSnapshotsFromJournal()` mutation | Requires accounting ledger, cached balance tables, reconciliation view, admin permission model; includes a mutation and must not be recovered inside read-only reports first |
| 12 | Dashboard operational KPI strip | Dashboard-only metrics; property/unit/occupancy/tenant/contract reports | `legacy-src/ui/Dashboard.tsx` | Top-level operational snapshot | None beyond current local date/settings; derived from local DB | Total properties, total units, vacant units, active contracts, active tenants, occupancy rate | Frontend calculations from `useApp().db` | Depends on legacy local DB and `react-router-dom` navigation; should wait for dashboard rebuild |
| 13 | Dashboard financial KPI strip | Dashboard-only metrics; financial reports | `legacy-src/ui/Dashboard.tsx` | Month financial snapshot and balances | Current month by ISO prefix; settings currency | Monthly revenue, monthly expenses, net monthly, treasury balance, total credit balances | Frontend calculations from local DB and finance helpers | Depends on receipts/expenses/invoices plus legacy owner/contract balance caches |
| 14 | Dashboard alerts | Dashboard-only metrics; contract reports; arrears reports | `legacy-src/ui/Dashboard.tsx` | Action cards for expiring contracts, overdue invoices, pending maintenance | Contract alert days from settings; current date | Count of expiring contracts, overdue invoices, pending maintenance | Frontend calculations from local DB and helper services | Depends on legacy settings, local DB, router navigation; dashboard last |
| 15 | Dashboard revenue/expense trend | Dashboard-only metrics; financial reports | `legacy-src/ui/Dashboard.tsx` | Six-month revenue versus expense chart | Last six months, derived client-side | Monthly revenue and expenses by month | Frontend chart from receipts and expenses | Current engine can support totals but not trend grouping yet; dashboard last |
| 16 | Arrears screen | Arrears/overdue reports; tenant reports | `legacy-src/ui/financial/Arrears.tsx` | Current overdue invoice list with tenant names and total arrears | Current date; status `OVERDUE` or `UNPAID`; invoice due date before today | Total arrears, invoice no, tenant name, due date, remaining amount | Frontend calculation from `useApp().db` | Similar to overdue report but simpler; depends on legacy statuses and local DB |
| 17 | Owner hub summary | Owner reports; property reports; contract reports; arrears reports | `legacy-src/ui/OwnersHub.tsx` | Owner page summarizing owned properties, contracts, invoices, payments, expenses, arrears | Route `ownerId`; owner properties/contracts derived through local IDs | Total invoices, total payments, total expenses, total arrears, property list, contract list | Frontend calculation from `useApp().db` and finance helpers | Blocked by current owner model; legacy owner/property/expense relationships |
| 18 | Owner portal summary | Owner reports; export/share/portal report | `legacy-src/ui/OwnerView.tsx` | Public/portal-facing owner financial summary | Route `ownerId` plus `authToken`; verified owner access token | Owner name, total collections, total expenses plus office share, net due | Backed by owner portal access service payload | Depends on legacy owner access token flow and precomputed payload; likely after owner reporting and auth decisions |
| 19 | Accounting chart-of-accounts balance report and account ledger modal | Financial reports; accounting reports; export reports | `legacy-src/ui/Accounting.tsx`; `legacy-src/services/accountingService.ts` | Per-account balances by type plus drill-in ledger movement | Account type group; selected account; start/end dates; CSV per group | Grouped account balances; CSV rows `no`, account name, type, balance; ledger opening balance, date, voucher no, debit, credit, running balance | Frontend calculation from local accounts/journal entries; CSV export | Requires current accounting schema; export deferred |
| 20 | Accounting health check | Financial reports; accounting/audit reports | `legacy-src/ui/Accounting.tsx`; `legacy-src/services/accountingService.ts` | Validate debit/credit balance and counts | None | Balanced flag, discrepancy, journal count, account count | Frontend calculation from local accounts/journal entries | Requires current accounting schema; not part of financial report foundation yet |

## Gap analysis table

| Legacy feature(s) | Current classification | Why | Recovery target |
|---|---|---|---|
| Financial summary | Partially covered | Current collection summary has invoiced/paid/outstanding/expense totals, but not active contracts, occupancy, pending invoices, arrears count, or net-profit semantics matching legacy | Split financial totals into Batch A; defer occupancy/contracts/dashboard metrics to later batches |
| Income statement | Partially covered / blocked by missing accounting schema | Current expense/revenue totals approximate only a cash/invoice summary; no accounts/journal entries or account-line income statement exist | Defer real statement until accounting/schema decision; do not fake from current totals |
| Trial balance | Not covered / blocked by missing accounting schema | Current schema has no accounts, journal entries, account balances, or trial-balance service | Defer until accounting ledger foundation exists |
| Balance sheet | Not covered / blocked by missing accounting schema | Requires assets/liabilities/equity account hierarchy and current earnings | Defer until accounting ledger foundation exists |
| Aged receivables | Partially covered | Current outstanding balance totals exist, but no as-of due-date buckets or tenant/property/unit grouped lines | Batch E after a safe invoice aging service is added |
| Overdue invoices and Arrears screen | Partially covered | Current outstanding report finds remaining balances, but not due-date overdue rows, days overdue, tenant phone, or WhatsApp-ready context | Batch E; communications actions separate from report engine |
| Tenant statement | Not covered / should defer until statements layer | Requires debit/credit/running-balance statement semantics across invoices/payments and contract context | Batch B statements layer |
| Owner statement, Owner hub, Owner portal summary | Not covered / blocked by missing owner model | Current property has `owner_name`, but reporting needs durable owner relationships and expense ownership | Batch C after owner schema/model decision |
| Daily collection | Partially covered | Current payment totals/counts exist; no daily rows or payment-method breakdown | Batch A if current payments are sufficient; no export/PDF |
| Rent roll | Not covered / partially blocked by missing fields | Current units/contracts/properties/people can support much of it, but no report service yet and legacy `unit_type` has no current equivalent | Batch D; document unknown fields explicitly |
| Balance reconciliation | Not covered / blocked by missing accounting/cached-balance schema | Requires view `v_balance_reconciliation`, ledger balances, cached balances, admin-only rebuild | Defer until accounting/reconciliation foundation; not a first recovery batch |
| Dashboard operational KPIs, financial KPIs, alerts, trend | Partially covered / should defer until dashboard rebuild | Current reports can feed some totals, but dashboard should not be rebuilt before report services stabilize | Batch F only after services are stable |
| Accounting chart-of-accounts balances, account ledger, health check | Not covered / blocked by missing accounting schema | No current accounts/journal entries in typed schema | Defer to accounting foundation; CSV/export later |
| Print/PDF/export variants | Should defer until document/PDF layer | Legacy had browser print/PDF, DocumentController PDF exports, and CSV export; these are explicitly outside this task and outside core report recovery | Batch G after document system and Arabic-safe rendering plan |

## Recommended next implementation batches

### Batch A: Missing financial reports that fit the current schema

Scope only service-level report recovery using the current app architecture and current Supabase-backed tables.

Candidate reports:

1. **Daily collection summary service**
   - Inputs: date range, optional property/tenant/contract filters.
   - Outputs: rows by payment date with total, payment method splits (`cash`, `bank_transfer`, `card`, `check`, `other`), payment count.
   - Current schema fit: payments already have `payment_method`, `payment_date`, and invoice relation can be hydrated through invoice/contract.

2. **Financial period summary service**
   - Inputs: date range, optional property/tenant/contract filters.
   - Outputs: invoiced, paid, expenses, outstanding, invoice count, payment count.
   - Current schema fit: mostly covered by `getCollectionSummaryReport`; formalize it as a named recoverable report and avoid dashboard-only metrics.

3. **Expense breakdown service**
   - Inputs: date range, property, category.
   - Outputs: total expenses, count, category grouping, property grouping if needed.
   - Current schema fit: expenses table has `property_id`, `category`, `amount`, `expense_date`.

Do **not** include statements, owner reports, rent roll UI, dashboard cards, export/PDF, or chart components in Batch A.

### Batch B: Tenant/contract/property statements

Recover statement semantics after the financial totals are stable.

Candidate reports:

- Tenant statement by contract.
- Contract account movement statement.
- Property-scoped tenant/invoice/payment statement if needed.

Key design decisions:

- Define debit/credit/running-balance line rules in the current app, not by importing legacy helpers.
- Decide whether statements are invoice/payment ledgers only or whether they need accounting journal entries.
- Keep PDF/print out of this batch.

### Batch C: Owner reports

Recover after the owner relationship is modeled.

Candidate reports:

- Owner statement.
- Owner hub summary.
- Owner portal summary payload.

Blocking decision:

- Short-term owner reporting can group by `properties.owner_name`, but this is fragile.
- Preferred recovery should add/use a durable owner identity relationship, likely `people(type='owner')` plus property ownership linkage, before statement-level owner reporting.

### Batch D: Occupancy/unit/rent-roll reports

Candidate reports:

- Rent roll snapshot.
- Occupancy/unit status summary.
- Contract expiry summary.

Schema notes:

- Current units have `status`, `rent_amount`, and `property_id`.
- Current contracts have property/unit/tenant dates and rent amount.
- Legacy `unit_type` needs mapping or should be marked unavailable until current schema supports it.

### Batch E: Arrears/overdue reports

Candidate reports:

- Aged receivables by tenant/property/unit.
- Overdue invoices list with days overdue.
- Arrears summary that can power a future collection workflow.

Rules:

- Use due-date/as-of semantics, not issue-date period semantics.
- Keep WhatsApp and reminders out of the report engine. They can consume report rows later.

### Batch F: Dashboard metrics after report services stabilize

Recover dashboard-only metrics last among business-report batches.

Candidate metrics:

- Operational KPIs: property/unit/vacancy/occupancy/active tenants/active contracts.
- Financial KPIs: monthly revenue, monthly expenses, net monthly, outstanding/credit balances.
- Alerts: expiring contracts, overdue invoices, pending maintenance.
- Trends: six-month revenue/expense chart.

Reason dashboard is last:

- Legacy dashboard mixed financial, operational, navigation, alert, and chart responsibilities in one local-DB component.
- Rebuilding it early would risk duplicating business logic outside report services.
- Stable report services should feed dashboard widgets later.

### Batch G: Print/export/PDF after document system

Candidate artifacts:

- Trial balance PDF.
- Income statement PDF.
- Balance sheet PDF.
- Browser print/PDF for balance sheet/report snapshots.
- Chart-of-accounts CSV export.
- Future receipt/statement PDFs.

Arabic-safe print/PDF note:

- Arabic, RTL, currency formatting, pagination, and font embedding should be handled by a dedicated document/PDF system.
- PDF/print/export should not be embedded in core report services and should not be part of financial report foundation recovery.

## Explicit deferrals

The following are intentionally out of scope until their prerequisites exist:

- Dashboard rebuild and new report UI.
- Any PDF/print/export/document-template recovery.
- Owner portal/report sharing and auth-token flows.
- Accounting statements requiring accounts/journal entries.
- Balance reconciliation and rebuild-snapshot actions.
- WhatsApp reminders or communication workflows.
- Importing or adapting code from `legacy-src` directly.
- Reintroducing legacy `useApp`, `AppContext`, `dataService`, local DB, or `react-router-dom` patterns.

## Risks and notes

1. **Legacy report names do not always equal current report boundaries.** For example, “financial summary” mixed financial totals with contracts, occupancy, arrears, and pending invoices. Recover it as multiple services, not one monolith.
2. **Issue-date reports and due-date/as-of reports must stay separate.** Current invoice totals use issue dates; arrears and aging must use due dates and as-of dates.
3. **Owner reporting is schema-sensitive.** Current `owner_name` text can help discovery but should not be the long-term basis for owner statements.
4. **Accounting reports are not safely recoverable from current invoice/payment/expense tables alone.** Income statement, trial balance, balance sheet, account ledger, and reconciliation need explicit accounting schema and posting rules.
5. **Dashboard should be a consumer, not the source of truth.** Recover report services first; only then rebuild dashboard cards and charts from those services.
6. **Arabic-safe PDF is a separate product layer.** Report data services should return structured data; PDF/print should be addressed later with RTL-safe templates and rendering tests.

## Inspection commands used

- `find artifacts/rentrix/legacy-src -type f | rg -i "(report|analytics|dashboard|financial|accounting|statement|owner|tenant|collection|expense|revenue|occupancy|arrears)" | sort`
- `rg -n "report|reports|analytics|dashboard|statement|collection|arrears|revenue|expense|occupancy|owner|tenant" artifacts/rentrix/legacy-src`
- Targeted `nl -ba ... | sed -n ...` inspections of current report services, current financial page, current schema/domain types, legacy reports dashboard, legacy accounting services/UI, legacy dashboard, legacy arrears, owner hub, and owner portal files.
