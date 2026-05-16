# Accounting Verification and Financial Integrity Audit — 2026-05-16

Repository: `mohamedmasoud3030-tech/rentrixxx`  
Base branch: `main`  
Audit branch: `accounting-financial-integrity-audit`  
Scope: documentation-first audit of current frontend/services and reference database types/migrations. No runtime code changes were made.

## 1. Executive summary

The current Rentrix financial layer is usable for the recovered operating workflow, but it is **not yet production-grade accounting**.

Safe today:

- Invoice workspace and reports use a consistent outstanding calculation pattern based on `amount - paid_amount`, clamped through `getSafeRemainingAmount`.
- Quick Payment validates amount/date and prevents posting more than the currently loaded remaining invoice amount.
- Receipts are derived from posted payment rows by the current receipt service; receipt print links and receipt detail resolve from the same payment-backed receipt source.
- `/reports` correctly keeps Owner Statement, Tenant Statement, Trial Balance, Income Statement, and Balance Sheet deferred instead of fabricating accounting balances.
- `/accounting` is explicitly a placeholder and does not claim a real ledger engine exists.

Not safe today:

- There is no verified canonical ledger/journal service used across the app.
- `post_receipt_atomic` is still called directly from the frontend as a Supabase RPC and remains the highest-risk financial write path pending backend/RPC/authorization review.
- The dashboard financial card still uses `rpt_financial_summary`, while the reports workspace uses current frontend report services; these may be valid for different scopes, but they are not yet proven as one canonical financial truth path.
- Owner and tenant statements are not safe to enable until statement authorization and ledger/service semantics are verified.
- Trial balance, income statement, and balance sheet must remain deferred until chart-of-accounts and journal-entry integrity are audited.

Overall rating: **operational finance is recovered for testing; accounting is deferred and must not be described as production-grade yet.**

## 2. Current financial truth map

| Area | Current source/path | Calculation used | Status |
|---|---|---|---|
| Invoice list/detail | `invoices` + `payments` via `invoiceService.ts` | `amount`, `paid_amount`, and `getSafeRemainingAmount(amount, paid_amount)` | Safe for UI display if database values are correct |
| Quick Payment | `InvoiceWorkspaceSection` -> `usePostPayment` -> `postReceiptAtomic` RPC | Client validates `currentAmount <= currentRemaining` before RPC call | Safe UX guard; backend authorization/immutability still needs verification |
| Receipts | `receiptService.ts` loads `payments`, then hydrates invoice/contract/unit/property/tenant context | Receipt identity is payment id; receipt number is `REC-${paymentId.slice(0, 8)}` | Safe as payment-backed receipt view; not a separate receipt ledger |
| Arrears | `financialReportsService.ts` | receivable invoice statuses + `getSafeRemainingAmount` + due/as-of dates | Safe for current receivables reporting |
| Reports hub | `/reports` using financial report hooks/services | current frontend report services; unsupported accounting reports deferred | Safe as report orchestration, not accounting engine |
| Dashboard financial summary | `dashboardService.ts` -> `rpt_financial_summary` RPC | RPC-defined totals | Needs consistency review vs frontend reports |
| Accounting page | `accounting-page.tsx` | no engine; empty state only | Safe placeholder |
| Journal entries | Referenced only indirectly by DB/RPC history, not surfaced as a verified current service | no current canonical frontend path | Deferred |

## 3. Inspected files/services

