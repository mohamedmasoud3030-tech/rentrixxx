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

Latest roadmap merge recorded at this refresh: `564c4ce docs: prepare v0.5 commercial hardening (#924)`.

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

```text
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

### Final delivery gates still open

- **Custom Access Token Hook registration:** `DONE` by owner confirmation. It is not a current repo-stabilization blocker.
- **Authenticated ADMIN browser QA:** `FINAL DELIVERY GATE — BLOCKED`. Repo-only evidence is strong, but live operator browser evidence is unavailable. Evidence is recorded in `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`.
- **Production GO/NO-GO:** `BLOCKED`. B-1 live operator browser session, B-2 payment-to-receipt E2E live, B-3 mobile/physical-device print QA, and B-4 live write/RLS confirmation remain open until a human operator supplies evidence.

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
- General CRM expansion.
- Advanced owner settlements and payout workflows.
- Advanced automation and governance.
- External provider sends.
- Property map.
- Smart assistant expansion.
- General accounting ledger.
- Shared-database SaaS multi-tenancy.

Current expansion guidance: `/lands`, `/leads`, `/commissions`, and `/communication` are approved active routes. Current code shows them in desktop navigation with permission guards and registered protected TanStack routes. `/communication` is an internal log only; do not send WhatsApp/SMS/email from the browser without a separate safe provider boundary.

## Current Delivery Gates and Repo Stabilization Status

Do not claim production readiness until the final delivery gates close with fresh evidence:

- ~~Live Supabase migration-state reconciliation~~ **✅ حُلَّت** — 101 migrations، repo = DB perfect match (PR #910, PR #911).
- Custom Access Token Hook registration is **DONE** by owner confirmation and is not a current repo-stabilization blocker.
- Authenticated ADMIN browser/manual QA is a **FINAL DELIVERY GATE — BLOCKED** and is tracked in `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`.
- Production GO/NO-GO is **BLOCKED** until B-1/B-2/B-3/B-4 live evidence closes.
- ~~`find_payment_account_id(text)` account-resolution~~ **✅ حُلَّت** — `cash=1111`, `receivable=1201` مؤكَّدان live (PR #896, PR #910).
- ~~`void_receipt_atomic` PGRST202 mismatch~~ **✅ حُلَّت** — overload `(jsonb)` مضافة (PR #910). Frontend لا يحتاج تغييراً.
- ~~`post_receipt_atomic` callable by authenticated~~ **✅ حُلَّت** — REVOKE authenticated (PR #911).
- ~~`financial_operation_idempotency` grants/RLS gap~~ **✅ حُلَّت** — policy `false` + SECURITY DEFINER functions تكتب عبر postgres ✅.
- Canonical balance-model behavior: invoice outstanding, arrears, reports, receipt projection, and payment posting are consistent in repository evidence; full E2E verification under authenticated session remains blocked by missing live operator evidence.
- Reports/KPI definitions documented in `docs/ai/REPORTING_DEFINITIONS.md`; metric validation against live data pending.
- Print/PDF readiness documented in `docs/ai/PRINT_AND_EXPORT_READINESS.md`; invoice PDF, expense PDF, contract PDF, Reports CSV filename/BOM, and receipt browser print are implemented in repo evidence. Dedicated generated receipt PDF and mobile/physical-device print QA remain open.
- Repo/docs stabilization, blocked final-delivery evidence, and v0.5 prep docs are merged through PR #924; full production readiness is not claimed before final delivery QA.

## Incomplete / Planned / Deferred Work

| Item | Status | Current note |
| --- | --- | --- |
| Authenticated ADMIN browser QA | `FINAL DELIVERY GATE — BLOCKED` | Required during final handover; tracked in `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`. |
| Production GO/NO-GO | `BLOCKED` | Pending final handover QA evidence for B-1/B-2/B-3/B-4. |
| Mobile/physical-device print QA | `FINAL DELIVERY GATE — BLOCKED` | Required before full production-readiness claims. |
| Commercial hardening v0.5 | `PLANNED / REPO-ONLY PREP` | Preparation tracked in `docs/ai/V05_COMMERCIAL_HARDENING_PREP.md`; does not imply Production GO. |
| v1.0 commercial release | `PLANNED` | Depends on final delivery QA and commercial hardening. |
| External communication sending | `OUT OF SCOPE` | `/communication` is an internal log only. |
| General accounting ledger | `OUT OF SCOPE` | `/accounting` remains a redirect to `/financials`. |
| Owner settlement/payout workflow | `NEEDS OWNER DECISION` | Future owner decision; do not add in stabilization. |
| Tax finality/accounting-grade tax treatment | `OUT OF SCOPE` | Requires approved accounting requirements. |
| Dedicated generated receipt PDF file | `PLANNED` | Current receipt support is browser print only. |
| Reports PDF export | `DEFERRED` | Current reports export CSV. |
| Owner statements/settlement documents | `DEFERRED` | Depends on owner settlement decision. |
| SaaS multi-tenancy | `OUT OF SCOPE` | Single-office boundary remains. |

## Current Next PR Order

1. Keep live final-delivery QA parked as BLOCKED until a human operator supplies B-1/B-2/B-3/B-4 evidence.
2. Continue v0.5 commercial hardening as repo-only planning/runbook work until live QA evidence allows a production GO/NO-GO update.
3. If final delivery QA later reveals bugs, open narrow fix PRs per bug, no bundled changes.

Do not open new DB/migration PRs without a confirmed repo or QA bug — the DB layer is treated as stable from current repository evidence.

## Latest Repository-Only Code-Reality Audit

The repo-only gap audit for documentation versus active code as of `main@7bff142` was removed from active docs and remains available through git history. It did not use live Supabase, live Vercel, credentials, migrations, or production data.

The 2026-06-16 repo-only Supabase Security Advisor remediation audit and migration proposal was removed from active docs and remains available through git history. It classified the four advisor-listed financial SECURITY DEFINER functions as browser-facing facades that must keep `authenticated` EXECUTE unless app architecture changes, identified `v_balance_reconciliation` as the main valid migration candidate via `security_invoker=true`, treated Leaked Password Protection as a dashboard setting, and included verification queries plus rollback SQL. No live Supabase changes were made.

High-level classification:

- Implemented and repository-verified: auth shell and login service, dashboard snapshot, properties, units, people, tenants, owners, contracts, invoices, payment RPC facade, payment-backed receipts, arrears, reports CSV, settings, change password, maintenance, audit log, data integrity, system governance, route/sidebar/mobile navigation, Supabase client configuration guard, PWA build configuration, and CI test wiring.
- Partially implemented or repo-only verified: Arabic RTL/mobile/PWA/offline behavior, print/PDF output, reports/KPI definitions, balance projections, and browser payment-to-receipt flow; these still require authenticated browser and device/operator evidence before production-readiness claims.
- Implemented and visible with permission guards in the active app: `/lands`, `/leads`, `/commissions`, and `/communication`; these routes should no longer be described as hidden, pending, or unavailable pages.
- Missing or intentionally not exposed in active UI: reports PDF export, dedicated generated receipt PDF, owner-settlement statements, external communication sends, general ledger/accounting screens, and SaaS/multi-tenant behavior.
- Blocked / unsafe to touch now: live Supabase/Vercel mutations, new DB/migration work without a confirmed bug, and product expansion beyond the single-office path.

Recommended final delivery phase remains blocked: record authenticated ADMIN browser QA, payment-to-receipt E2E evidence, RTL/mobile/PWA/print smoke evidence, and GO/NO-GO status only when a human operator can supply live evidence. Do not start random feature PRs before that evidence phase.

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
- Do not add stale historical reports back into active docs. Summarize current facts here or in the relevant active source-of-truth doc, and rely on git history for old reports unless a future cleanup policy explicitly restores a tiny index.
- Keep visible navigation bounded to approved operational and governance surfaces.
- Keep every shipped route reachable and working. Previously deferred planned routes are approved for implementation, but external provider sends, owner-settlement payouts, broad accounting, and SaaS multi-tenancy remain out of scope.
- Preserve Arabic-first, mobile-first, RTL behavior and English/LTR sanity.
- Use `rg` and `rg --files` for searches.
- Preserve dirty worktrees and keep each PR narrow.
- Report exact blockers instead of guessing.
- **DB layer is now stable** — do not open new migration PRs without a confirmed new bug or schema gap.
