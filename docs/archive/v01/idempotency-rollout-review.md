# v0.1 Idempotency Rollout Review

> Historical snapshot — verify against `docs/ai/CURRENT_EXECUTION_CONTEXT.md` before acting.

Date: 2026-06-07
GitHub PR: #816
GitHub branch: `codex/investigate-idempotency-rollout`
Decision: `BLOCKED BY PREVIEW AUTH`

## 1. Verified Git State

- PR #816 exists on GitHub and is open from `codex/investigate-idempotency-rollout` into `main`.
- The local branch was switched to `codex/investigate-idempotency-rollout` tracking `origin/codex/investigate-idempotency-rollout`.
- The previous PR commit modified an already-versioned migration, `20260604020300_add_record_invoice_payment_atomic_facade.sql`, which was unsafe because environments that already recorded version `20260604020300` would not rerun those statements.
- The historical migration has now been restored to the exact `origin/main` content.

## 2. Preview Access State

- Required preview project ref: `clgbohhkikeokpkyqnzy`.
- Required MCP URL: `https://mcp.supabase.com/mcp?project_ref=clgbohhkikeokpkyqnzy&read_only=true`.
- `codex mcp add ...` could not run because the `codex` CLI is unavailable in this container.
- No fallback to the live project was attempted.
- Preview read-only catalog checks and preview replay validation remain blocked until the preview MCP can be authenticated.

## 3. Supabase CLI Installation

- Installed the Supabase CLI locally as a workspace root dev dependency with `pnpm add -Dw supabase`.
- Verified `pnpm exec supabase --version` reports `2.105.0`.
- Verified `pnpm exec supabase --help` works.
- `pnpm supabase:migration-evidence` now detects the local CLI but still reports missing `SUPABASE_ACCESS_TOKEN`; no live inspection was performed.

## 4. Repository vs Live Drift

- Repository code expects browser payments to call `record_invoice_payment_atomic(payload jsonb)`.
- Repository types include `receipts.request_id`, `record_invoice_payment_atomic`, and `post_receipt_atomic`.
- Previous live evidence in project docs reports `record_invoice_payment_atomic` and `receipts.request_id` missing from live, but this PR did not perform live read-only inspection because explicit approval is required.
- The active repair is implemented as a new forward migration so already-migrated environments receive it when the new version is applied.

## 5. Forward Migration Added

- Added `20260608000100_harden_invoice_payment_idempotency_rollout.sql`.
- Added `20260608000200_ensure_financial_operation_idempotency_operation_request_unique.sql` so `ON CONFLICT (operation_name, request_id)` remains valid even on drifted schemas with an unrelated existing primary key.
- Ensures `public.financial_operation_idempotency` exists with required columns, primary key, RLS enabled, and no direct table grants to `public`, `anon`, or `authenticated`.
- Adds `receipts.request_id` when `receipts` exists.
- Aborts clearly before creating `receipts_request_id_uidx` if duplicate non-null `receipts.request_id` values already exist.
- Recreates `record_invoice_payment_atomic(payload jsonb)` with `SECURITY DEFINER` and `SET search_path = public, pg_temp`.
- Adds an explicit backend `is_admin_or_manager()` authorization check for payment recording.
- Adds a transaction-scoped advisory lock before the first idempotency lookup.
- Keeps `find_payment_account_id(text)` internal by revoking direct execution from `public`, `anon`, and `authenticated`.
- Revokes direct browser execution of `post_receipt_atomic(jsonb)` because the active frontend calls the facade, not the internal posting RPC.

## 6. Preview Replay Fix

- Updated `20260607200000_fix_sync_payment_reference_fields_search_path.sql` so clean replay no longer raises `sync_payment_reference_fields not found`.
- If `public.sync_payment_reference_fields()` exists, the migration pins its `search_path` to `public, pg_temp`.
- If the function is absent in a fresh preview schema, the migration emits a NOTICE and skips safely.
- No fake trigger function is created.

## 7. Authorization Review

- Existing helpers are `public.is_app_user()` and `public.is_admin_or_manager()`.
- Payment recording is a financial write path, so the forward migration uses `public.is_admin_or_manager()` and therefore allows only active `ADMIN` or `MANAGER` users.
- `USER` callers should be denied by the database layer before any payment side effects.
- Direct direct browser execution of `post_receipt_atomic(jsonb)` is no longer granted by the forward migration.

## 8. Idempotency Review

- The previous first-request race was caused by `SELECT ... FOR UPDATE` not locking anything when no idempotency row existed yet.
- The facade now takes `pg_advisory_xact_lock(hashtextextended('record_invoice_payment_atomic:' || v_request_id, 0))` before looking up the idempotency row.
- `receipts_request_id_uidx` protects persisted receipt rows from duplicate non-null request IDs.
- Duplicate existing `receipts.request_id` values abort the migration before index creation.
- Account autodiscovery still uses configured account text matching, but now fails if multiple accounts match instead of silently choosing `limit 1`.

## 9. Verification Queries

Run these read-only queries against the preview project after MCP authentication:

```sql
select version, name, inserted_at
from supabase_migrations.schema_migrations
where version in ('20260604020300', '20260607200000', '20260608000100')
order by version;

select table_schema, table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('financial_operation_idempotency', 'receipts', 'payments', 'invoices', 'contracts', 'accounts')
order by table_name, ordinal_position;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('financial_operation_idempotency', 'receipts')
order by tablename, indexname;

select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef, p.proowner::regrole as owner, p.proacl,
       p.proconfig, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('post_receipt_atomic', 'void_receipt_atomic', 'record_invoice_payment_atomic', 'find_payment_account_id', 'sync_payment_reference_fields')
order by p.proname, args;

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

## 10. Rollback Plan

Do not run rollback unless the forward migration has been approved and applied, and rollback has separate approval.

```sql
begin;

drop function if exists public.record_invoice_payment_atomic(jsonb);
drop function if exists public.find_payment_account_id(text);
drop index if exists public.receipts_request_id_uidx;

-- Only drop this column if it was introduced by this rollout and no live code/data depends on it.
-- alter table if exists public.receipts drop column if exists request_id;

-- Only drop this table if no operation has stored idempotency records that must be retained.
-- drop index if exists public.financial_operation_idempotency_operation_request_uidx;
drop table if exists public.financial_operation_idempotency;

commit;
```

## 11. Remaining Risks

- Preview MCP authentication is blocked in this container, so preview catalog evidence and replay status are still missing.
- Preview write tests require write-capable preview access; do not remove `read_only=true` without explicit approval.
- Live Supabase project `nnggcnpcuomwfuupupwg` was not inspected or mutated.
- `Leaked Password Protection` remains a manual dashboard-only action under Authentication -> Passwords and is unrelated to this idempotency rollout.

## 12. Next Action

- Authenticate the read-only preview MCP connection for project `clgbohhkikeokpkyqnzy`.
- Run the verification queries above against preview only.
- If write behavior tests are required, request explicit approval to use a write-capable preview connection.
- Do not apply anything to live from this PR.