| File/area | Role | Finding |
|---|---|---|
| `features/financials/financialMath.ts` | Numeric helpers | Defines `toFinancialNumber`, `getSafeRemainingAmount`, and `sumFinancialValues`; this is the strongest current candidate for shared amount math. |
| `features/financials/invoices/invoiceService.ts` | Invoice listing/detail | Uses `getSafeRemainingAmount` for invoice summaries and loads payment rows for invoice detail. |
| `features/financials/components/invoice-workspace-section.tsx` | Invoice UI + quick payment | Validates selected invoice, numeric amount, remaining amount, and payment date before posting. |
| `features/financials/components/invoice-detail-section.tsx` | Invoice detail/payment history | Displays invoice amount, paid amount, remaining amount, and payment rows. |
| `features/financials/payments/paymentService.ts` | Payment write service | Calls `post_receipt_atomic` directly from frontend. This is the main write-risk area. |
| `features/financials/payments/usePayments.ts` | Payment mutation hook | Invalidates invoice, receipt, and report queries after successful post. |
| `features/financials/receipts/receiptService.ts` | Receipt read service | Builds receipts from payment rows and safely hydrates context. |
| `features/financials/reports/financialReportsService.ts` | Report calculations | Uses `getSafeRemainingAmount`, status filters, and date filters for operational reports. |
| `features/reports/reports-page.tsx` | Consolidated reports hub | Implements safe supported reports and keeps unsafe accounting/statement reports deferred. |
| `app/dashboardService.ts` | Dashboard KPIs | Uses `rpt_financial_summary` RPC for financial summary plus direct counts for operational KPIs. |
| `features/accounting/accounting-page.tsx` | Accounting route | Explicit placeholder; no production accounting features are exposed. |
| `types/database.ts`, `types/domain.ts`, `supabase/migrations/*` | Reference | Used as references for table/RPC relationships; no DB changes made in this audit. |

## 4. Answers to required audit questions

### 4.1 What is the current canonical path for outstanding balance?

The current app-level canonical helper is:

```ts
getSafeRemainingAmount(amount, paidAmount) = Math.max(0, toFinancialNumber(amount) - toFinancialNumber(paidAmount))
```

It is used in invoice summaries, invoice workspace remaining values, and financial reports. However, this is a **frontend/application helper**, not a database-level canonical balance service. A true canonical path should eventually be a single service/query used by invoices, arrears, reports, dashboard, and statements.

### 4.2 Are invoice paid/remaining amounts derived consistently everywhere?

Mostly yes for the recovered frontend paths. Invoice list/detail, invoice workspace, arrears, and reports use `amount`, `paid_amount`, and/or `getSafeRemainingAmount`. The dashboard may differ because it uses the `rpt_financial_summary` RPC instead of the frontend report service.

### 4.3 Are posted payments immutable in the frontend flows?

The current frontend flow only exposes posting payments through Quick Payment. It does not expose editing posted payment amount/date/contract linkage in the reviewed UI. However, immutability must be verified at DB/RPC/RLS level before calling it production-grade.

### 4.4 Are receipts generated only from payment/posted-payment data?

Yes in the current frontend read model. `receiptService.ts` loads rows from `payments` and maps each payment to a `ReceiptRecord`. Receipt ids and payment ids are the same current identifier. This is safe for display/print as long as the payment row is the source of truth.

### 4.5 Are receipt links and receipt details reading the same receipt source?

Yes after the receipt print recovery and reports consolidation. Receipt links use `/receipts?receiptId=<id>` and receipt detail reads the receipt id query value, then calls the current `useReceipt`/receipt service path.

### 4.6 Are arrears, reports, invoices, dashboard, and financials using consistent due/paid/remaining definitions?

Invoices, arrears, financials, and reports are mostly consistent around `amount - paid_amount`. The dashboard financial values are the exception because they are supplied by `rpt_financial_summary`. The RPC may be correct, but it needs explicit reconciliation against the current report service.

### 4.7 Are journal entries being created, read, or displayed anywhere?

No verified current frontend accounting page reads or displays journal entries. The accounting route is a placeholder. Historical notes indicate the atomic receipt RPC may create journal entries, but this was not verified as a safe current ledger path by this audit.

### 4.8 Are trial balance, income statement, and balance sheet safe to enable now?

No. They should remain deferred. There is no audited current chart-of-accounts/journal-entry service proving complete, balanced, tenant-safe ledger data.

### 4.9 Is any page computing financial totals with a separate formula that conflicts with reports/services?

