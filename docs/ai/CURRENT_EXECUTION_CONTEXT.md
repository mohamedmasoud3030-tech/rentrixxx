# Rentrix Current Execution Context

This is the single current execution source of truth for agents. Read this file immediately after `AGENTS.md` and before `README.md`, `docs/ai/ONBOARDING.md`, `docs/RENTRIX_MASTER_PLAN.md`, old audits, old reports, or implementation files.

If this file conflicts with older reports, status snapshots, recovery notes, or historical pull-request summaries, treat this file as current guidance and verify the disputed fact against active code, migrations, and fresh environment evidence before acting.

## Current Product Scope

Rentrix is a focused, Arabic-first, mobile-first property operations system for one real-estate office. English and LTR behavior must remain safe.

The active runtime architecture is:

- `artifacts/rentrix/` active React application.
- TanStack Router.
- React Query.
- Supabase direct-client data access.
- PWA-capable frontend.
- Arabic RTL as the first-class experience with English/LTR sanity.

Rentrix is explicitly not a shared-database SaaS product. Do not add organizations, memberships, invitations, subscriptions, organization-scoped runtime behavior, or SaaS multi-tenancy during stabilization or first-client delivery.

Rentrix is also not approved for a general accounting ledger during stabilization. `/accounting` is a redirect to `/financials`; it is not permission to build a balance sheet, accounting-grade P&L, journal-entry UI, or broad ledger module.

## Latest Merged Work Verified

Current local history verified on `main` at `feae86b fix(db): reconcile migration chain + void_receipt_atomic + type cast fixes (#910)`.

### ✅ مُنجز ومُطبَّق — live DB `nnggcnpcuomwfuupupwg`

| PR / Migration | التغيير | الحالة |
|---|---|---|
| PR #896 `20260615000100` | `find_payment_account_id`: `cash=1111`, `receivable=1201` | ✅ مؤكَّد live |
| PR #901 | تاريخ محلي في الـ UI بدلاً من UTC | ✅ |
| PR #892 `20260614140000` | triggers unit status على INSERT+UPDATE+DELETE | ✅ مؤكَّد live |
| PR #892 `20260614140100` | `update_owner_balance_on_expense`: إزالة `ACTIVE` filter | ✅ مؤكَّد live |
| PR #892 `20260614140200` | cleanup: duplicate triggers/FKs + missing indexes | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `renew_contract_atomic`: `bigint→now()` لـ `updated_at` | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `update_contract_balance_on_receipt_allocation`: `bigint→now()` | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `void_receipt_atomic(4-arg)`: `created_at bigint→to_timestamp()` | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `void_receipt_atomic(jsonb)`: wrapper جديد يطابق frontend `{ payload }` — أغلق PGRST202 | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `invoices/receipts/expenses.deleted_at`: `bigint→timestamptz` | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `v_balance_reconciliation`: أُعيد إنشاؤها | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `set_receipts_updated_at` / `set_invoices_updated_at` triggers | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `REVOKE anon` من `void_receipt_atomic` | ✅ |
| PR #911 `20260615000300` | harden function grants: `find_payment_account_id`, `post_receipt_atomic`, `void_receipt_atomic(4-arg)`, `recalculate_all_balances` — إزالة `anon`/`authenticated` من الـ internal functions | ✅ مؤكَّد live |
| PR #910 stubs | 11 remote-applied migration stubs لإصلاح CI chain gap | ✅ |
| PR #910 DB reg | 43 repo migrations مسجَّلة في `supabase_migrations` | ✅ |

**Live DB snapshot (2026-06-15):**
- `supabase_migrations` total: **100 migrations** ✅
- `invoices.deleted_at`: `timestamptz` ✅
- `receipts.deleted_at`: `timestamptz` ✅
- `expenses.deleted_at`: `timestamptz` ✅
- `void_receipt_atomic` overloads: **2** (jsonb + 4-arg) ✅
- `v_balance_reconciliation`: exists ✅
- `find_payment_account_id('cash')` = `1111` ✅
- `find_payment_account_id('receivable')` = `1201` ✅

### ما يزال غير مؤكَّد

- Custom Access Token Hook: موجود كـ DB function لكن لم يُؤكَّد تسجيله في Supabase Dashboard.
- Authenticated browser E2E QA: لم يُنفَّذ بعد على الـ deployed app.
- `financial_operation_idempotency` RLS: policy `false` للـ direct access — SECURITY DEFINER functions تكتب عبر postgres ✅. لا يحتاج تحقق إضافي.
- `record_invoice_payment_atomic` full posting flow: account resolution مؤكَّد، لكن E2E invoice→payment→receipt→allocation→idempotency لم يُختبر authenticated.

