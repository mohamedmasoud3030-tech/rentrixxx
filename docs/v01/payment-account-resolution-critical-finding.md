# v0.1 Critical Finding: Payment Account Resolution and Migration Chain Reconciliation

**Date:** 2026-06-15
**Roadmap:** v0.1 items 2, 4, and 5
**Status:** BLOCKING until the live fix is applied and verified

This addendum records the most urgent actionable finding from the latest live
reconciliation handoff: tenant payment recording can fail on the intended live
project because the payment RPC resolves accounting accounts through an invalid
UUID cast.

## Live Project Boundary

```text
Project: RENTRIX EGY (live)
Ref:     nnggcnpcuomwfuupupwg
```

Do not use or mutate any other Supabase project while resolving this finding.
Production mutation still requires explicit owner approval and should be
preceded by preview or staging replay whenever the connector/tooling boundary
allows it.

## Critical Payment Finding

`record_invoice_payment_atomic(jsonb)` exists on live, but its internal helper
`find_payment_account_id(text)` was observed resolving `public.accounts.id` as a
UUID. The live chart of accounts stores text-like account identifiers and account
numbers such as `1111` and `1201`, so the helper can fail before any payment,
receipt, allocation, or invoice-status update is posted.

Latest recorded live evidence:

```sql
select
  public.find_payment_account_id('cash'),
  public.find_payment_account_id('receivable');
```

Result:

```text
22P02 invalid input syntax for type uuid: "1000"
```

Impact:

- This blocks the core commercial transaction: recording a tenant payment.
- This prevents a trustworthy first-client readiness claim even if the UI loads.
- This keeps v0.1 item 4 open and v0.1 item 5 browser/manual payment QA blocked.

Repository fix candidate:

```text
supabase/migrations/20260615000100_fix_invoice_payment_account_resolution.sql
```

That migration replaces `find_payment_account_id(text)` with a text-returning
implementation and recreates `record_invoice_payment_atomic(jsonb)` so journal
posting uses text account IDs that match the live schema.

## Migration Chain Reconciliation Data

The latest handoff data identifies a live migration-state dataset of **50 live
entries** requiring reconciliation against the canonical local chain under:

```text
supabase/migrations/
```

Earlier committed status notes recorded smaller snapshots during prior sessions
for the same live project, including a 36-entry live migration count in
`docs/v01/migration-reconciliation-status.md`. Treat the 50-entry dataset as the
current reconciliation input for the next operator session, not as a replacement
for the historical notes unless the raw connector export is committed in a
reviewed follow-up.

Current repository-side facts:

- the canonical local migration directory currently contains the forward repair
  `20260615000100_fix_invoice_payment_account_resolution.sql`;
- the previous PR #892 schema-integrity migrations have been re-timestamped after
  `20260614130000_attachments_storage_bucket.sql`;
- the root of the repository intentionally contains no root-level `.sql` files;
- the migration-chain task remains a live-state reconciliation problem, not a
  request to invent a root SQL consolidation file.

Required reconciliation evidence before v0.1 closure:

- export or otherwise record the 50 live migration entries from
  `supabase_migrations.schema_migrations`;
- compare the live entries to the sorted local `supabase/migrations/` chain;
- classify each difference as already applied under a different timestamp,
  missing from live, foreign to the repo, intentionally superseded, or requiring
  a forward-only repair;
- replay the resulting chain on a preview/staging branch before any production
  mutation when access permits;
- apply the payment account-resolution repair to the intended live project only
  after approval;
- rerun the read-only `find_payment_account_id('cash')` and
  `find_payment_account_id('receivable')` verification until both resolve without
  `22P02`;
- complete authenticated browser QA for contract -> invoice -> payment -> receipt
  -> invoice status -> reversal behavior.

## Immediate Next Action

The next safe action is not more UI work. The next safe action is an operator-led
database reconciliation session that confirms the 50 live entries, applies or
replays the account-resolution repair through the approved path, and captures the
post-fix payment evidence.

Until that evidence exists, the first-client delivery plan must treat payment
recording as the highest-priority blocker.
