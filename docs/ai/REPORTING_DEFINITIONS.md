# Rentrix Reporting Definitions

This file records current repository evidence for reporting and balance metrics. It is not a live-data certification. Verify live Supabase schema, RLS, RPC behavior, and authenticated browser output before using these definitions for a production-ready claim.

## Current Sources

- Primary service: `rentrix-app/src/features/financials/reports/financialReportsService.ts`.
- Reports page composition and CSV export: `rentrix-app/src/features/reports/reports-page.tsx`.
- Dashboard projection: `rentrix-app/src/app/dashboardSnapshot.ts`.
- Receipt projection: `rentrix-app/src/features/financials/receipts/receiptService.ts`.
- Financial math helpers: `rentrix-app/src/features/financials/financialMath.ts`.

## Shared Rules

- Soft-deleted rows are excluded when the source table exposes `deleted_at`.
- Financial period filters use inclusive string date comparisons against `YYYY-MM-DD` date fields.
- Property, tenant, and contract filters are applied through invoice -> contract context for invoice and payment reports.
- Receipts are currently read-only projections of posted `payments` rows in the browser UI.
- Internal `receipts` and `receipt_allocations` remain part of the database posting/reversal chain, but they are not the current browser receipt-detail identifier.
- The active TypeScript `Invoice` type does not include `tax_amount`. Local migrations still reference `tax_amount` through `to_jsonb(i)->>'tax_amount'` or older SQL. Treat tax-inclusive invoice totals as a schema/RPC verification item before relying on taxes in reporting.

## Metric Definitions

| Metric | Source tables / RPC / views | Formula | Date field | Included statuses | Excluded statuses / rows | Payment, receipt, or allocation basis | Known limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Outstanding balance | `invoices` via `loadInvoices` | Sum `max(amount - paid_amount, 0)` for matching invoices with positive remaining balance | `issue_date` for period report filters | All invoice statuses unless a report status filter is supplied | `deleted_at is not null`; rows outside date/property/tenant/contract filters | Invoice `paid_amount`; not receipt allocations | Does not include `tax_amount` in TypeScript report totals; live RPCs may compute invoice due with tax through JSON access. Requires canonical balance-model approval. |
| Arrears total overdue | `invoices` via `loadArrearsInvoices` | Sum `max(amount - paid_amount, 0)` where `due_date <= asOf` | `due_date` compared to `asOf`; no period date range | `issued`, `partial`, `overdue` | `paid`, `cancelled`, deleted rows, zero/negative remaining, future due dates | Invoice balance | Uses invoice status and due date only; no live validation yet that all payment/void flows keep `paid_amount` and status synchronized. |
| Aged receivables | `invoices`, hydrated `contracts`, `people`, `properties`, `units` | Bucket each receivable invoice remaining amount into current, 1-30, 31-60, 61-90, or 90+ days | `due_date` vs `asOf` | `issued`, `partial`, `overdue` | Deleted rows, zero/negative remaining, non-receivable statuses | Invoice balance | Buckets are grouped by contract context; product owner approval still needed for exact aging labels and current/not-overdue handling. |
| Collected amount | `payments`, hydrated `invoices` and `contracts` | Sum `payments.amount` for matching rows | `payment_date` | All posted payment rows represented in `payments` | `deleted_at is not null`; rows outside date/property/tenant/contract filters | Payments; browser receipts are payment-backed projections | Does not read `receipts` or `receipt_allocations`; assumes posted payments are immutable and void/reversal handling is reflected in payment visibility or compensating rows. |
| Daily collection | `payments` | Group payment amount and count by `payment_date`, split by `payment_method` | `payment_date` | All matching payment rows | Deleted rows and rows outside filters | Payments | Method keys are limited to current payment enum values: cash, bank transfer, card, check, other. |
| Expenses | `expenses` | Sum `expenses.amount`, optionally grouped by category and property | `expense_date` | All matching expense rows | `deleted_at is not null`; rows outside date/property/category filters | Expenses | Property breakdown is hidden when a specific property filter is supplied. No owner-settlement allocation is included. |
| Net amount / net cash | `payments` and `expenses` | `sum(payments.amount) - sum(expenses.amount)` | `payment_date` and `expense_date` in the same filter range | Matching payments and expenses | Deleted rows and rows outside filters | Payments minus expenses | Operational cash metric only; not an accounting-grade P&L and not a ledger-derived net income metric. |
| Invoice status summary | `invoices` | Count or filter invoices by `status`; totals use `amount`, `paid_amount`, and remaining amount | `issue_date` in period reports; `due_date` for arrears | All invoice statuses in period reports unless filtered; receivable statuses for arrears | Deleted rows | Invoice fields | Requires live E2E verification that payment posting and reversal update invoice status consistently. |
| Owner balances | Owners feature plus property/owner context; no approved reporting formula found in active financial report service | Not currently canonical in `financialReportsService.ts` | Not defined | Not defined | Not defined | Not defined | Advanced owner settlements are deferred. Do not infer owner payable/receivable balances from current reports without a reviewed product decision and schema/RPC design. |
| Receipts count | `payments` in collection summary | Count matching payment rows | `payment_date` | Matching posted payment rows | Deleted rows and rows outside filters | Payments as receipt projections | Name is intentionally user-facing; current source is `payments`, not internal `receipts`. |

## Balance Source of Truth

The current repository source of truth for operational outstanding balance is invoice-derived:

```text
outstanding = max(invoices.amount - invoices.paid_amount, 0)
```

This is the formula used by current TypeScript report helpers. Do not introduce manual balance editing, standalone payment adjustments, or ledger-derived balance screens during stabilization. A later reviewed change may move this calculation behind a Supabase view/RPC, but it must preserve the domain invariant that outstanding balance is derived through one canonical path.

## Tax Amount Status

Current evidence is mixed:

- Active TypeScript `Invoice` report rows select and summarize `amount` and `paid_amount`; they do not select `tax_amount`.
- The generated frontend database type search used for this review did not show `tax_amount` in `rentrix-app/src/types/database.ts`.
- Local migrations still reference `tax_amount` in older receipt posting and report SQL.
- The latest `record_invoice_payment_atomic` migration uses `to_jsonb(i)->>'tax_amount'`, which is tolerant when the column is absent from the row JSON.

Current action: flag this as a schema/reporting ambiguity. Do not add UI tax metrics until the live schema and canonical invoice total model are verified.

## Required Live Checks

- Confirm the live `invoices` shape and whether `tax_amount` exists on the intended project.
- Confirm the live `payments`, internal `receipts`, and `receipt_allocations` behavior for normal payment, duplicate idempotent request, and void/reversal flows.
- Confirm `financial_operation_idempotency` grants, RLS, policy behavior, and duplicate index cleanup on the intended project.
- Run authenticated browser QA through invoice -> payment -> receipt -> invoice status -> reports refresh.
- Approve report/KPI definitions with product stakeholders before final constrained-beta release.
