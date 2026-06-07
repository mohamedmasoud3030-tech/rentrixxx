# v0.1 — Live Migration Reconciliation Status

**Last updated:** 2026-06-08  
**Session 2 merge commit:** `86d7665ed90e` (PR #817)  
**Status:** ACTIVE — v0.1 items 2–4 functionally CLOSED pending browser QA

---

## Live Project

```
Name:   RENTRIX EGY (live)
Ref:    nnggcnpcuomwfuupupwg
Region: ap-southeast-1
Status: ACTIVE_HEALTHY
```

---

## Migrations Applied in Session 2 (this session)

| Version | Name | Applied |
|---|---|---|
| 20260607192639 | lock_down_custom_access_token_hook_execute | ✅ |
| 20260607192649 | enable_rls_on_exposed_tables | ✅ |
| 20260607192657 | harden_internal_rpc_execution | ✅ |
| 20260607194214 | fix_sync_payment_reference_fields_search_path | ✅ (via #815 auto) |
| 20260607194222 | revoke_rls_helpers_direct_execute_from_authenticated | ✅ (via #815 auto) |
| 20260608000100 | harden_invoice_payment_idempotency_rollout | ✅ (applied via connector) |
| 20260608000200 | ensure_financial_operation_idempotency_operation_request_unique | ✅ (applied via connector) |

**Total live migrations:** 36

---

## PRs Merged in Session 2

| PR | Title | Status |
|---|---|---|
| #814 | fix(auth): lock down custom access token hook execution | ✅ Merged |
| #815 | fix(security): complete v0.1 security reconciliation | ✅ Merged |
| #816 | fix(db): harden invoice payment idempotency rollout | ✅ Merged |
| #817 | fix(dashboard): align rpt_financial_summary RPC call | ✅ Merged |

---

## Critical Bugs Fixed

### 1. Dashboard Load Failure — FIXED ✅
**Root cause:** `dashboardService.ts` called `rpt_financial_summary({month, year})` but live function signature is `(p_from date, p_to date)`.

**Fix:** PR #817
- Compute `p_from`/`p_to` ISO dates from month+year
- Map response fields: `collected` → `total_collected`, `expenses` → `total_expenses`, `net` → `net_revenue`, `overdue_amount` → `total_overdue_invoices`
- Update `database.ts` type definition

**Expected result:** Dashboard loads correctly. Data shows 0s until real data is added.

### 2. Payment Recording — FIXED ✅
**Root cause:** `record_invoice_payment_atomic` RPC was missing from live.

**Fix:** PR #816 — migration 20260608000100 creates the function + idempotency table.

### 3. Auth JWT Role Injection — FIXED ✅
**Root cause:** `custom_access_token_hook` was callable by `anon`/`authenticated` (security issue), not locked to `supabase_auth_admin`.

**Fix:** PRs #814 + #815 — revoke from public, grant only to `supabase_auth_admin`.

⚠️ **Dashboard hook registration still requires manual step:**
```
Supabase Dashboard → Authentication → Hooks
→ Custom Access Token → pg-functions://postgres/public/custom_access_token_hook
```
Without this: ADMIN users will not get ADMIN role in their JWT. All admin routes will show as unauthorized.

---

## Security Advisor — Final State

| Warning | Status | Note |
|---|---|---|
| `custom_access_token_hook` callable by anon | ✅ FIXED | Migration 20260607192639 |
| `custom_access_token_hook` callable by authenticated | ✅ FIXED | Migration 20260607192639 |
| `increment_serial` callable by authenticated | ✅ FIXED | Migration 20260607192657 |
| `is_admin_or_manager` callable by authenticated | ✅ FIXED | Migration 20260607201000 |
| `is_app_user` callable by authenticated | ✅ FIXED | Migration 20260607201000 |
| `sync_payment_reference_fields` mutable search_path | ✅ FIXED | Migration 20260607200000 |
| `record_invoice_payment_atomic` callable by authenticated | ✅ INTENTIONAL | Browser-facing RPC |
| `financial_operation_idempotency` RLS no policy | ✅ INTENTIONAL | Internal table, all access revoked |
| `auth_leaked_password_protection` | ⏸️ Dashboard setting | Not SQL — enable in Auth Dashboard if desired |

---

## RLS Status

All public tables have RLS enabled. Verified tables:
- profiles ✅
- governance ✅
- settings ✅
- serials ✅
- financial_operation_idempotency ✅ (RLS + all grants revoked = internal only)

---

## Known Remaining Gap

### `void_receipt_atomic` search_path
The live function has `search_path=""` (empty). Migration 20260607192000 tried to set `search_path = public, pg_temp` but the function has 4 parameters, not 1 (`uuid` alone). The `IF EXISTS` guard skipped it silently.

**Assessment:** `search_path=""` is safe (prevents schema injection). No advisor warning. Not blocking.

**Next action:** If needed, a targeted migration should use the correct signature:
```sql
alter function public.void_receipt_atomic(
  p_receipt_id uuid, p_voided_at bigint,
  p_invoice_updates jsonb, p_reverse_entries jsonb
) set search_path = public, pg_temp;
```

---

## What the Next Agent Should Do

### Immediate — Manual (1 action)
1. Register auth hook in Supabase Dashboard:
   ```
   Authentication → Hooks → Custom Access Token
   → pg-functions://postgres/public/custom_access_token_hook
   ```

### v0.1 Item 5: Browser/Manual Operational QA
This is the next roadmap item. Requires browser access to `rentrix-alpha.vercel.app`.

Checklist:
- [ ] Authenticate as ADMIN user
- [ ] Decode JWT — verify `app_metadata.user_role = "ADMIN"` (requires hook registration above)
- [ ] Dashboard loads without error
- [ ] Properties page loads
- [ ] Contracts page loads
- [ ] Financials/Invoices page loads
- [ ] Payment recording works (Quick payment form)
- [ ] Receipt generated after payment
- [ ] Arrears page loads
- [ ] Reports page loads
- [ ] RTL layout correct on Arabic screens
- [ ] Mobile navigation works (bottom bar)
- [ ] Change password flow works
- [ ] Sign out and sign in again

### v0.1 Item 6: Final Constrained-Beta Release Check
After browser QA passes:
- Run full CI gate
- Record live evidence
- Decide GO / NO-GO

---

## Commit Reference

| SHA | Description |
|---|---|
| `0c0fb75` | PR #814 merge — auth hook lockdown |
| `3165efa` | PR #815 merge — security reconciliation |
| `9dc398d` | PR #816 merge — idempotency rollout |
| `86d7665` | PR #817 merge — dashboard RPC fix |

