# Phase 9 — Expenses / Operational Cost Tracking Audit and Implementation Plan

Date: 2026-05-18  
Active phase: Phase 9 — Expenses / Operational Cost Tracking  
PR: Phase 9 PR 9.1 — Expenses audit and implementation plan  
Mode: docs-first audit and safe implementation plan only. No runtime financial posting changes, no schema changes, no RLS changes, and no accounting/ledger wiring.

## Prerequisite confirmation

Phase 8 is complete on the current branch. The Phase 8 completion report exists at `docs/PHASE_8_MAINTENANCE_COMPLETION_REPORT_2026_05_18.md` and confirms that Maintenance remains an operational service-request workflow with no automatic expense creation, invoices, payments, receipts, owner chargebacks, tenant billing, vendor payment workflows, dashboard/reporting changes, Supabase migrations, RLS changes, or legacy-source imports.

This PR starts Phase 9 from that boundary. It does not change the runtime behavior of Maintenance, Expenses, Financials, Reports, Accounting, Owners, Contracts, Supabase schema, or RLS.

## Executive conclusion

The safest Phase 9 path is to keep Expenses operational until explicit accounting rules are designed and reviewed.

The current application already has a Supabase-backed `expenses` table, expense service/hook code, a Financials-page expense create form, and report calculations that include expense totals. However, the current expense model is narrow: it is property-linked only, has no unit, maintenance request, owner, contract, vendor, invoice, receipt, payment, or ledger foreign key, and does not include an expense lifecycle beyond active rows and `deleted_at` filtering.

For Phase 9 PR 9.2, the recommended implementation is a small operational UI improvement pass only:

- improve expense display, filtering, labels, and empty/error states around existing data;
- keep expenses as direct operational cost records tied to a property;
- clearly label Maintenance `cost` as an internal estimate/display value, not a posted expense;
- do not auto-create expenses from Maintenance;
- do not post ledger entries;
- do not create invoices, payments, receipts, owner chargebacks, tenant billing, or vendor payment workflows;
- do not change dashboard or broad financial reports in this phase.

## Required files and areas inspected

- `docs/PHASE_8_MAINTENANCE_COMPLETION_REPORT_2026_05_18.md`
- `docs/PHASE_8_MAINTENANCE_AUDIT_AND_PLAN_2026_05_18.md`
- `docs/RENTRIX_CODE_INVENTORY_AND_WIRING_AUDIT.md`
- `artifacts/rentrix/src/features/expenses` — directory does not currently exist.
- `artifacts/rentrix/src/features/financials`
- `artifacts/rentrix/src/features/maintenance`
- `artifacts/rentrix/src/features/properties/property-service.ts`
- `artifacts/rentrix/src/features/units/unit-service.ts`
- `artifacts/rentrix/src/types/domain.ts`
- `artifacts/rentrix/src/types/database.ts`
- `artifacts/rentrix/src/routes`
- `supabase/migrations`

## Current expenses model inventory

### Application feature location

There is no standalone `artifacts/rentrix/src/features/expenses` directory today. Expense code currently lives under Financials:

- `artifacts/rentrix/src/features/financials/expenses/expenseService.ts`
- `artifacts/rentrix/src/features/financials/expenses/useExpenses.ts`
- `artifacts/rentrix/src/features/financials/expenses/useExpenses.test.ts`
- `artifacts/rentrix/src/features/financials/components/expenses-section.tsx`
- `artifacts/rentrix/src/features/financials/financials-page.tsx`
- report readers in `artifacts/rentrix/src/features/financials/reports/financialReportsService.ts`

### Database table

The current `public.expenses` table is defined by `supabase/migrations/20260513120000_core_real_estate_schema.sql` with these columns:

| Column | Required | Observation |
| --- | --- | --- |
| `id` | yes | UUID primary key. |
| `property_id` | yes | References `public.properties(id)` with `on delete restrict`. This is the only business relationship currently modeled on an expense row. |
| `category` | yes | Free text in the database. The current Financials form constrains the UI to Arabic categories only. |
| `amount` | yes | Numeric amount with `amount > 0`. |
| `expense_date` | yes | Operational date used for sorting and report ranges. |
| `description` | no | Optional text description. |
| `created_at` | yes | Default UTC timestamp. |
| `updated_at` | yes | Default UTC timestamp and maintained by the `expenses_set_updated_at` trigger. |
| `deleted_at` | no | Soft-delete/archive field used by readers. |

