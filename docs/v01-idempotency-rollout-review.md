# v0.1 Idempotency Rollout Review

Date: 2026-06-07
Branch: `fix/v01-idempotency-rollout-safety`
Decision: `NEEDS PATCHING`

## 1. Verified Git State

- Local branch before this review was `work` at `3165efa`, the security reconciliation commit titled `fix(security): complete v0.1 security reconciliation... (#815)`.
- The handoff commit `2c7ebee` is not present in this clone.
- No Git remote is configured locally, and `gh` is not installed, so an actual GitHub PR number/state could not be verified from this environment.
- A narrow branch was created for this scope: `fix/v01-idempotency-rollout-safety`.
- The relevant local migration is `supabase/migrations/20260604020300_add_record_invoice_payment_atomic_facade.sql`.

## 2. Verified Live State

- Live catalog verification is blocked in this environment.
- `pnpm supabase:migration-evidence` found `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, derived project ref `nnggcnpcuomwfuupupwg`, but reported missing `SUPABASE_ACCESS_TOKEN` and missing Supabase CLI.
- MCP resources are empty; no Supabase or GitHub connector resource is available.
- A REST/anon probe was attempted once and retried once. Both attempts failed with `ENETUNREACH`, so no function existence or behavior could be confirmed through the network.
- Because of those blockers, the reported live state for `financial_operation_idempotency`, `record_invoice_payment_atomic`, `receipts.request_id`, `post_receipt_atomic`, and `void_receipt_atomic` remains unverified here.

## 3. Repository vs Live Drift

- Repository code already expects `record_invoice_payment_atomic(payload jsonb)` from the browser payment service.
- Repository generated database types already include `receipts.request_id` and `record_invoice_payment_atomic`.
- The migration `20260503160000_atomic_receipt_serial.sql` defines `post_receipt_atomic(jsonb)` and references `public.financial_operation_idempotency` and `public.receipts.request_id`.
- The later migration `20260604020300_add_record_invoice_payment_atomic_facade.sql` originally created `public.financial_operation_idempotency`, but did not add `public.receipts.request_id`.
- Therefore, if live truly lacks `receipts.request_id`, the existing `post_receipt_atomic(jsonb)` body cannot work as written until the column exists.

## 4. Idempotency Design Review

- The browser payment path preserves one `request_id` across retries and calls `record_invoice_payment_atomic`.
- `record_invoice_payment_atomic` validates auth, invoice, contract, amount, account lookup, then delegates receipt posting to `post_receipt_atomic(jsonb)`.
- The original idempotency check used `SELECT ... FOR UPDATE` against `financial_operation_idempotency`, but that does not lock anything when the first request has no row yet.
- Concurrent first attempts with the same `request_id` could both pass the empty-row check before either writes the idempotency result.
- A transaction-scoped advisory lock keyed by operation and `request_id` now serializes concurrent facade retries before the idempotency lookup.
- A unique partial index on `receipts(request_id)` now protects receipt duplication when the column exists.
- `financial_operation_idempotency` now has RLS enabled immediately and no direct table policies are added.
- `find_payment_account_id(text)` is treated as an internal helper and no longer grants direct browser execution.

## 5. Risks Found

- Live schema could not be verified from this environment due missing management access and network reachability.
- Original migration was not safe if `receipts.request_id` is absent on live.
- Original migration did not protect concurrent first retries of `record_invoice_payment_atomic` with the same `request_id`.
- Standalone direct calls to `post_receipt_atomic(jsonb)` still require live-definition review; the facade lock protects the active browser path, not every possible direct RPC caller.
- `void_receipt_atomic` in the repository migration history is only a stub at `20260503120000_consolidate_schema_integrity.sql`; the reported live behavior must be verified from `pg_get_functiondef` on live.
- Account auto-discovery via `find_payment_account_id` remains schema/name dependent and needs live account-data validation before approval.

## 6. Patch Applied to Repository

- Patched `20260604020300_add_record_invoice_payment_atomic_facade.sql` to enable RLS on `financial_operation_idempotency`.
- Patched the migration to add `receipts.request_id` when `receipts` exists.
- Patched the migration to create `receipts_request_id_uidx` as a partial unique index for non-null `request_id` values.
- Patched `record_invoice_payment_atomic` to use `pg_advisory_xact_lock(hashtextextended(...))` before checking the idempotency table.
- Patched helper grants so `find_payment_account_id(text)` is not directly executable by `authenticated`.

## 7. Verification Queries

Run these read-only queries against live before any approval to apply migrations:

```sql
select current_database(), current_schema(), now();

select version, name, inserted_at
from supabase_migrations.schema_migrations
where version in ('20260503160000', '20260604020300')
order by version;

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('financial_operation_idempotency', 'receipts', 'payments', 'invoices', 'contracts', 'accounts');

select table_schema, table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('financial_operation_idempotency', 'receipts', 'payments', 'invoices', 'contracts', 'accounts')
order by table_name, ordinal_position;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('financial_operation_idempotency', 'receipts', 'payments', 'invoices', 'contracts', 'accounts')
order by tablename, indexname;

select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef, p.proowner::regrole as owner, p.proacl,
       p.proconfig, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('post_receipt_atomic', 'void_receipt_atomic', 'record_invoice_payment_atomic', 'find_payment_account_id')
order by p.proname, args;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('financial_operation_idempotency', 'receipts', 'payments', 'invoices', 'contracts', 'accounts')
order by tablename, policyname;

select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('financial_operation_idempotency', 'receipts', 'payments', 'invoices', 'contracts', 'accounts')
order by c.relname;

select request_id, count(*)
from public.receipts
where request_id is not null
group by request_id
having count(*) > 1;
```

Run these behavior checks only in an approved non-production preview or local database seeded with safe data:

```sql
-- As an authenticated JWT role, call record_invoice_payment_atomic twice with the same request_id.
-- Expected: the second call returns the same logical result and does not create a second receipt/payment/allocation.

-- In two concurrent authenticated sessions, call record_invoice_payment_atomic with the same request_id.
-- Expected: one session posts, the other waits and returns the stored idempotent result.

-- Call post_receipt_atomic(jsonb) directly with the same request_id if the RPC remains browser-executable.
-- Expected: behavior must be documented before deciding whether direct browser execution remains acceptable.
```

## 8. Rollback Plan

Do not run rollback unless the forward migration has been approved and applied, and rollback has separate approval.

```sql
begin;

drop function if exists public.record_invoice_payment_atomic(jsonb);
drop function if exists public.find_payment_account_id(text);
drop index if exists public.receipts_request_id_uidx;

-- Only drop this column if it was introduced by this rollout and no live code/data depends on it.
-- alter table if exists public.receipts drop column if exists request_id;

-- Only drop this table if no operation has stored idempotency records that must be retained.
-- drop table if exists public.financial_operation_idempotency;

commit;
```

## 9. Approval Gate

- Do not apply this migration to Supabase live yet.
- Before live approval, provide the exact proposed SQL diff, risks, rollback plan, repository check results, live catalog query output, and preview/local behavior evidence.
- Leaked Password Protection remains a manual Dashboard-only action and is unrelated to this idempotency migration.

## 10. Next Action

- Status: `NEEDS PATCHING` until the repository patch is reviewed and live catalog/behavior evidence is collected with approved read-only database access.
- After read-only evidence is available, decide whether `post_receipt_atomic(jsonb)` needs the same advisory-lock hardening for direct callers or whether direct browser execution should be revoked in favor of the facade only.
