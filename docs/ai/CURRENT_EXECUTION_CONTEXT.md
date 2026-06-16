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

Current `main` HEAD: `7bff142 fix(ui): add UTF-8 BOM and date-stamped filenames to Reports CSV exports (#913)`.

### ✅ مُنجز ومُطبَّق — live DB `nnggcnpcuomwfuupupwg`

| PR / Migration | التغيير | الحالة |
|---|---|---|
| PR #896 `20260615000100` | `find_payment_account_id`: `cash=1111`, `receivable=1201` — حلّ `22P02` | ✅ مؤكَّد live |
| PR #901 | تاريخ محلي في الـ UI بدلاً من UTC `toISOString()` | ✅ |
| PR #892 `20260614140000` | triggers unit status على INSERT+UPDATE+DELETE على contracts وmaintenance | ✅ مؤكَّد live |
| PR #892 `20260614140100` | `update_owner_balance_on_expense`: إزالة `c.status='ACTIVE'` — lifetime totals تشمل ENDED contracts | ✅ مؤكَّد live |
| PR #892 `20260614140200` | cleanup: duplicate triggers/FKs + missing FK indexes | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `renew_contract_atomic`: `bigint→now()` لـ `contracts.updated_at` | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `update_contract_balance_on_receipt_allocation`: `bigint→now()` | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `void_receipt_atomic(4-arg)`: `journal_entries.created_at bigint→to_timestamp()` | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `void_receipt_atomic(jsonb)`: wrapper جديد يطابق frontend `{ payload }` — أغلق PGRST202 | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `invoices/receipts/expenses.deleted_at`: `bigint→timestamptz` | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `v_balance_reconciliation`: أُعيد إنشاؤها بعد type fix | ✅ مؤكَّد live |
| PR #910 `20260615000200` | `set_receipts_updated_at` / `set_invoices_updated_at` triggers | ✅ مؤكَّد live |
| PR #910 stubs | 11 remote-applied migration stubs لإصلاح CI chain gap | ✅ |
| PR #910 DB reg | 43 repo migrations مسجَّلة في `supabase_migrations` (كانت موجودة لكن غير مسجَّلة) | ✅ |
| PR #911 `20260615000300` | `find_payment_account_id`: REVOKE anon — internal helper فقط | ✅ مؤكَّد live |
| PR #911 `20260615000300` | `void_receipt_atomic(4-arg)`: REVOKE authenticated — internal impl, (jsonb) هو الـ public API | ✅ مؤكَّد live |
| PR #911 `20260615000300` | `post_receipt_atomic`: REVOKE authenticated — يمنع bypass الـ invoice validation + idempotency | ✅ مؤكَّد live |
| PR #911 `20260615000300` | `recalculate_all_balances`: REVOKE anon — admin maintenance فقط | ✅ مؤكَّد live |
| PR #909 tests | `receiptService.test.ts` + `useReceipts.test.ts` — void-receipt contract tests | ✅ |
| PR #913 | Reports CSV filenames use local-date suffixes and exports include UTF-8 BOM for Excel/Arabic compatibility | ✅ merged |

**Live DB snapshot (2026-06-15) — verified:**

```
total migrations:                     101 (repo = DB — perfect match) ✅
invoices.deleted_at:                  timestamptz ✅
receipts.deleted_at:                  timestamptz ✅
expenses.deleted_at:                  timestamptz ✅
void_receipt_atomic overloads:        2 (jsonb wrapper + 4-arg impl) ✅
v_balance_reconciliation:             exists ✅
find_payment_account_id('cash'):      '1111' ✅
find_payment_account_id('receivable'): '1201' ✅
post_receipt_atomic grantees:         postgres, service_role only ✅
void_receipt_atomic(4-arg) grantees:  postgres, service_role only ✅
void_receipt_atomic(jsonb) grantees:  authenticated, postgres, service_role ✅
financial_operation_idempotency RLS:  policy=false (internal only via SECURITY DEFINER) ✅
```

**Function grant matrix (final):**

| Function | authenticated | anon | notes |
|---|---|---|---|
| `record_invoice_payment_atomic(jsonb)` | ✅ EXECUTE | ❌ | browser-facing |
| `void_receipt_atomic(jsonb)` | ✅ EXECUTE | ❌ | browser-facing wrapper |
| `void_receipt_atomic(4-arg)` | ❌ | ❌ | internal impl only |
| `post_receipt_atomic(jsonb)` | ❌ | ❌ | internal — called by record_invoice_payment_atomic |
| `find_payment_account_id(text)` | ❌ | ❌ | internal helper |
| `recalculate_all_balances()` | ✅ EXECUTE | ❌ | admin maintenance |
| `renew_contract_atomic(uuid, jsonb)` | ✅ EXECUTE | ❌ | browser-facing |
| `generate_invoices_from_active_contracts()` | ✅ EXECUTE | ❌ | browser-facing |

### ما يزال غير مؤكَّد