The main potential conflict is the dashboard financial section using `rpt_financial_summary` while `/reports` uses current frontend report services. This is not necessarily wrong, but it is not yet proven to be the same financial truth path.

### 4.10 Is there any fake, placeholder, hard-coded, or optimistic monetary value shown as real money?

No fake balances were intentionally identified in the recovered report hub. Unsupported statements/accounting reports are deferred. The receipt number format `REC-${paymentId.slice(0, 8)}` is derived and should be labelled as display/reference-style receipt number unless a real receipt sequence is introduced later.

### 4.11 Are owner statements and tenant statements currently safe to enable?

No. They should remain deferred until authorization and statement semantics are verified. Owner statement in particular requires ownership scope, settlement model, and accounting basis. Tenant statement requires a canonical ledger/contract statement service.

### 4.12 What must be fixed before calling accounting production-grade?

At minimum:

1. Verify/secure `post_receipt_atomic` and related write RPC authorization.
2. Establish one canonical balance service/query used by invoice UI, arrears, dashboard, reports, and statements.
3. Audit DB constraints and RLS around payments, invoices, receipt allocations, and journal entries.
4. Verify payment immutability and correction-by-reversal at DB level.
5. Build an audited journal-entry read model before enabling trial balance/income statement/balance sheet.
6. Add reconciliation tests comparing invoices, payments, receipts, arrears, and dashboard/report totals.

## 5. Findings by severity

### Critical

| ID | Finding | Risk | Recommendation |
|---|---|---|---|
| C-1 | Financial write path calls `post_receipt_atomic` directly from frontend. | If RPC authorization/immutability is incomplete, authenticated users may be able to perform unauthorized financial writes. | Next PR should audit and harden write RPC authorization or move financial writes behind Edge Functions/service role with explicit authorization. |
| C-2 | No audited canonical ledger/journal service is available. | Accounting reports could be misleading if enabled from incomplete journal data. | Keep Trial Balance, Income Statement, and Balance Sheet deferred until ledger integrity is verified. |

### High

| ID | Finding | Risk | Recommendation |
|---|---|---|---|
| H-1 | Dashboard uses `rpt_financial_summary` while `/reports` uses frontend report services. | Dashboard and Reports may show different financial totals for similar periods. | Create a reconciliation PR comparing dashboard RPC totals against report-service totals and standardize one canonical path. |
| H-2 | Owner/Tenant statements are deferred because authorization and statement semantics are not verified. | Enabling them too early could leak data or show incorrect balances. | Build statement services only after ownership/tenant scope and ledger basis are defined and tested. |
| H-3 | Receipt model is payment-backed, not an audited separate receipt ledger. | This is fine for print view, but not enough for legal/accounting receipt sequencing if strict receipt numbering is required. | Define whether receipts need separate immutable sequence/table or if payment-backed receipts are acceptable for MVP. |

### Medium

| ID | Finding | Risk | Recommendation |
|---|---|---|---|
| M-1 | Remaining balance is consistently calculated in frontend helpers but not yet centralized at DB/service level. | Future pages may introduce divergent formulas. | Promote `getSafeRemainingAmount` semantics into a named canonical service/query and test all consumers. |
| M-2 | Payment posting validates amount/date in UI, but final authority must be backend. | Race conditions or direct API calls could bypass frontend checks. | Enforce amount <= remaining and posted-payment immutability in DB/RPC/Edge layer. |
| M-3 | Arrears reports rely on invoice statuses plus remaining amount. | If statuses drift from `paid_amount`, arrears may be inconsistent. | Add reconciliation tests for invoice status vs amount/paid_amount/remaining. |

### Low

| ID | Finding | Risk | Recommendation |
|---|---|---|---|
| L-1 | Receipt number is derived from payment id. | Could be confused with legal sequential receipt number. | Label clearly as display receipt reference or introduce real sequence later. |
| L-2 | CSV exports are frontend-generated. | Export labels/field ordering may drift from reporting requirements. | Add report export tests if CSV becomes contractual/customer-facing. |