Existing indexes include:

- `expenses_property_id_idx` on `property_id` where `deleted_at is null`.
- `expenses_expense_date_idx` on `expense_date` where `deleted_at is null`.
- a later hardening migration also adds `expenses_property_id_full_idx`.

Existing RLS:

- `public.expenses` has RLS enabled in the core schema migration.
- `public.expenses` is later forced under RLS by the hardening migration.
- Existing policies are broad authenticated-user management policies. PR 9.1 intentionally does not change RLS.

### TypeScript types

`artifacts/rentrix/src/types/domain.ts` aliases `Expense` to `Database['public']['Tables']['expenses']['Row']`.

`artifacts/rentrix/src/types/database.ts` models `expenses` as:

- `Row`: `id`, `property_id`, `category`, `amount`, `expense_date`, `description`, timestamps, and `deleted_at`.
- `Insert`: requires `property_id`, `category`, `amount`, and `expense_date`.
- `Update`: partial row update.
- `Relationships`: empty in the handwritten type file even though the migration has a database-level foreign key to `properties`.

## Current UI/service usage

### Expense service

`expenseService.ts` exposes:

- `listExpenses(filters)`
  - reads from `expenses`;
  - filters active rows with `deleted_at is null`;
  - orders by `expense_date` descending;
  - optional filters: `propertyId`, `category`, `from`, `to`.
- `createExpense(payload)`
  - inserts directly into `expenses`;
  - returns the inserted expense.
- `updateExpense(id, payload)`
  - updates an active expense row by `id`;
  - requires the same payload shape as create.

There is no current `deleteExpense`, `archiveExpense`, `restoreExpense`, status transition, approval workflow, vendor workflow, or payment workflow in this service.

### Expense hook

`useExpenses.ts` exposes:

- `expenseKeys` for React Query caching.
- `useExpenses(filters)` for list reads.
- `useCreateExpense()` for creates.
- `useUpdateExpense(id)` for updates.

Create/update success handlers invalidate both expense queries and financial report queries. This is report-cache coupling, not ledger posting.

### Financials page usage

`financials-page.tsx` currently owns the expense form state and calls `useCreateExpense()`. It passes expense rows and property rows to `ExpensesSection`.

Current form fields:

- `property_id`
- `category`
- `amount`
- `expense_date`
- `description`

Current UI category options:

- `صيانة`
- `مرافق`
- `إدارية`
- `تأمين`
- `أخرى`

Current Financials-page expense filters are initialized to empty values and not exposed as a full filter UI in `ExpensesSection`.

### Reports usage

Financial report services read `expenses` for:

- collection summary `expensesTotal`;
- financial period summary `expenses` and `netCash = paid - expenses`;
- financial cashflow rows;
- expense totals;
- expense breakdown by category and property.

This is analytical/reporting coupling. It is not accounting posting because expense creation does not create journal entries, invoices, payments, receipts, owner balances, or tenant balances.

### Routes

There is no dedicated Expenses route today. The current route wiring exposes:

- `/financials` via `artifacts/rentrix/src/routes/_protected.financials.tsx`, which renders `FinancialsPage` and includes the current Expenses section.
- `/reports` via `artifacts/rentrix/src/routes/_protected.reports.tsx`, where existing financial summary report UI displays expense totals.
- `/accounting` via `artifacts/rentrix/src/routes/_protected.accounting.tsx`, but current Phase 9 PR 9.1 does not inspect or modify accounting UI behavior beyond confirming no expense posting should be introduced.

## Current schema/type observations

