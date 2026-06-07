# Wave 1B — Financial Posting Design Reconciliation

## Scope

Documentation-only reconciliation of the current payment, receipt, invoice-allocation, and posting design.

No runtime code was changed. No Supabase migration was applied. No production data was mutated. No live Vercel or Supabase setting was changed.

## Environment boundary

The Supabase connector confirmed the intended live project directly:

- project name: `RENTRIX EGY (live)`
- project ref: `nnggcnpcuomwfuupupwg`
- region: `ap-southeast-1`
- project status: `ACTIVE_HEALTHY`

Do not use:

- project name: `rentrix (V2)`
- project ref: `ktmizdznbdwvalmmfvfc`

The Vercel connector listed the project candidate:

- team: `m7mdms3d`
- project name: `rentrix`
- project ID: `prj_O97BqIkagZFLqyUvuoeUbgOQYu6F`

Vercel project-detail and deployment-list reads were blocked by the connector safety layer. Active deployment URL, production commit SHA, and environment-variable targeting remain unverified.

## Live read-only connector evidence

The Supabase connector completed these read-only checks against `nnggcnpcuomwfuupupwg` only:

| Check | Result |
| --- | --- |
| Project identity | PASS — `RENTRIX EGY (live)` / `nnggcnpcuomwfuupupwg` / `ACTIVE_HEALTHY`. |
| Supabase branch inventory | PARTIAL PASS — the default `main` branch was returned with `project_ref = nnggcnpcuomwfuupupwg`, `preview_project_status = ACTIVE_HEALTHY`, and branch status `MIGRATIONS_FAILED`. Two older inactive preview branches were also returned with `MIGRATIONS_FAILED`. |
| Security advisors | PASS read-only — findings were returned and are tracked primarily in Wave 1C. |
| Performance advisors | PASS read-only — findings include unindexed contract foreign keys and historical unused indexes. |
| Migration list | BLOCKED — `list_migrations` was denied by the connector safety layer. |
| Table inventory | BLOCKED — `list_tables` was denied by the connector safety layer. |
| SQL catalog query | BLOCKED — read-only `execute_sql` was denied by the connector safety layer. |
| Logs | BLOCKED — auth and Postgres log reads were denied by the connector safety layer. |

`MIGRATIONS_FAILED` is a release risk. It does not prove that the current runtime is broken, but it prevents a clean rollout claim until the failed branch migration state is reconciled and replayed safely outside production.

## Repository evidence reviewed

- `docs/ai/domain-rules.md`
- `docs/ai/security-policy.md`
- `docs/stabilization/14-backend-read-only-verification.md`
- `artifacts/rentrix/src/features/financials/payments/paymentService.ts`
- `artifacts/rentrix/src/features/financials/payments/paymentService.test.ts`
- `artifacts/rentrix/src/features/financials/receipts/receiptService.ts`
- `artifacts/rentrix/src/features/financials/receipts/receiptService.test.ts`
- `supabase/migrations/20260516110000_harden_post_receipt_authorization.sql`
- `supabase/migrations/20260604020300_add_record_invoice_payment_atomic_facade.sql`

## Current browser-facing contract

The React application records invoice payments through exactly one browser-facing RPC:

```text
record_invoice_payment_atomic(payload jsonb)
```

`paymentService.ts` sends:

```text
invoice_id
amount
method
date
reference
request_id
```

The client preserves one `request_id` across retries and resets it only after the caller decides the operation completed. The service rejects malformed RPC success responses and propagates RPC failures instead of synthesizing success.

## Current server-side facade expectation

The repository migration for `record_invoice_payment_atomic(payload jsonb)` expects the facade to:

1. require an authenticated actor;
2. require a caller-provided idempotency key;
3. lock and load the target invoice;
4. verify that the invoice still has a valid contract;
5. derive outstanding amount from invoice amount, tax amount, and paid amount;
6. reject non-positive values and overpayment;
7. create server-side receipt, allocation, and journal payloads;
8. delegate internal posting to `post_receipt_atomic(jsonb)`;
9. persist and return the idempotent response.