## Core MVP Systems

The current MVP execution path is the operational chain:

```text
Property -> Unit -> Contract -> Invoice -> Posted Payment -> Receipt
              \-> Tenant
Owner -> Property or owner-facing property context
Property -> Expense
Property -> Maintenance Record
```

Core systems that belong in the active constrained-beta and first-client path:

- Dashboard.
- Properties.
- Units.
- People.
- Owners.
- Tenants.
- Owners Hub.
- Contracts.
- Financials.
- Invoices.
- Receipts / payment recording.
- Expenses.
- Arrears.
- Reports.
- Maintenance.
- Settings and change password.
- Auth and permissions.
- Print/PDF for core documents.
- Authorized system governance.
- Authorized audit visibility.
- Authorized data-integrity visibility.

Domain invariants remain non-negotiable:

- A property owns units.
- A contract references exactly one unit and one tenant.
- A payment belongs to exactly one contract.
- Standalone payments are not allowed.
- A receipt is generated only from a posted payment.
- Active contracts for the same unit must not overlap.
- Orphan chains are not allowed.
- Posted payments are immutable.
- Corrections use reversal and replacement.
- Outstanding balance is derived through one canonical calculation path and is never manually edited.

## Deferred Systems

These systems are deferred unless a reviewed product decision and verified schema, RLS, UX, and tests approve them:

- Lands, except for controlled verification while hidden.
- Leads.
- Commissions.
- Communication.
- Communication / notifications.
- General CRM expansion.
- Advanced owner settlements and payout workflows.
- Advanced automation and governance.
- External provider sends.
- Property map.
- Smart assistant expansion.
- General accounting ledger.
- Shared-database SaaS multi-tenancy.

Current CRM guidance: `/lands`, `/leads`, `/commissions`, and `/communication` may remain registered for controlled verification, but they must stay hidden from visible constrained-beta navigation unless separately approved. Current evidence says leads, commissions, and communication do not have confirmed active schema support and should remain safe-unavailable.

## Current Production Blockers

Do not claim production readiness until these blockers are closed with fresh evidence:

- ~~Live Supabase migration-state reconciliation~~ **✅ حُلَّت** — 100 migrations مسجَّلة، 11 stub مضافة، chain متسقة (PR #910).
- Supabase default branch status has been recorded as `MIGRATIONS_FAILED`; it must be reconciled through the approved path before release closure.
- Preview-branch migration replay remains blocked by the migration reconciliation item and required access.
- Custom Access Token hook registration cannot be considered verified until Supabase Dashboard or Management API evidence confirms the hook registration.
- Authenticated browser/manual QA remains blocked until an operator or browser-driving capability verifies post-login runtime behavior.
- ~~The `find_payment_account_id(text)` account-resolution issue~~ — **✅ حُلَّت**: `find_payment_account_id('cash')` = `1111`, `find_payment_account_id('receivable')` = `1201`.
- `financial_operation_idempotency` live status is unresolved until table existence, grants, RLS, policies, duplicate-index cleanup, and browser-write denial are verified against the intended environment.
- ~~`void_receipt_atomic` PGRST202 mismatch~~ **✅ حُلَّت** — overload `(jsonb)` مضافة (PR #910). الـ frontend لا يحتاج تغييراً.
- Payments vs receipts source-of-truth: receipt identifiers تبقى payment-backed (`payment_id`) حتى يُراجَع بشكل منفصل.
- Canonical balance-model behavior remains unclosed until invoice outstanding, arrears, reports, receipt projection, payment posting, void/reversal behavior, and live RPC results are verified from one source-of-truth path.
- Reports/KPI definitions are now documented in `docs/ai/REPORTING_DEFINITIONS.md`, but metric ambiguity remains until product owners approve the definitions and live data validates the formulas.
- Print/PDF/export readiness is now documented in `docs/ai/PRINT_AND_EXPORT_READINESS.md`; missing templates and mobile print limitations remain release-readiness gaps, not hidden implementation assumptions.
- Final constrained-beta GO/NO-GO remains blocked until the full CI gate, migration/RPC/auth evidence, and browser/manual QA are complete.

## Current Next PR Order

For implementation after this documentation consolidation PR, use this order:

1. Apply or replay the payment-account repair only through the approved non-production or operator path, then verify `find_payment_account_id('cash')`, `find_payment_account_id('receivable')`, and `record_invoice_payment_atomic(jsonb)` behavior. This is the next safe implementation PR only if the environment path is approved and non-production evidence is available.
   - Operator checklist: confirm target project `nnggcnpcuomwfuupupwg`; export `supabase_migrations.schema_migrations`; compare the live list with sorted `supabase/migrations/`; replay through approved preview/staging when available; apply `20260615000100_fix_invoice_payment_account_resolution.sql` only after approval; run `select public.find_payment_account_id('cash'), public.find_payment_account_id('receivable');`; run one authenticated ADMIN/MANAGER payment through invoice -> payment -> internal receipt/allocation -> invoice status -> idempotency duplicate response; capture redacted evidence.
2. If live/preview access is not available, use `docs/v01/payments-receipts-source-of-truth-inventory.md` as the repository-only payment/receipt source-of-truth inventory. A follow-up test-only PR may add more contract coverage, but it must not touch Supabase, production, RPCs, RLS, or migrations. Current repo-side coverage includes the payment-backed receipt lookup test and the payment-account repair migration contract test.
3. Reconcile the canonical migration chain against the latest live migration inventory through read-only evidence.
4. Run preview-branch migration replay before any production mutation.
5. Complete auth, RLS, RPC, and idempotency least-privilege reconciliation with fresh environment evidence.
6. Complete authenticated browser/manual operational QA.
7. Run final constrained-beta release check and record GO/NO-GO.

Do not skip ahead to deferred CRM, SaaS, ledger, owner settlements, provider sends, or broad cleanup while these blockers remain open.

## Known Contradictions Requiring Verification

Resolve these contradictions by verifying current code, migrations, and environment evidence before acting:

- SaaS wording in old reports conflicts with the current single-office product decision. Current rule: single-office only, no shared-database SaaS multi-tenancy.
- Accounting module wording conflicts with the active `/accounting` redirect. Current rule: `/accounting` redirects to `/financials`; no general ledger is approved.
- CRM routes and table references conflict across older docs. Current rule: CRM-like routes are deferred; leads, commissions, and communication are safe-unavailable until schema/product decisions are verified.
- PR #890 fixed reports date handling only. Follow-up date cleanup may still be required in other areas; verify each date path before claiming global date correctness.
- `financial_operation_idempotency` appears in generated types and historical remediation notes, but live status is unresolved until verified against the intended environment.
- `find_payment_account_id(text)` vs accounts schema is unresolved until the intended environment proves the repair works with live account IDs/codes.
- Payments vs receipts source of truth remains unresolved until the frontend receipt projection, payment RPCs, internal receipt/allocation tables, and receipt route identifiers are reviewed together.
- `lib/db` and `lib/api-client-react` are suspected orphan packages only. They are not deletion-approved without root-layout review, import/build verification, and a narrow cleanup PR.

## Rules for Future Agents

- Read `AGENTS.md`, then this file, then `README.md`, `docs/ai/ONBOARDING.md`, `docs/RENTRIX_MASTER_PLAN.md`, `docs/ai/AGENT_CAPABILITIES.md`, and `docs/ai/GIT_TOOLING_POLICY.md`.
- Treat active code and migrations as source of truth, but do not mutate Supabase, Vercel, production, migrations, RLS, RPCs, or auth configuration without explicit scope and approval.
- Do not create loose root reports. Put current execution guidance in this file, roadmap sequencing in `docs/RENTRIX_MASTER_PLAN.md`, dated snapshots under the appropriate docs subfolder, and stable decisions under `docs/decisions/`.
- Do not change application code in documentation-consolidation PRs.
- Do not reintroduce `react-router-dom`, legacy `useApp`, `AppContext`, `dataService`, local database flows, or backup/legacy runtime code.
- Do not delete historical docs merely because they are stale. Mark them historical, summarize current facts here, and delete only in a separate safe cleanup PR when clearly approved.
- Keep visible navigation bounded to approved operational and governance surfaces.
- Keep deferred routes hidden unless an explicit product decision and verification evidence approve re-exposure.
- Preserve Arabic-first, mobile-first, RTL behavior and English/LTR sanity.
- Use `rg` and `rg --files` for searches.
- Preserve dirty worktrees and keep each PR narrow.
- Report exact blockers instead of guessing.