1. `expenses.property_id` is the only modeled relationship.
2. There is no `unit_id` on expenses.
3. There is no `maintenance_request_id` on expenses.
4. There is no `owner_id` or owner-allocation model on expenses.
5. There is no `contract_id` on expenses.
6. There is no `tenant_id` on expenses.
7. There is no `vendor_id` or vendor table relationship on expenses.
8. There is no `invoice_id`, `payment_id`, `receipt_id`, `ledger_batch_id`, `journal_entry_id`, or accounting posting reference on expenses.
9. `category` is database free text while current UI restricts users to a small Arabic list.
10. `deleted_at` exists, but the current expense service does not expose archive/delete/restore behavior.
11. The handwritten database type file has `Relationships: []` for expenses, so current TypeScript code should not assume typed relational expense selects are available.
12. The current report layer uses date/property/category filtering over direct expense rows; it does not join expenses to Maintenance, Owners, Contracts, Vendors, Invoices, Receipts, Payments, or Ledger.

## Data relationship map

### Current confirmed relationships

```text
properties
  └── expenses.property_id
```

```text
properties
  ├── units.property_id
  ├── contracts.property_id
  ├── maintenance_requests.property_id
  └── expenses.property_id
```

```text
units
  └── maintenance_requests.unit_id (optional)
```

```text
contracts
  └── invoices.contract_id
      └── payments.invoice_id
```

### Relationships that do not currently exist on expenses

```text
expenses ─x units
expenses ─x maintenance_requests
expenses ─x owners
expenses ─x property_owners
expenses ─x contracts
expenses ─x tenants / people
expenses ─x vendors
expenses ─x invoices
expenses ─x payments
expenses ─x receipts
expenses ─x journal_entries / ledger
expenses ─x dashboard posting records
```

## Financial coupling assessment

### Are expenses operational-only or accounting-posted?

Expenses are currently best treated as operational cost records with financial-report visibility.

They are not fully accounting-posted because current create/update code writes only to `public.expenses`. It does not create a ledger batch, journal entries, invoice rows, payment rows, receipt rows, owner chargebacks, tenant billings, or vendor payables.

### Existing coupling that does exist

There is current coupling to Financials and Reports in these limited ways:

1. The Financials page contains the expense list/create UI.
2. Expense create/update invalidates financial report query keys so report totals refresh.
3. Financial report services include expense amounts in summaries, cashflow, totals, and breakdowns.
4. The older `rpt_financial_summary(month, year)` RPC also reads `expenses` to calculate total expenses and net revenue.

This means expenses already affect displayed financial summaries. However, that display is not a substitute for accounting rules, ledger entries, payable workflows, owner statements, or tenant billing.

### Coupling that does not exist and must not be introduced in PR 9.1/9.2

- No expense-to-ledger posting.
- No expense-to-invoice creation.
- No expense-to-payment creation.
- No expense-to-receipt creation.
- No expense-to-owner chargeback.
- No expense-to-tenant billing.
- No vendor payable/payment workflow.
- No maintenance-cost-to-expense automation.
- No dashboard or broad financial report behavior changes.

## Maintenance cost boundary

Phase 8 confirmed that Maintenance is an operational workflow and that `maintenance_requests.cost` is not a posted expense.

The current Maintenance form creates requests with `cost: 0`. The Maintenance page shows operational status, priority, property/unit location labels, filters, summary cards, and status-transition actions. It does not expose an expense posting action, and `updateMaintenanceStatus` only changes `status` plus `resolved_at`.

For Phase 9:

- Maintenance `cost` should remain an estimate/display field unless and until a later accounting design explicitly defines conversion rules.
- A resolved or closed Maintenance request must not automatically create an Expense.
- A Maintenance request must not automatically create an owner chargeback, tenant invoice, vendor payable, payment, receipt, or ledger entry.
- If a user manually creates a real Expense with category `صيانة`, it should be treated as an independent operational expense record, not as proof that the Maintenance request is financially posted.
- Any future linking between Maintenance and Expenses should be a separate schema/design PR because the current `expenses` table lacks `maintenance_request_id`, `unit_id`, vendor, owner, and posting metadata.

## Create/update/delete/archive behavior today

