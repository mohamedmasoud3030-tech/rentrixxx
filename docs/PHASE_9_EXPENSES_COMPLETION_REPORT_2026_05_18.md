# Phase 9 — Expenses / Operational Cost Tracking Completion Report

Date: 2026-05-18  
Phase: Phase 9 — Expenses / Operational Cost Tracking  
Scope: final Phase 9 summary covering PR 9.1 and PR 9.2.  
Mode: operational expenses visibility and filtering only; no accounting posting, no ledger entries, no invoice/payment/receipt creation, no maintenance auto-posting, no owner chargebacks, no Supabase schema changes, and no RLS changes.

## Executive summary

Phase 9 is complete after PR 9.2. The phase clarified and improved Expenses as an operational cost-tracking surface while preserving the accounting boundary.

The final state improves the Financials expense area by making existing expense rows easier to review and filter:

- Expense rows show readable property labels.
- Operators can filter expenses by property, category, and date range.
- Operational summary cards show visible expense count, visible amount, distinct property count, and distinct category count.
- Category values are centralized for the create form and UI filters.
- Maintenance request cost remains an operational estimate and is not automatically converted into an expense.

## PR 9.1 — Expenses audit and implementation plan

PR 9.1 added `docs/PHASE_9_EXPENSES_AUDIT_AND_PLAN_2026_05_18.md` as a docs-only audit.

It confirmed:

- Expense functionality currently lives under Financials rather than a standalone `features/expenses` area.
- Existing expenses are operational rows scoped to properties.
- Maintenance request cost is separate from real expense records.
- There is no automatic maintenance-to-expense flow.
- There is no automatic ledger, invoice, payment, receipt, owner chargeback, tenant billing, or vendor payment workflow attached to expenses.
- The safe Phase 9 implementation path is operational display/filtering only.

## PR 9.2 — Expenses operational UI improvements

PR 9.2 implemented the small operational UI improvements recommended by PR 9.1.

Delivered outcomes:

- Added `operational-expenses.ts` with helper logic for:
  - `OPERATIONAL_EXPENSE_CATEGORIES`
  - readable expense property labels
  - visible expense operational summaries
- Added `operational-expenses.test.ts` for focused helper coverage.
- Updated `expenses-section.tsx` to:
  - show Arabic operational copy clarifying the maintenance cost boundary
  - show operational summary cards
  - add property/category/date-range filters
  - show readable property labels on expense rows
- Updated `financials-page.tsx` to:
  - keep expense filter state interactive
  - pass filters into the existing expenses query
  - reuse centralized expense categories for validation and form options

## Final scope confirmation

Phase 9 did not implement or modify:

- ledger/accounting entries
- journal posting
- invoice creation
- payment creation
- receipt creation
- owner chargebacks
- tenant billing
- vendor payment workflows
- automatic maintenance-to-expense creation
- dashboard/reporting rewrites
- contract mutations
- Supabase schema migrations
- Supabase RLS policies
- legacy source imports
- `useApp`, `AppContext`, `dataService`, local DB, or `react-router-dom`

## Remaining deferred work

The following items remain intentionally deferred:

1. **Accounting and ledger integration**
   - Expense posting into ledger/journals.
   - Financial statement impact.
   - Immutable posted expense corrections.

2. **Maintenance-to-expense workflow**
   - Converting approved maintenance costs into expenses.
   - Approval rules.
   - Audit trail for conversion.

3. **Owner and tenant allocation**
   - Owner chargebacks.
   - Tenant billing.
   - Split allocation rules.
   - Owner statement integration.

4. **Vendor workflow**
   - Vendor records.
   - Vendor bills.
   - Vendor payments.
   - Payment status tracking.

5. **Expense lifecycle**
   - Archive/delete/restore workflow.
   - Approval workflow.
   - Attachment/receipt uploads.
   - Expense audit history.

## Recommended next phase

Start Phase 10 after this report is merged.

Recommended Phase 10 direction:

**Phase 10 — Reporting / Commercial Reports audit and safe plan**

The next safest step is to audit the current reporting surface before expanding financial reports. Phase 10 should start docs-first and answer:

- What reports already exist?
- Which reports are operational previews versus financial statements?
- Which reports depend on invoices, payments, receipts, expenses, maintenance, properties, units, owners, or contracts?
- Which report totals are derived from canonical services and which are local calculations?
- What report improvements are safe without changing accounting behavior?

Phase 10 should not create new accounting logic. It should first map existing reports, identify duplicated calculations, and define safe read-only improvements.

## Validation expected

Docs-only PR. Required hosted checks:

- GitHub CI should pass.
- Vercel should be ready.
- SonarCloud should report zero new issues.
- Codacy should report zero issues.
- Supabase should ignore the PR because no `supabase/` files are changed.
