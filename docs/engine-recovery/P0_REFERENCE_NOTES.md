# P0 Financial Engine Reference Notes

## Scope

The uploaded ERP reference package contains reusable financial-domain ideas that may inform native Rentrix improvements. These notes describe the selected concepts without adding an ERP runtime dependency.

## Payment lifecycle

Primary references:

```text
accounts/doctype/payment_entry/payment_entry.py
accounts/doctype/payment_reconciliation/payment_reconciliation.py
accounts/doctype/payment_entry/test_payment_entry.py
accounts/doctype/payment_reconciliation/test_payment_reconciliation.py
```

Useful concepts for Rentrix review:

1. Validate allocation before posting a payment.
2. Keep payment posting atomic across payment record, invoice update, receipt projection, and audit evidence.
3. Preserve request idempotency for retries.
4. Treat posted payments as immutable financial history.
5. Represent corrections as reversal plus replacement.
6. Derive balances after posting or reversal rather than storing editable outstanding values.
7. Keep receipt projection covered by regression tests.

Important upstream anchors:

```text
PaymentEntry.validate
PaymentEntry.on_submit
PaymentEntry.on_cancel
PaymentEntry.update_outstanding_amounts
PaymentEntry.validate_allocated_amount
PaymentEntry.allocate_amount_to_references
PaymentReconciliation.reconcile
```

## Outstanding and arrears

Primary references:

```text
accounts/report/accounts_receivable/accounts_receivable.py
accounts/report/accounts_receivable_summary/accounts_receivable_summary.py
accounts/party.py
accounts/doctype/dunning/dunning.py
```

Useful concepts for Rentrix review:

1. Maintain one canonical outstanding-calculation path shared by dashboard, invoices, arrears, tenant workspace, owner reporting, and exports.
2. Calculate aging from invoice due dates and an explicit as-of date.
3. Keep aging bucket definitions centralized and deterministic.
4. Preserve tenant, contract, property, and unit context in arrears results.
5. Model reminder escalation as a later workflow driven by overdue age and prior reminder state.

Candidate aging buckets for product review:

```text
not_due
1_to_30_days
31_to_60_days
61_to_90_days
over_90_days
```

## Deferred accounting concepts

The package also includes ledger and journal references so future planning can recognize boundaries. Chart of accounts, double-entry posting, journal-entry UI, general-ledger reports, financial statements, exchange gain or loss, tax accounting, multi-currency accounting, and stock accounting remain deferred.