| Behavior | Exists today? | Notes |
| --- | --- | --- |
| List expenses | Yes | `listExpenses` filters active rows and supports property/category/date filters. |
| Create expense | Yes | `createExpense` inserts direct operational expense rows. |
| Update expense | Service/hook yes; UI usage limited | `updateExpense` exists, and `useUpdateExpense` exists. The current `ExpensesSection` only renders create UI; no edit UI is visible there. |
| Delete expense | No service found | No `deleteExpense` function was found in the current expense service. |
| Archive/soft-delete expense | Schema supports `deleted_at`; no service/UI found | Existing list/update queries respect `deleted_at is null`, but no explicit archive action exists. |
| Restore expense | No | Not currently modeled in service/UI. |
| Approval/status workflow | No | No status column on expenses. |
| Vendor payment workflow | No | No vendor relation or payable lifecycle on expenses. |
| Accounting post/void workflow | No | No expense posting RPC or ledger linkage found in current expense service. |

## Risks

1. **Report-vs-ledger ambiguity**  
   Because expense totals appear in financial reports, users may assume they are accounting-posted. The UI should avoid implying ledger/accounting finality.

2. **Maintenance cost confusion**  
   The `maintenance_requests.cost` field can be mistaken for a real expense. Labels should keep it separate as an estimate/display value.

3. **Weak relationship model**  
   Expenses are property-only. Adding unit, maintenance, owner, contract, vendor, invoice, receipt, payment, or ledger behavior without schema design would create brittle implicit rules.

4. **Free-text categories**  
   The database accepts any `category`, while the UI currently offers a fixed Arabic list. Filtering/reporting may see legacy or manually inserted categories outside the UI list.

5. **No delete/archive UI**  
   `deleted_at` exists, but there is no visible archive action. Adding archive later is safer than hard delete, but should be done intentionally with tests.

6. **Broad financial dependencies**  
   Expense mutation invalidates financial reports, and reports calculate net cash from expenses. PRs must avoid accidental calculation changes while improving UI.

7. **Handwritten relationship types**  
   `Relationships: []` in `database.ts` means typed nested selects for expenses should not be assumed until the type model is updated intentionally.

8. **Accounting tables/RPCs exist elsewhere**  
   The repository has ledger/accounting concepts in migrations and receipt posting RPCs. That makes accidental scope creep easy. Expense posting must remain deferred.

## Recommended Phase 9 implementation path

### Phase 9 PR 9.1 — current PR

Docs-only audit and plan.

Allowed:

- inspect existing implementation;
- document model, service, schema, UI, relationships, risks, non-goals, and next scope.

Not allowed:

- runtime code changes;
- schema changes;
- RLS changes;
- ledger/accounting changes;
- dashboard/report changes;
- Maintenance/Expense automation.

### Phase 9 PR 9.2 — recommended next PR

Small operational UI improvements around the existing expense model only.

Recommended scope:

1. Keep the existing `expenses` table and service shape.
2. Add/clean up an operational Expenses section inside the existing Financials page or, if routing conventions support it safely, a small route-level wrapper that still uses the same service/hook. Do not introduce a broad new domain architecture in one PR.
3. Add visible filters for existing supported filters:
   - property;
   - category;
   - date from;
   - date to.
4. Improve displayed rows with:
   - property name lookup from existing property service/hook data;
   - date;
   - category;
   - amount;
   - description fallback;
   - clear Arabic labels.
5. Add explicit copy that expenses are operational cost records and not accounting-posted ledger entries.
6. Add a clear Maintenance boundary label if maintenance cost appears near expense copy:
   - Maintenance cost estimate/display is separate from real expense records.
7. Improve empty/loading/error states if missing.
8. Add tests for filtering/display helpers or component behavior where practical.
9. Keep create behavior operational and unchanged except for UI polish/validation copy.
10. Defer update/archive UI unless it can be implemented narrowly and safely without schema changes or accounting semantics. If added, use soft-delete via `deleted_at`, not hard delete.

### Later Phase 9 PRs, only after PR 9.2 is stable

Potential later operational-only work, subject to separate review:

- Add a dedicated Expenses route if product navigation requires it.
- Add an edit modal for existing expense rows.
- Add archive/restore behavior using `deleted_at` with clear UX labels.
- Add category normalization only after preserving free-text legacy/display compatibility.
- Propose schema additions for `unit_id`, `maintenance_request_id`, vendor metadata, or attachments only after a separate design PR.

## Explicit non-goals

The following are strict non-goals for Phase 9 PR 9.1 and should remain out of PR 9.2 unless explicitly re-scoped in a later accounting/ledger phase:

- Do not add ledger/accounting entries.
- Do not create invoices.
- Do not create payments.
- Do not create receipts.
- Do not create owner chargebacks.
- Do not create tenant billing.
- Do not create vendor payment workflows.
- Do not auto-create expenses from Maintenance.
- Do not change dashboard behavior.
- Do not change broad financial report calculations.
- Do not add broad Supabase migrations.
- Do not change RLS.
- Do not change contracts.
- Do not import from `legacy-src`.
- Do not use `useApp`, `AppContext`, `dataService`, local DB patterns, or `react-router-dom`.
- Do not touch unrelated files.

## What must remain deferred to a later accounting/ledger phase

1. Expense posting rules.
2. Chart-of-accounts mapping for expense categories.
3. Debit/credit journal entry generation for expenses.
4. Ledger batch creation, sealing, voiding, and audit trails for expenses.
5. Owner allocation rules for shared property expenses.
6. Owner statement integration.
7. Tenant billback/chargeback rules.
8. Vendor payable and vendor payment lifecycle.
9. Maintenance-to-expense conversion rules.
10. Unit-level expense allocation rules.
11. Tax/VAT handling.
12. Approval workflow and role-based posting permissions.
13. Reconciliation between operational expense records and accounting ledger entries.

## Proposed PR 9.2 scope

Title suggestion: **Phase 9 PR 9.2 — Expenses operational UI improvements**

Recommended changed areas:

- `artifacts/rentrix/src/features/financials/components/expenses-section.tsx`
- `artifacts/rentrix/src/features/financials/financials-page.tsx`
- optional small helper/test files under `artifacts/rentrix/src/features/financials/expenses/` or `artifacts/rentrix/src/features/financials/components/`

Recommended PR 9.2 acceptance criteria:

- Expenses remain property-linked operational records.
- Existing create behavior still writes only to `public.expenses`.
- No Maintenance request creates or updates an Expense.
- No Expense create/update creates or updates invoices, payments, receipts, owner chargebacks, tenant billing, vendor payments, or ledger entries.
- Existing financial report query invalidation remains intentional but no broad report calculations change.
- Users can filter or clearly understand visible expenses by existing supported fields.
- UI copy separates operational expenses from posted accounting.
- Tests cover new helper logic and/or visible behavior.

## Validation checklist

Use this checklist before merging PR 9.1:

- [x] Phase 8 completion report exists on the current branch.
- [x] Current expense schema reviewed.
- [x] Current expense TypeScript model reviewed.
- [x] Current expense service/hook usage reviewed.
- [x] Current Financials page expense UI reviewed.
- [x] Current Maintenance cost behavior reviewed.
- [x] Current property/unit service relationships reviewed.
- [x] Current routes reviewed for expense exposure.
- [x] Current migrations reviewed for expense/report/accounting coupling.
- [x] No runtime code changed.
- [x] No Supabase migration added.
- [x] No RLS policy changed.
- [x] No dashboard/report calculation changed.
- [x] No Maintenance automation added.
- [x] No ledger/accounting posting added.
- [x] No legacy-source imports added.

Recommended checks for this docs-only PR:

- `git diff --check`
- `rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true`
- `pnpm --filter ./artifacts/rentrix run typecheck`
- `pnpm --filter ./artifacts/rentrix run build`
- `pnpm --filter ./artifacts/rentrix run lint`

Repository custom checks, if available, should also be reported:

- `npm --prefix artifacts/rentrix run typecheck`
- `npm --prefix artifacts/rentrix run build`
- `npm --prefix artifacts/rentrix run lint`
- `npm --prefix artifacts/rentrix test`
- `npm --prefix artifacts/rentrix run test:financials`