- **Custom Access Token Hook registration**: الدالة `public.custom_access_token_hook` موجودة في الـ DB ✅، لكن تسجيلها في Supabase Dashboard → Authentication → Hooks لم يُؤكَّد بـ Dashboard/Management-API evidence. بدونه: JWT لن يحتوي `app_metadata.user_role` → كل protected routes ستظهر unauthorized.
- **Authenticated browser E2E QA**: لم يُنفَّذ بعد. الـ deployment يخدم `nnggcnpcuomwfuupupwg` بشكل صحيح (مؤكَّد 2026-06-14)، لكن لا يوجد tool يقدر يعمل form-submission authenticated.
- **`record_invoice_payment_atomic` full E2E**: account resolution مؤكَّد (`1111`/`1201`) لكن الـ flow الكامل invoice→payment→receipt→allocation→idempotency لم يُختبر بـ authenticated session.

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

## Approved Product Expansion Systems

The June 2026 product decision approves the previously deferred planned modules for implementation in the single-office Rentrix product:

- Lands.
- Leads.
- Commissions.
- Internal communication log.

These modules must be real working routes when shipped: no placeholder, coming-soon, unavailable, or hidden dead-route states. They remain inside the single-office product boundary and must not introduce SaaS multi-tenancy, organizations, subscriptions, a broad accounting ledger, or external provider sends.

Systems that remain deferred or out of shipped navigation unless separately approved:

- External communication / notification sends.
- Communication / notifications.
- General CRM expansion.
- Advanced owner settlements and payout workflows.
- Advanced automation and governance.
- External provider sends.
- Property map.
- Smart assistant expansion.
- General accounting ledger.
- Shared-database SaaS multi-tenancy.

Current expansion guidance: `/lands`, `/leads`, `/commissions`, and `/communication` are approved active routes. They must be reachable from desktop navigation and the mobile drawer, and must include schema/RLS evidence, service hooks, working list/form flows, Arabic validation/error states, and tests. `/communication` is an internal log only; do not send WhatsApp/SMS/email from the browser without a separate safe provider boundary.

## Current Production Blockers

Do not claim production readiness until these blockers are closed with fresh evidence:

- ~~Live Supabase migration-state reconciliation~~ **✅ حُلَّت** — 101 migrations، repo = DB perfect match (PR #910, PR #911).
- Supabase default branch status was recorded as `MIGRATIONS_FAILED`; must be reconciled through the approved path before release closure. Current live project is ACTIVE_HEALTHY but branch status has not been re-verified via Management API.
- Preview-branch migration replay remains blocked by approved preview access.
- **Custom Access Token Hook**: `public.custom_access_token_hook` exists in DB ✅ but Dashboard registration is unverified. Manual step required: Supabase Dashboard → Authentication → Hooks → Custom Access Token → `pg-functions://postgres/public/custom_access_token_hook`.
- Authenticated browser/manual QA remains blocked until an operator verifies post-login runtime behavior.
- ~~`find_payment_account_id(text)` account-resolution~~ **✅ حُلَّت** — `cash=1111`, `receivable=1201` مؤكَّدان live (PR #896, PR #910).
- ~~`void_receipt_atomic` PGRST202 mismatch~~ **✅ حُلَّت** — overload `(jsonb)` مضافة (PR #910). Frontend لا يحتاج تغييراً.
- ~~`post_receipt_atomic` callable by authenticated~~ **✅ حُلَّت** — REVOKE authenticated (PR #911).
- ~~`financial_operation_idempotency` grants/RLS gap~~ **✅ حُلَّت** — policy `false` + SECURITY DEFINER functions تكتب عبر postgres ✅.
- Canonical balance-model behavior: invoice outstanding, arrears, reports, receipt projection, and payment posting are consistent; full E2E verification under authenticated session remains pending.
- Reports/KPI definitions documented in `docs/ai/REPORTING_DEFINITIONS.md`; metric validation against live data pending.
- Print/PDF readiness documented in `docs/ai/PRINT_AND_EXPORT_READINESS.md`; Reports CSV filename/BOM polish is covered, and remaining print/PDF gaps remain release-readiness items.
- Final constrained-beta GO/NO-GO blocked until Custom Access Token Hook + authenticated browser QA are verified.

## Current Next PR Order

For implementation after PR #913 and the repository-only code-reality audit:

1. **Manual only — no PR needed**: Register Custom Access Token Hook in Supabase Dashboard → Authentication → Hooks → `pg-functions://postgres/public/custom_access_token_hook`. Verify JWT contains `app_metadata.user_role` after login.
2. **Manual only**: Run authenticated browser QA on `rentrix-alpha.vercel.app` — login as ADMIN, verify dashboard, contracts, payment recording, receipt generation, arrears, reports, RTL layout, mobile navigation.
3. If QA passes: record GO evidence and close v0.1 constrained-beta.
4. If QA reveals bugs: open narrow fix PRs per bug, no bundled changes.

Do not open new DB/migration PRs while these manual blockers remain unresolved — the DB layer is verified stable.

## Latest Repository-Only Code-Reality Audit

`docs/archive/ai/CODE_REALITY_GAP_AUDIT.md` is an archived repo-only gap audit for documentation versus active code as of `main@7bff142`. It did not use live Supabase, live Vercel, credentials, migrations, or production data.

`docs/archive/ai/SUPABASE_SECURITY_ADVISOR_REMEDIATION.md` records the archived 2026-06-16 repo-only Supabase Security Advisor remediation audit and migration proposal. It classifies the four advisor-listed financial SECURITY DEFINER functions as browser-facing facades that must keep `authenticated` EXECUTE unless app architecture changes, identifies `v_balance_reconciliation` as the main valid migration candidate via `security_invoker=true`, treats Leaked Password Protection as a dashboard setting, and includes verification queries plus rollback SQL. No live Supabase changes were made.

High-level classification:

- Implemented and repository-verified: auth shell and login service, dashboard snapshot, properties, units, people, tenants, owners, contracts, invoices, payment RPC facade, payment-backed receipts, arrears, reports CSV, settings, change password, maintenance, audit log, data integrity, system governance, route/sidebar/mobile navigation, Supabase client configuration guard, PWA build configuration, and CI test wiring.
- Partially implemented or repo-only verified: Arabic RTL/mobile/PWA/offline behavior, print/PDF output, reports/KPI definitions, balance projections, and browser payment-to-receipt flow; these still require authenticated browser and device/operator evidence before production-readiness claims.
- Approved for implementation in the active product-expansion phase: `/lands`, `/leads`, `/commissions`, and `/communication`; these routes should no longer ship as hidden or unavailable pages.
- Documented but missing or unverified in active UI: dedicated invoice PDF/print action, expense PDF action, reports PDF export, dedicated generated receipt PDF, owner-settlement statements, external communication sends, general ledger/accounting screens, and SaaS/multi-tenant behavior.
- Blocked / unsafe to touch now: live hook registration verification, authenticated browser QA, preview migration replay, live Supabase/Vercel mutations, new DB/migration work without a confirmed bug, and product expansion beyond the single-office constrained-beta path.

Recommended next implementation phase after manual blockers clear: a single `v0.1 release-evidence closure` phase that records hook-registration proof, authenticated browser QA, payment-to-receipt E2E evidence, RTL/mobile/PWA/print smoke evidence, and GO/NO-GO status. Do not start random feature PRs before that evidence phase.

## Known Contradictions Resolved

- ~~SaaS wording~~ — single-office only confirmed.
- ~~`/accounting` redirect~~ — confirmed redirect to `/financials`; no general ledger.
- ~~`find_payment_account_id` vs accounts schema~~ — **✅ حُلَّت** PR #896 + PR #910.
- ~~`void_receipt_atomic` PGRST202~~ — **✅ حُلَّت** PR #910.
- ~~`post_receipt_atomic` accessible by authenticated~~ — **✅ حُلَّت** PR #911.
- ~~migration chain gap (repo vs DB)~~ — **✅ حُلَّت** PR #910 (101 = 101).
- Payments vs receipts source of truth: receipt identifiers remain payment-backed (`payment_id`) until a reviewed migration and frontend cutover exist. Do not switch to internal ledger `receipt_id`.
- `lib/db` and `lib/api-client-react` are suspected orphan packages — not deletion-approved without import/build verification.

## Rules for Future Agents

- Read `AGENTS.md`, then this file, then `README.md`, `docs/ai/ONBOARDING.md`, `docs/RENTRIX_MASTER_PLAN.md`, `docs/ai/AGENT_CAPABILITIES.md`, and `docs/ai/GIT_TOOLING_POLICY.md`.
- Treat active code and migrations as source of truth, but do not mutate Supabase, Vercel, production, migrations, RLS, RPCs, or auth configuration without explicit scope and approval.
- Do not create loose root reports. Put current execution guidance in this file, roadmap sequencing in `docs/RENTRIX_MASTER_PLAN.md`, dated snapshots under the appropriate docs subfolder, and stable decisions under `docs/decisions/`.
- Do not change application code in documentation-consolidation PRs.
- Do not reintroduce `react-router-dom`, legacy `useApp`, `AppContext`, `dataService`, local database flows, or backup/legacy runtime code.
- Do not delete historical docs merely because they are stale. Mark them historical, summarize current facts here, and delete only in a separate safe cleanup PR when clearly approved.
- Keep visible navigation bounded to approved operational and governance surfaces.
- Keep every shipped route reachable and working. Previously deferred planned routes are approved for implementation, but external provider sends, owner-settlement payouts, broad accounting, and SaaS multi-tenancy remain out of scope.
- Preserve Arabic-first, mobile-first, RTL behavior and English/LTR sanity.
- Use `rg` and `rg --files` for searches.
- Preserve dirty worktrees and keep each PR narrow.
- Report exact blockers instead of guessing.
- **DB layer is now stable** — do not open new migration PRs without a confirmed new bug or schema gap.
