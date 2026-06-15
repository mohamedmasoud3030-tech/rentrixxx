# v0.1 Payments and Receipts Source-of-Truth Inventory

> Repository-only inventory. This document does not authorize Supabase, Vercel,
> RLS, RPC, migration, or production mutations.

**Date:** 2026-06-15
**Roadmap context:** v0.1 item 4 and item 5 fallback slice
**Status:** active code and local migration inventory complete; live apply and
authenticated browser QA remain blocked by the approved operator path.

## Purpose

`docs/ai/CURRENT_EXECUTION_CONTEXT.md` identifies the next safe repository-only
fallback when live or preview access is unavailable: inventory the
payments/receipts source-of-truth path from active code and existing migrations
without touching Supabase, production, RPCs, RLS, or migrations.

This inventory records the current source-of-truth split:

- payment posting is initiated from the active financial UI through the
  browser-facing `record_invoice_payment_atomic(jsonb)` RPC;
- the RPC returns both a `payment_id` and a lower-level ledger `receipt_id`;
- the active receipt UI is currently payment-backed and loads receipt detail by
  `payments.id`;
- the database receipt/allocation/journal chain remains relevant for posting and
  reversals, but the frontend must not switch route identifiers to internal
  receipt IDs until a reviewed migration and frontend cutover are designed.

## Active frontend payment-posting path

The visible quick-payment flow is under `artifacts/rentrix/src/features/financials`.

1. `components/invoice-workspace-section.tsx` validates the selected invoice,
   amount, date, outstanding balance, and idempotency `request_id`.
2. `payments/usePayments.ts` calls `recordInvoicePaymentAtomic(...)`.
3. `payments/paymentService.ts` sends `supabase.rpc('record_invoice_payment_atomic', { payload })`.
4. `payments/paymentService.ts` requires the RPC response to include
   `request_id`, `invoice_id`, `payment_id`, and `receipt_id`.
5. `payments/usePayments.ts` maps the RPC response for current UI routing:
   `ledger_receipt_id = result.receipt_id` and `receipt_id = result.payment_id`.
6. `invoice-workspace-section.tsx` sets the selected receipt detail ID from the
   mapped `result.receipt_id`, so the detail panel opens by payment ID.
7. Successful payment posting invalidates invoice, receipt, and financial-report
   query keys.

Current implication: the receipt detail route and panel expect the
payment-backed identifier returned by `toPaymentBackedReceiptResult(...)`, not
the internal ledger receipt ID returned directly by the RPC.

## Active frontend receipt-read path

`receipts/receiptService.ts` projects receipt records from posted payment rows.

- `listReceipts(...)` queries `payments`, ordered by payment date and creation
  time.
- `getReceiptDetail(receiptOrPaymentId)` queries one row from `payments` by
  `id`.
- Receipt display fields are enriched by joining invoice, contract, unit,
  property, and tenant context in follow-up queries.
- `formatReceiptNumber(paymentId)` derives the visible receipt number from the
  payment ID prefix.
- `ReceiptRecord.id` and `ReceiptRecord.payment_id` both use the payment row ID.
- `ReceiptRecord.status` is hard-coded to `posted` for these payment-backed
  projections.

Existing regression coverage in `receiptService.test.ts` verifies that receipt
detail loads by the payment-backed ID returned after posting a payment and that
receipt amounts are taken from posted payment rows without deriving balances in
the receipt projection.

## Database posting chain represented in local migrations

The local migration chain contains the browser-facing payment facade and later
hardening/repair migrations.

Current local intent:

1. `record_invoice_payment_atomic(jsonb)` validates auth, role, request ID,
   invoice existence, contract existence, positive amount, and outstanding
   balance.
2. It locks idempotent requests through `financial_operation_idempotency`.
3. It resolves cash and receivable accounts through
   `find_payment_account_id(text)`.
4. It builds an internal receipt/allocation/journal payload.
5. It delegates posting to `post_receipt_atomic(jsonb)`.
6. It ensures a payment row exists when the internal result did not include a
   `payment_id`.
7. It returns a combined result containing `request_id`, `invoice_id`,
   `payment_id`, and internal `receipt_id`.

The local repair candidate
`supabase/migrations/20260615000100_fix_invoice_payment_account_resolution.sql`
keeps this shape while changing account resolution and journal posting to use
text account IDs that match the observed live chart-of-accounts shape.

## Known live blocker

The latest recorded live evidence in
`docs/v01/payment-account-resolution-critical-finding.md` and
`docs/v01/migration-reconciliation-status.md` says
`find_payment_account_id('cash'/'receivable')` failed on the intended live
project with:

```text
22P02 invalid input syntax for type uuid: "1000"
```

That failure can prevent `record_invoice_payment_atomic(jsonb)` from reaching
payment row creation, internal receipt creation, allocation insertion, journal
posting, or invoice-status updates.

Required evidence before closing the blocker:

- apply or replay
  `20260615000100_fix_invoice_payment_account_resolution.sql` only through the
  approved non-production or operator path;
- rerun `find_payment_account_id('cash')` and
  `find_payment_account_id('receivable')` against the intended live project;
- prove `record_invoice_payment_atomic(jsonb)` can record a payment and return
  both `payment_id` and `receipt_id`;
- complete authenticated browser/manual QA for invoice -> payment -> receipt ->
  invoice status -> reversal behavior.

## Do-not-change boundary for the next implementation PR

Until live RPC evidence and a reviewed cutover exist:

- do not switch the receipt detail route or panel from payment IDs to internal
  receipt IDs;
- do not treat internal `receipts.id` as the browser receipt route identifier;
- do not remove the `toPaymentBackedReceiptResult(...)` mapping;
- do not add standalone payment creation outside `record_invoice_payment_atomic`;
- do not bypass idempotent `request_id` handling in the quick-payment flow;
- do not mutate payment rows after posting;
- do not change migrations, RLS, RPC grants, Supabase config, or production data
  from a repository-only fallback task.

## Next safe steps

1. Operator path: apply/replay the account-resolution repair through approved
   preview or live process and capture fresh read-only evidence.
2. Repository path if access remains blocked: add targeted tests that lock the
   current payment-backed receipt routing contract and document any future
   internal receipt-ID cutover as a separate reviewed change.
3. Browser/manual path after RPC evidence: verify quick payment, receipt detail,
   receipt print, invoice status transition, and reversal behavior under an
   authenticated ADMIN or MANAGER session.
