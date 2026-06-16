# v0.1 Security Reconciliation — Final Status

> Historical snapshot — verify against `docs/ai/CURRENT_EXECUTION_CONTEXT.md` before acting.

**Status:** PARTIAL COMPLETE — 2 of 4 security fixes applied; 1 dashboard-only; 1 deferred to separate PR  
**Date:** 2026-06-07  
**Roadmap:** v0.1 Item 4 — Auth, RLS, and RPC least-privilege reconciliation  
**Branch:** fix/v01-complete-security-reconciliation  
**Target project:** RENTRIX EGY (live) / `nnggcnpcuomwfuupupwg`  
**Prohibited project:** rentrix (V2) / `ktmizdznbdwvalmmfvfc`

---

## Migrations applied in this PR

### 20260607200000_fix_sync_payment_reference_fields_search_path

**Purpose:** pin `search_path = public, pg_temp` on `sync_payment_reference_fields()` trigger function.

**Live evidence (post-apply):**
```text
proname: sync_payment_reference_fields
proconfig: ["search_path=public, pg_temp"]
```

✅ Confirmed on live. Security Advisor warning cleared.

---

### 20260607201000_revoke_rls_helpers_direct_execute_from_authenticated

**Purpose:** revoke direct RPC callability of `is_app_user()` and `is_admin_or_manager()` from `authenticated` and `anon` roles.

**Dependency review performed (read-only, 2026-06-07):**
- Both functions are `SECURITY DEFINER` and query only `public.users`.
- ~45 RLS policies across all operational tables call these helpers.
- All tables using these policies are owned by `postgres`.
- RLS policies evaluate in the table-owner (`postgres`) security context — they do not require `authenticated` to hold EXECUTE.
- No application code calls these functions directly via RPC.
- Revoking `authenticated` EXECUTE removes the `/rest/v1/rpc/is_app_user` and `/rest/v1/rpc/is_admin_or_manager` exposure without affecting any RLS policy.

**Live evidence (post-apply):**
```text
is_admin_or_manager: proacl = {postgres=X/postgres, service_role=X/postgres}
is_app_user:         proacl = {postgres=X/postgres, service_role=X/postgres}
```

✅ Confirmed on live. `authenticated` and `anon` EXECUTE removed. Security Advisor warnings cleared.

---

## Security Advisor final state (post-apply)

```text
Remaining: 1 warning
  - Leaked Password Protection Disabled (auth_leaked_password_protection)
    → Dashboard-only setting: Auth → Passwords → Enable "Leaked Password Protection"
    → Cannot be changed via SQL migration
    → Recorded as dashboard-level residual blocker
    → No live migration can resolve this
```

Previous warnings now cleared:
- ✅ `sync_payment_reference_fields` mutable search_path — FIXED
- ✅ `is_admin_or_manager` callable by authenticated — FIXED
- ✅ `is_app_user` callable by authenticated — FIXED

---

## Idempotency posture investigation

**Findings (verified read-only against live, 2026-06-07):**

| Item | Status | Evidence |
| --- | --- | --- |
| `public.financial_operation_idempotency` table | **MISSING on live** | `to_regclass('public.financial_operation_idempotency') = null` |
| `public.record_invoice_payment_atomic` function | **MISSING on live** | `pg_proc` query returned empty |
| `receipts.request_id` column | **MISSING on live** | `information_schema.columns` returned empty for this column |
| Migration `20260604020300_add_record_invoice_payment_atomic_facade` | **NOT in `supabase_migrations.schema_migrations`** | Queried migration log, no match |
| `post_receipt_atomic` function | Exists on live | Body references `request_id` on receipts, which is missing |
| `void_receipt_atomic` function | Exists on live | Has idempotency via `status = VOID` check, no external table needed |
| `renew_contract_atomic` function | Exists on live | Has guard via `unit_id` active-contract check |

**Classification: Case B** — The idempotency table, the facade RPC, and the `receipts.request_id` column are all intentionally designed (documented in migration `20260604020300`) but not yet applied to live.

**Action required (separate PR):** Apply migration `20260604020300_add_record_invoice_payment_atomic_facade.sql` plus any dependent migrations in the correct order. This involves:
1. Adding `financial_operation_idempotency` table
2. Adding `receipts.request_id` column
3. Deploying `record_invoice_payment_atomic` facade function
4. Verifying `post_receipt_atomic` against the new schema

**Scope boundary:** This is a schema expansion + RPC deployment, not a security fix. It belongs in a separate narrow PR under v0.1 Item 4 continuation, after the current security hardening PR is merged.

---

## Dashboard-level residual blocker

```text
Item: Leaked Password Protection
Status: BLOCKED — dashboard-only setting
Action: Enable in Supabase Dashboard → Authentication → Passwords → "Leaked Password Protection"
Note: This setting cannot be changed via SQL or migration
```

---

## Migrations applied to live in this PR

```text
20260607200000_fix_sync_payment_reference_fields_search_path    ✅ applied
20260607201000_revoke_rls_helpers_direct_execute_from_authenticated ✅ applied
```

---

## Post-apply live state (final verification)

```text
Security Advisor warnings remaining: 1 (auth_leaked_password_protection — dashboard only)
sync_payment_reference_fields proconfig: ["search_path=public, pg_temp"]
is_app_user proacl: {postgres=X/postgres, service_role=X/postgres}
is_admin_or_manager proacl: {postgres=X/postgres, service_role=X/postgres}
financial_operation_idempotency: NOT PRESENT — deferred to idempotency PR
record_invoice_payment_atomic: NOT PRESENT — deferred to idempotency PR
receipts.request_id: NOT PRESENT — deferred to idempotency PR
```

---

## Next roadmap item

After this PR merges: open a separate narrow PR to apply the idempotency stack:

1. `20260604020300_add_record_invoice_payment_atomic_facade.sql` (creates `financial_operation_idempotency`, adds `receipts.request_id`, deploys `record_invoice_payment_atomic`)
2. Re-verify that `post_receipt_atomic` works correctly against the new `receipts.request_id` column
3. Verify `record_invoice_payment_atomic` end-to-end payment flow
4. Re-run Security Advisor

After idempotency PR merges, v0.1 Item 4 can be marked DONE and Item 5 (Browser/manual QA) becomes the next BLOCKED item requiring preview/staging access.

---

## Commit

Branch: `fix/v01-complete-security-reconciliation`  
Target: `main` via reviewed PR  
Runtime code changed: none  
Database mutations: 2 migrations applied to live (`nnggcnpcuomwfuupupwg`)  
Prohibited target touched: no