The browser must not call internal posting helpers directly.

## Receipt projection decision

The active UI deliberately treats receipts as payment-backed projections:

```text
payments.id -> receipt detail route identifier
payments.amount -> displayed posted amount
payments.payment_date -> displayed receipt date
```

`receiptService.ts` queries `payments.id` for detail, derives `REC-<payment-id-prefix>` display numbers, and enriches the record with invoice, contract, property, unit, and tenant context.

The facade also returns an internal `receipt_id`. That identifier must not replace the UI-facing `payment_id` unless a separate reviewed migration and frontend cutover explicitly changes the product contract.

## Canonical beta design

For constrained beta, keep the following boundary:

```text
Invoice -> record_invoice_payment_atomic(payload) -> posted Payment -> UI receipt projection
```

The constrained beta must preserve:

- no standalone browser-created payments;
- no silent editing of posted payments;
- deterministic idempotent retry behavior;
- no editable stored outstanding-balance field;
- one canonical outstanding calculation path;
- no new accounting-ledger UI or general ledger expansion.

Existing internal receipt/allocation/journal compatibility behavior may remain only as an implementation dependency while it is reconciled. Wave 1B does not expand it.

## Blocking reconciliation questions before Wave 2 rollout

The following remain unanswered because detailed live catalog reads were blocked. They must be verified through approved read-only access and a Supabase Preview Branch before any live migration rollout:

| Priority | Question | Required evidence |
| --- | --- | --- |
| P0 | Why is the Supabase default `main` branch marked `MIGRATIONS_FAILED`? | Failed migration version, replay log, safe repair PR, and Preview Branch replay. |
| P0 | Which `post_receipt_atomic` overloads exist live? | `pg_proc`, signatures, owners, grants, `pg_get_functiondef`, fixed `search_path`. |
| P0 | Does `post_receipt_atomic(jsonb)` exist live and return `payment_id` consistently? | Preview execution with success, retry, overpayment, and rollback cases. |
| P0 | Is `financial_operation_idempotency` protected from direct browser writes? | table existence, grants, RLS enabled state, policies, anonymous/authenticated behavior. |
| P0 | Can authenticated browser users execute internal helpers such as `find_payment_account_id(text)` directly? | routine grants and an explicit least-privilege cleanup plan. Internal helpers should not be browser APIs. |
| P0 | Are invoice status and paid amount updated exactly once after retries? | Preview branch transaction tests and idempotency replay tests. |
| P0 | Are posted payments immutable in live RLS and table grants? | mutation checks for update/delete denial plus reviewed reversal-and-replacement design. |
| P1 | Is journal/account compatibility mandatory for beta posting or only historical baggage? | product decision and preview proof. Do not add ledger scope during stabilization. |
| P1 | Are UI receipt identifiers and internal receipt identifiers intentionally distinct everywhere? | frontend route audit, service audit, RPC response audit, regression tests. |

## Planned Wave 2 implementation slices

Any implementation must be split into narrow reviewed PRs after approved live read-only evidence exists:

1. **Migration replay reconciliation** — identify the exact failed branch migration and prove a safe Preview Branch replay.
2. **RPC catalog alignment** — reconcile the live facade and internal helper signatures without changing browser payloads.
3. **Least-privilege cleanup** — revoke browser execution on internal helpers; keep only the approved facade callable by `authenticated`.
4. **Idempotency table hardening** — enable RLS and remove direct browser mutation privileges where required.
5. **Posted-payment immutability** — block direct update/delete and document reversal-and-replacement correction behavior.
6. **Preview verification** — prove atomic rollback, retry replay, overpayment rejection, and canonical receipt projection before any live rollout request.

## Verification performed

- Repository source review.
- Supabase project list read.
- Supabase branch inventory read.
- Supabase security-advisor read.
- Supabase performance-advisor read.
- Vercel team and project-list reads.

Blocked reads were recorded exactly and were not retried through undocumented alternatives.

The normal GitHub Actions gate remains the verification source for repository changes:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
```
