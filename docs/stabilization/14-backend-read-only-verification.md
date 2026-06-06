# Backend Read-Only Verification and Hardening Scope

Recorded on: 2026-06-06

## Safety boundary

This verification used read-only SQL against the connected Supabase project. No production DDL or data mutation was executed.

## Connected runtime candidate

Repository history and Supabase integration comments identify project ref `nnggcnpcuomwfuupupwg` as the connected production/base candidate. Vercel production environment variables and deployed browser network requests still require manual confirmation before any production migration rollout.

## Live read-only findings

- `public.units.status` is currently a nullable `text` column without a default.
- The live unit rows observed use the canonical value `available`; no unsupported status variant was observed in the query result.
- `public.contracts.start_date` and `public.contracts.end_date` are currently `text`, not `date`.
- The connected live project currently has zero contract rows, so there are no existing overlap rows to repair before introducing the guard.
- The live `contracts` table does not currently have an overlap-prevention trigger.
- The historical overlap migration is not runtime-compatible with the linked live schema because it passes text columns directly to `daterange(...)`.
- The current React payment path calls `record_invoice_payment_atomic` only. It does not call `post_receipt_atomic` directly.
- The current React renewal path calls `renew_contract_atomic`.

## Required follow-up migration

A dedicated migration should be validated on a Supabase Preview Branch before merge. It must:

1. Fail closed if orphaned, mismatched, invalid-date, or overlapping active contracts already exist.
2. Enforce non-null canonical unit status with default `available` after confirming no null rows exist.
3. Enforce contract property/unit/tenant presence and property-unit consistency.
4. Enforce valid contract date windows while remaining compatible with historical text dates and fresh replay date columns.
5. Serialize active-contract checks per unit inside the transaction to avoid concurrent overlap races.
6. Remove direct browser execution grants from internal helpers while keeping the two browser-facing facades callable by authenticated users.
7. Enable RLS and revoke direct browser table privileges for the payment idempotency table when present.

## Explicitly deferred

- No production migration application from this audit task.
- No destructive data cleanup.
- No conversion of live text date columns to typed date columns until a separate data-migration plan is reviewed.
- No accounting-ledger expansion.
