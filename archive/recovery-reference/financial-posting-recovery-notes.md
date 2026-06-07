# Financial Posting Recovery Notes

These notes preserve only verification prompts from removed recovery trees. They
do not preserve executable code and must not be imported into runtime modules.

## Receipt void and reversal verification

- Current docs require posted payment corrections to use reversal and replacement
  rather than silent edits.
- Active migrations define `void_receipt_atomic` compatibility and harden receipt
  posting through `post_receipt_atomic`, idempotency, duplicate-allocation checks,
  allocation-total checks, closed-period checks, serial assignment, and audit log
  inserts.
- Future work should verify the live RPC signature, authorization, audit trail,
  invoice/payment balance effects, and UI workflow before exposing any receipt
  void or posted-payment correction action.

## Closed-period posting verification

- Active receipt posting blocks new postings dated inside closed accounting
  periods.
- Future work should add explicit regression coverage for closed-period payment
  posting, receipt voiding, and replacement posting so corrections cannot bypass
  the same period guard.

## Related active implementation

- Receipt posting and period checks: `supabase/migrations/20260503160000_atomic_receipt_serial.sql`.
- Compatibility RPC placeholder and schema consolidation: `supabase/migrations/20260503120000_consolidate_schema_integrity.sql`.
- Financial UI and services: `artifacts/rentrix/src/features/financials/`.
