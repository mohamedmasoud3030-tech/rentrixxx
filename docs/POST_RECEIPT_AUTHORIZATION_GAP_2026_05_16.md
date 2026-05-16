# Post Receipt Authorization Hardening Note — 2026-05-16

## Scope

This note records what PR-A hardened for the `post_receipt_atomic` write path and what remains intentionally deferred because the current schema does not expose a per-user, organization, membership, or property-assignment authorization model for the recovered operational tables.

## Implemented in this PR

- Kept the existing frontend RPC payload shape: `invoice_id`, `amount`, `method`, `date`, and `reference`.
- Required `auth.uid()` inside `post_receipt_atomic`, rejecting anonymous calls even though the function is `SECURITY DEFINER`.
- Required a live invoice joined through a live contract and live property before posting payment.
- Required a non-null, positive, rounded payment amount.
- Required a non-null payment date.
- Rechecked the remaining balance inside the locked database transaction and rejected overpayment at the RPC layer.
- Inserted the payment and updated the invoice in the same RPC transaction.
- Removed direct authenticated write access to `payments`; authenticated users retain read access, while payment posting is routed through the guarded RPC.
- Kept the existing posted-payment immutability trigger in place for update/delete protection.

## Authorization gap intentionally not invented

The current core financial tables (`properties`, `contracts`, `invoices`, and `payments`) do not include an `organization_id`, `created_by`, `manager_id`, membership mapping, or other stable per-user ownership column that can safely answer: "which authenticated user may post a receipt for this invoice?"

Because of that, this PR does **not** invent a new authorization table or make a speculative ownership rule. The strongest safe guard currently available is:

1. the caller must be authenticated;
2. the invoice/contract/property chain must exist and be live; and
3. the write must pass transaction-level amount/date/remaining-balance checks.

## Required follow-up before production multi-tenant use

Before enabling this financial write path for multi-tenant or externally hosted production data, add an explicit access model and enforce it in both RLS and `post_receipt_atomic`, for example:

- organization or company scope on financial tables;
- membership/role table for users;
- property access or portfolio assignment mapping;
- service tests that prove a user cannot post a receipt for another organization/property;
- generated Supabase types after the schema changes are applied.

Until that access model exists, the RPC is hardened for authenticated operational use, but not complete per-user/property authorization.
