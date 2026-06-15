# v0.1 — Live Migration Reconciliation Status

> Historical snapshot — verify against `docs/ai/CURRENT_EXECUTION_CONTEXT.md` before acting.

**Last updated:** 2026-06-15
**Session 2 merge commit:** `86d7665ed90e` (PR #817)  
**Status:** ACTIVE — v0.1 item 4 has a live-verified payment RPC blocker pending deployment and end-to-end browser QA

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

## Critical Bugs

### 1. Dashboard Load Failure — FIXED ✅
**Root cause:** `dashboardService.ts` called `rpt_financial_summary({month, year})` but live function signature is `(p_from date, p_to date)`.

**Fix:** PR #817
- Compute `p_from`/`p_to` ISO dates from month+year
- Map response fields: `collected` → `total_collected`, `expenses` → `total_expenses`, `net` → `net_revenue`, `overdue_amount` → `total_overdue_invoices`
- Update `database.ts` type definition

**Expected result:** Dashboard loads correctly. Data shows 0s until real data is added.

### 2. Payment Recording — BLOCKING ⛔
**Root cause:** `record_invoice_payment_atomic` exists on live, but it calls `find_payment_account_id(text)`, which cast `public.accounts.id` to `uuid`. The live chart of accounts stores text account codes such as `1111` and `1201`, so payment recording fails before receipt/allocation posting.

**Live evidence:** On 2026-06-15, read-only execution against `nnggcnpcuomwfuupupwg` of `select public.find_payment_account_id('cash'), public.find_payment_account_id('receivable')` failed with `22P02 invalid input syntax for type uuid: "1000"`.

**Repository fix candidate:** migration `20260615000100_fix_invoice_payment_account_resolution.sql` replaces `find_payment_account_id(text)` with a text-returning implementation that resolves the configured cash and receivable accounts by chart-of-accounts codes `1111` and `1201`, then recreates `record_invoice_payment_atomic(jsonb)` with text account IDs for journal posting.

**Remaining required evidence:** deploy the latest migration to the intended live project, rerun the `find_payment_account_id('cash'/'receivable')` verification query until it returns without error, then complete browser/manual payment QA: create contract → invoice → record payment → verify receipt, allocation, and invoice status.

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

#### 2026-06-09 execution attempt
- Reached `https://rentrix-alpha.vercel.app/login` successfully in browser.
- Login page renders in Arabic RTL with email/password fields and submit action visible.
- Browser console reports: `Supabase environment is incomplete. Runtime diagnostics will be shown in UI.`
- This matches repository runtime behavior in `artifacts/rentrix/src/lib/env.ts` and `artifacts/rentrix/src/integrations/supabase/client.ts`: when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing or placeholder-valued, the app falls back to invalid Supabase settings.
- Result: authenticated operational QA is currently blocked by deployment configuration before route-level validation can begin.
- Additional blocker: the required manual Custom Access Token hook registration above is still not verified from repository-side evidence.

#### Updated next action for Item 5
1. Set valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on the deployed Vercel environment serving `rentrix-alpha.vercel.app`.
2. Redeploy and confirm the browser console no longer reports incomplete Supabase environment.
3. Register `pg-functions://postgres/public/custom_access_token_hook` in Supabase Dashboard.
4. Re-run the full authenticated browser/manual QA checklist with approved ADMIN credentials.

#### 2026-06-14 verification — deployment env config resolved

- Fetched `https://rentrix-alpha.vercel.app/login` (HTTP 200) via the Vercel deployment-fetch tool. The page now serves the production bundle `assets/index-CIMhMMfD.js`.
- Inspected the served bundle: it embeds `https://nnggcnpcuomwfuupupwg.supabase.co` (the intended live RENTRIX EGY project ref) and the matching `anon` JWT (`ref: nnggcnpcuomwfuupupwg`, `role: anon`). The only other Supabase host string present is the harmless `example.supabase.co` placeholder constant from `src/lib/env.ts`, which is not used at runtime when real values are configured.
- This confirms `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are now set correctly on the Vercel production environment and a build has been deployed with them (`latestDeployment` on the Vercel project is `READY`, target `production`). **Updated next action for Item 5, sub-step 1–2 are resolved** — the prior "Supabase environment is incomplete" console state from 2026-06-09 no longer applies to the deployed bundle.
- Remaining blocker for Item 5 sub-step 3: registration of `pg-functions://postgres/public/custom_access_token_hook` as the project's Custom Access Token Auth Hook cannot be verified from repository-side evidence or the available Supabase MCP tools (no config/hooks read API exposed). `public.custom_access_token_hook` exists in the live database (verified via SQL), but whether Supabase Auth is configured to *call* it requires Dashboard or Management-API access (`api.supabase.com`), which is outside the current connector/network allowlist.
- Full authenticated browser/manual QA (sub-step 4) remains blocked by lack of a browser-driving tool with form-submission/cookie support against `rentrix-alpha.vercel.app` in this environment; `web_fetch_vercel_url` performs unauthenticated GET only.

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