### Deferred / not implemented

| Area | Status |
|---|---|
| Trial Balance | Deferred until chart-of-accounts/journal data is verified. |
| Income Statement | Deferred until ledger/accounting basis is verified. |
| Balance Sheet | Deferred until ledger/accounting basis is verified. |
| Owner Statement | Deferred until owner scope/settlement rules and authorization are verified. |
| Tenant Statement | Deferred until canonical tenant ledger/contract statement service exists. |
| Journal entry UI | Not currently exposed. |

## 6. What is safe today

- Internal testing of property/unit/contract/invoice/payment/receipt/arrears/report flows.
- Operational reporting based on invoices, payments, expenses, contracts, and arrears services.
- Printing a payment-backed receipt via `/receipts?receiptId=<id>`.
- Keeping unsupported accounting and statements visibly deferred.

## 7. What is explicitly not safe today

- Advertising the accounting module as production-grade double-entry accounting.
- Enabling Trial Balance, Income Statement, or Balance Sheet as real accounting outputs.
- Enabling Owner Statement or Tenant Statement as authoritative balances.
- Treating dashboard financial RPC totals as proven identical to the `/reports` financial summary without reconciliation.
- Relying only on frontend guards for payment/receipt authorization and immutability.

## 8. Recommended next PRs

1. **PR-A: Harden payment/receipt write authorization**
   - Audit `post_receipt_atomic` and any related RPCs.
   - Add/verify `auth.uid()` guards and ownership/manager scope.
   - Confirm DB-level immutability or reversal-only correction model.

2. **PR-B: Financial truth reconciliation tests**
   - Compare invoice summary, arrears, report summary, and dashboard financial totals on controlled fixtures/helpers.
   - Add tests proving all frontend paths use the same remaining-balance formula.

3. **PR-C: Dashboard financial source alignment**
   - Either move dashboard financial totals to the same report service or prove/rename the RPC output scope clearly.

4. **PR-D: Receipt numbering decision**
   - Decide whether payment-backed `REC-<payment-prefix>` is sufficient for MVP or implement a real immutable receipt sequence later.

5. **PR-E: Statement service design**
   - Design Owner Statement and Tenant Statement services with authorization, scope, and ledger basis before enabling UI.

6. **PR-F: Accounting ledger audit**
   - Inspect `journal_entries`, `accounts`, and any journal creation paths before enabling accounting reports.

## 9. Test gaps

- No end-to-end reconciliation fixture covering invoice -> payment -> receipt -> arrears -> reports -> dashboard.
- No DB-level immutability test for posted payments.
- No authorization test for `post_receipt_atomic` with unauthorized contract/invoice ids.
- No test proving dashboard `rpt_financial_summary` matches `/reports` financial summary for the same scope.
- No test proving invoice status transitions always match `paid_amount` and remaining amount.
- No ledger balance test because ledger UI/service is not yet implemented.

## 10. Release-readiness checklist

Before production finance/accounting release:

- [ ] `post_receipt_atomic` authorization verified and tested.
- [ ] Posted payment immutability enforced outside frontend.
- [ ] Payment corrections use reversal/replacement path only.
- [ ] One canonical balance source is documented and used by all UI/report paths.
- [ ] Dashboard and Reports financial totals reconciled.
- [ ] Receipt numbering policy finalized.
- [ ] Owner/Tenant statements remain disabled until secure statement services exist.
- [ ] Trial Balance, Income Statement, and Balance Sheet remain disabled until journal-entry integrity is proven.
- [ ] RLS policies reviewed for all financial tables.
- [ ] Integration test covers full rental financial flow.

## 11. Conclusion

The recovered app is now strong enough for operational finance testing. The current implementation is intentionally conservative: it exposes supported reports and defers unsupported accounting outputs. The next development focus should be financial write hardening and reconciliation, not adding more accounting UI before the underlying ledger and authorization model are verified.
