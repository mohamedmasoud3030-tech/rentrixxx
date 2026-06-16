# v0.1 — Live Migration Reconciliation Status

> Last updated: 2026-06-15 after PR #911.
> For current execution guidance verify against `docs/ai/CURRENT_EXECUTION_CONTEXT.md`.

## Live Project

```
Name:   RENTRIX EGY (live)
Ref:    nnggcnpcuomwfuupupwg
Region: ap-southeast-1
Status: ACTIVE_HEALTHY
```

---

## Migration Chain — Final Reconciled State (2026-06-15)

| Metric | Value |
|---|---|
| Repo migration files | 101 |
| Live DB `schema_migrations` entries | 101 |
| Match | ✅ Perfect |
| Latest version in both | `20260615113703` |

All 101 versions align between `supabase/migrations/` and the live `supabase_migrations.schema_migrations` table.  
Remote-applied migrations that existed only in the live DB were back-filled as stub files in PR #910 and PR #911.

---

## Resolved Blockers (chronological)

### 1. Dashboard Load Failure — ✅ FIXED (PR #817)
`dashboardService.ts` called `rpt_financial_summary({month, year})` but live signature is `(p_from date, p_to date)`.

### 2. Payment Recording — ✅ FIXED (PR #896 + PR #910)
`find_payment_account_id(text)` was casting `accounts.id` to `uuid`, failing with `22P02` on text codes like `1111`.

**Fix applied:** `20260615000100_fix_invoice_payment_account_resolution.sql` + `20260615000200_fix_type_casts_void_receipt_security.sql`.

**Live verification:**
```sql
SELECT public.find_payment_account_id('cash'), public.find_payment_account_id('receivable');
-- '1111' | '1201'  ✅
```

### 3. Auth JWT Role Injection — ✅ FIXED (PR #814 + #815)
`custom_access_token_hook` was callable by `anon`/`authenticated`. Locked to `supabase_auth_admin` only.

⚠️ **Dashboard hook registration still requires manual step** (see below).

### 4. `void_receipt_atomic` PGRST202 Mismatch — ✅ FIXED (PR #910)
Frontend called `supabase.rpc('void_receipt_atomic', { payload })` (single jsonb arg) but live function had only a 4-arg signature. Added `void_receipt_atomic(jsonb)` wrapper in `20260615000200`.

### 5. Type Cast Bugs (bigint → timestamptz) — ✅ FIXED (PR #910)
Four atomic functions were writing `bigint` epoch values into `timestamptz` columns:
- `renew_contract_atomic` → `contracts.updated_at`
- `update_contract_balance_on_receipt_allocation` → `contract_balances.updated_at`
- `void_receipt_atomic(4-arg)` → `journal_entries.created_at`
- `invoices/receipts/expenses.deleted_at` column types changed from `bigint` → `timestamptz`

### 6. Owner Balance Excluding ENDED Contracts — ✅ FIXED (PR #892 + PR #910)
`update_owner_balance_on_expense` joined contracts with `c.status = 'ACTIVE'`, silently understating historical totals on renewal. Removed the filter.

### 7. Function Grant Security — ✅ FIXED (PR #911)
`find_payment_account_id`, `post_receipt_atomic`, `void_receipt_atomic(4-arg)`, and `recalculate_all_balances` had over-permissive grants to `anon` or `authenticated`. Tightened to least-privilege (PR #911, `20260615000300_harden_function_grants.sql`).

### 8. Migration Chain Gap — ✅ FIXED (PR #910 + PR #911)
43 repo migrations were not registered in `supabase_migrations`; 11 live migrations had no stub in repo. Both gaps closed; chain is now 101 = 101.

---

## Remaining Blockers

### Manual — Custom Access Token Hook Registration

**Status:** Unverified via Dashboard/Management API.

The function `public.custom_access_token_hook` exists in the live DB. However, whether Supabase Auth is configured to *call* it requires a manual Dashboard step or Management API confirmation (outside available connector/network allowlist).

**Required action (operator only):**
```
Supabase Dashboard → Authentication → Hooks
→ Custom Access Token Hook
→ pg-functions://postgres/public/custom_access_token_hook
```

Without this: JWT will not contain `app_metadata.user_role` → ADMIN/MANAGER routes will show as unauthorized.

### Manual — Authenticated Browser E2E QA

**Status:** Unblocked on deployment side (bundle verified serving `nnggcnpcuomwfuupupwg` since 2026-06-14), blocked on form-submission tooling.

**Checklist (operator):**
- [ ] Login as ADMIN user at `rentrix-alpha.vercel.app`
- [ ] Decode JWT — verify `app_metadata.user_role = "ADMIN"` (requires hook above)
- [ ] Dashboard loads without error
- [ ] Properties / Units / Contracts pages load
- [ ] Financials: record a payment on an invoice
- [ ] Receipt generated after payment
- [ ] Void a receipt — verify void_receipt_atomic(jsonb) works
- [ ] Arrears / Reports pages load
- [ ] RTL layout correct on Arabic screens
- [ ] Mobile navigation works (bottom bar)
- [ ] Change password flow works
- [ ] Sign out and sign in again

---

## Security Advisor — Final State

| Warning | Status | Migration |
|---|---|---|
| `custom_access_token_hook` callable by anon | ✅ FIXED | 20260607192639 |
| `custom_access_token_hook` callable by authenticated | ✅ FIXED | 20260607192639 |
| `increment_serial` callable by authenticated | ✅ FIXED | 20260607192657 |
| `is_admin_or_manager` callable by authenticated | ✅ FIXED | 20260607201000 |
| `is_app_user` callable by authenticated | ✅ FIXED | 20260607201000 |
| `sync_payment_reference_fields` mutable search_path | ✅ FIXED | 20260607200000 |
| `find_payment_account_id` callable by anon | ✅ FIXED | 20260615000300 |
| `post_receipt_atomic` callable by authenticated | ✅ FIXED | 20260615000300 |
| `void_receipt_atomic(4-arg)` callable by authenticated | ✅ FIXED | 20260615000300 |
| `recalculate_all_balances` callable by anon | ✅ FIXED | 20260615000300 |
| `record_invoice_payment_atomic` callable by authenticated | ✅ INTENTIONAL | Browser-facing RPC |
| `void_receipt_atomic(jsonb)` callable by authenticated | ✅ INTENTIONAL | Browser-facing wrapper |
| `financial_operation_idempotency` RLS no-access policy | ✅ INTENTIONAL | Internal table — SECURITY DEFINER writes only |
| `auth_leaked_password_protection` | ⏸️ Dashboard setting | Not SQL — enable in Auth Dashboard if desired |
| Custom Access Token Hook Dashboard registration | ⏸️ Manual step | Cannot verify via SQL or MCP |

---

## Commit Reference

| SHA | PR | Description |
|---|---|---|
| `0c0fb75` | #814 | auth hook lockdown |
| `3165efa` | #815 | security reconciliation |
| `9dc398d` | #816 | idempotency rollout |
| `86d7665` | #817 | dashboard RPC fix |
| `b2457cf` | #896 | invoice payment account resolution |
| `feae86b` | #910 | migration chain + void_receipt_atomic jsonb + type casts |
| `ac97420` | #911 | function grants hardening |
