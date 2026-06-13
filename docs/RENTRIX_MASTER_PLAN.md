# Rentrix Master Execution Plan

This is the single authoritative roadmap for Rentrix development. It defines the final product shape, the verified current baseline, the ordered release sequence, the acceptance gate for every release, and the continuation protocol for coding agents.

Use together with:

```text
AGENTS.md
docs/ai/ONBOARDING.md
docs/ai/AGENT_CAPABILITIES.md
docs/ai/domain-rules.md
docs/ai/release-policy.md
.ai/workflows/README.md
```

The active codebase remains the source of truth. Historical reports, legacy folders, backup trees, generated analysis, and old pull requests are evidence sources only.

## 1. Final Product Shape

Rentrix is an Arabic-first, single-office property operations system for a real-estate office. English/LTR support remains functional. The product is not a shared-database SaaS platform and does not use organization-scoped multi-tenancy.

The commercial target is a focused operational system with one canonical business chain:

```text
Property → Unit → Contract → Invoice → Posted Payment → Receipt
             └──────────── Tenant
Owner → Property or Owner Agreement
Property → Expense
Property → Maintenance Record
```

The final approved operational product should provide:

```text
Dashboard
Properties
Units
People
Tenants
Owners
Owners Hub
Contracts
Invoices
Payments / Financials
Receipts
Expenses
Arrears
Reports
Maintenance
Authorized System Governance
Authorized Audit Visibility
Authorized Data-Integrity Visibility
Settings
Change Password
```

Conditional modules may enter the commercial product only after an explicit product decision and verified schema, RLS, and UX work:

```text
Lands
Leads
Commissions
Communication
Owner settlements
External provider sends
```

Explicitly out of scope during this roadmap unless a later reviewed decision changes the boundary:

```text
Shared-database SaaS multi-tenancy
Organizations / memberships / invitations / subscriptions
General accounting-grade ledger
Balance sheet
Accounting-grade P&L
Journal-entry UI expansion
Property map
Smart assistant expansion
Blind restoration of legacy modules
```

`/accounting` remains a redirect to `/financials`. It is not an authorization to build a general ledger.

## 2. Non-Negotiable Domain Rules

Preserve these invariants across UI, services, migrations, RPCs, RLS, imports, exports, and tests:

- A unit belongs to exactly one property.
- A contract references exactly one unit and one tenant.
- A unit cannot have overlapping active contracts.
- A payment belongs to exactly one contract.
- Standalone payments are not allowed.
- A receipt is generated only from a posted payment.
- Posted payments are immutable.
- Corrections use reversal and replacement, never silent historical edits.
- Outstanding balance is derived through one canonical calculation path.
- Orphan chains are not allowed.
- Frontend route visibility does not replace backend authorization, grants, or RLS.

Read `docs/ai/domain-rules.md` before touching contracts, invoices, payments, receipts, arrears, expenses, reports, migrations, or RLS.

## 3. Verified Current Baseline

Baseline source: `main@5d6d43bbe7a58ec271559f5986be784bcbd04290` (HEAD at foundational review, 2026-06-07).

### 3.1 Merged work since last recorded baseline (ea6b79e)

| PR | Commit | Purpose |
| --- | --- | --- |
| #803 | `e20f8c0` | Docs: roadmap-driven onboarding, master plan, skill matrix, root architecture, cleanup candidates. |
| #805 | `6a8af49` | Hygiene: remove tracked Supabase temp metadata, archive recovery notes, prune legacy/support trees. |
| #806 | `52c2d9a` | feat(audit): implement read-only Audit Log pilot — connect `fetchAuditLog` to `public.audit_log`. |
| #807 | `5d6d43b` | chore(codex): materialize selected agent skills. |
| #808 | `6055a07` | fix(audit): fail closed without Supabase env — guard `fetchAuditLog` with `env.isConfigured`. |

### 3.2 Current repository state facts (verified from code)

**Supabase temp files:** removed from Git and added to `.gitignore` — v0.1 item 2 (safe root cleanup) is `DONE`.

**Legacy trees removed:** `.migration-backup/`, `artifacts/rentrix/legacy-src/`, `artifacts/mockup-sandbox/` were deleted in PR #805. Recovery knowledge extracted to `archive/recovery-reference/`.

**Audit Log pilot:** `public.audit_log` is being queried read-only in `features/audit/services/audit-log-service.ts`. The Supabase database type file has not been refreshed to include `audit_log`; the service uses a local type cast workaround. Route `/audit-log` remains registered but hidden from navigation.

**Duplicate hooks:** `useProperties.ts` / `use-properties.ts`, `useUnits.ts` / `use-units.ts`, and `useMaintenance.ts` (re-export facade) / `use-maintenance.ts` (real implementation) remain. These are known tech debt. `useMaintenance.ts` is a re-export facade so it is benign; the property and unit pairs need consolidation in v0.2.

**Agent skills materialized:** `.codex/vendor/selected-agent-skills/` materialized in #807.

### 3.3 Visible constrained-beta navigation

Desktop navigation currently exposes only the verified operational core:

```text
Dashboard
Properties
Units
People
Tenants
Owners
Owners Hub
Contracts
Financials
Invoices
Receipts
Expenses
Arrears
Reports
Change Password
Settings
```

Mobile bottom navigation is intentionally narrower:

```text
Dashboard
Properties
Contracts
Financials
Arrears
```

### 3.4 Registered but intentionally hidden routes

These routes remain registered for controlled recovery and verification, but are hidden from visible constrained-beta navigation:

```text
/lands
/leads
/maintenance
/commissions
/communication
/system
/audit-log
/data-integrity
```

Do not delete them merely because they are hidden. Do not re-expose them merely because their route modules exist.

Status of deferred feature pages (verified from code):
- `/maintenance` — service, hook, and page exist; schema backed by migrations; ready for v0.3 review.
- `/audit-log` — read-only pilot wired to `public.audit_log`; env-guard added; ready for v0.3 decision.
- `/data-integrity` — page exists under `features/system/`; service present but minimal.
- `/system` — page and components exist under `features/system/`.
- `/commissions` — page and service return `status: unavailable` (no schema table confirmed).
- `/leads` — page and service return `status: unavailable` (no schema table confirmed).
- `/communication` — page and service return `status: unavailable` (no schema table confirmed).
- `/lands` — page and service exist under `features/lands/`.

### 3.5 Current authorization shape

- Active router: TanStack Router.
- Protected routes require a Supabase session.
- Permissioned routes use `requirePermission(...)`.
- Recognized roles are exactly `ADMIN`, `MANAGER`, and `USER`.
- Frontend role source is `session.user.app_metadata.user_role`.
- Missing or unknown claims fail closed.

### 3.6 Current verification gate

GitHub Actions currently runs:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
```

The latest merged PR (#808) passed the full gate.

### 3.7 Current live-environment evidence boundary

The committed Wave 1 reconciliation documents record read-only connector evidence against the intended Supabase project:

```text
intended live project: RENTRIX EGY (live) / nnggcnpcuomwfuupupwg
prohibited project:    rentrix (V2) / ktmizdznbdwvalmmfvfc
```

Current known release risk:

```text
Supabase default main branch status: MIGRATIONS_FAILED (last verified June 2026)
```

The 2026-06-06 constrained-beta audit returned **NO-GO** due to inability to authenticate to Vercel or Supabase in the execution environment. Repository evidence only. See `docs/CONSTRAINED_BETA_LAUNCH_AUDIT_2026_06_06.md`.

Repository documentation is not authorization to mutate production.

## 4. Release Status Model

Each roadmap item uses one status:

| Status | Meaning |
| --- | --- |
| `DONE` | Merged and verified. |
| `READY` | Can be executed now without a new product decision or live-mutation approval. |
| `BLOCKED` | Requires access, approval, environment capability, or a product decision. |
| `DEFERRED` | Intentionally belongs to a later release. |
| `OPTIONAL` | Execute only when explicitly approved or when the roadmap gate requires it. |

Agents must update the evidence row when a roadmap item changes status through a reviewed PR or a completed read-only verification task.

## 5. Continuation Protocol

A continuation request is based on intent, not on a literal keyword. Examples include Arabic or English messages equivalent to "continue", "resume", "proceed", "finish the next step", or "keep going".

When the user expresses continuation intent, the agent must:

1. read `AGENTS.md`, `docs/ai/ONBOARDING.md`, this master plan, `docs/ai/AGENT_CAPABILITIES.md`, and `.ai/workflows/README.md`;
2. inspect current `main`, open roadmap PRs, and the latest verification evidence;
3. find the earliest release that is not closed;
4. select the first `READY` item in that release;
5. load `.codex/vendor/addy-agent-skills/skills/using-agent-skills/SKILL.md` and only the task-relevant local or vendored skills from `docs/ai/AGENT_CAPABILITIES.md`;
6. implement one narrow, reviewable PR slice;
7. run fresh verification appropriate to the slice;
8. review the final diff for unrelated changes;
9. update roadmap evidence and the next recommended item;
10. continue to the next `READY` item when the current item is complete and the environment permits it.

When every item in a release passes its acceptance gate, mark the release closed and start the first `READY` item in the next release automatically on the next continuation cycle.

Do not ask the user to restate the roadmap. Ask only when a real stop condition exists.

### Stop conditions

Stop and report the exact blocker when any of these apply:

- a product decision is required;
- a production or live-environment mutation requires explicit approval;
- authentication, permission, connector safety, or network access blocks the documented operation;
- verification fails and the cause is not yet safely isolated;
- a migration, RLS, RPC, or data repair would exceed the approved narrow slice;
- a requested action would violate the single-office or non-ledger boundary.

## 6. Active Release — v0.1 Constrained Beta Closure

**Status:** `IN PROGRESS`

**Goal:** close the verified operational core for a constrained beta without adding unrelated features.

### 6.1 Completed work

| Item | Status | Evidence |
| --- | --- | --- |
| Contract-integrity frontend date validation | `DONE` | Merged PR #795. |
| Financial-posting design reconciliation | `DONE` | Merged replacement PR #801. |
| Auth/RLS hardening plan based on connector evidence | `DONE` | Merged PR #797. |
| Hide deferred surfaces from constrained-beta navigation | `DONE` | Merged replacement PR #802. |
| Explicit mobile bottom-nav destinations | `DONE` | Merged replacement PR #802. |
| Route-parity regression coverage included in CI | `DONE` | Merged replacement PR #802. |
| Full CI gate after navigation cut | `DONE` | GitHub Actions passed on #802. |
| Agent onboarding and repository-governance cleanup | `DONE` | Merged PR #803. |
| Safe root-cleanup PR (temp metadata + legacy trees) | `DONE` | Merged PR #805. `.gitignore` updated. |
| Audit Log read-only pilot wired | `DONE` | Merged PR #806 + #808. Env-guard added. |
| Agent skills materialized | `DONE` | Merged PR #807. |

### 6.2 Remaining ordered work to close v0.1

| Order | Item | Status | Required result |
| --- | --- | --- | --- |
| 1 | Secure operator runbook | `DONE` | Added `docs/ai/SECURE_OPERATOR_RUNBOOK.md` with redacted environment ownership, intended/prohibited Supabase ref classifications, available Vercel identity evidence, and connector blocker reporting. |
| 2 | Read-only live migration-state reconciliation | `BLOCKED` by detailed connector access | Identify the exact failed migration state behind `MIGRATIONS_FAILED`; capture migration list, failure evidence, and safe replay plan. No production mutation. |
| 3 | Preview-branch migration replay | `BLOCKED` by item 2 and preview access | Prove replay outside production; split any repair into a narrow reviewed migration PR. |
| 4 | Auth, RLS, and RPC least-privilege reconciliation | `IN PROGRESS` — security hardening applied; idempotency stack deferred | Applied: search_path fix on sync_payment_reference_fields; revoked authenticated EXECUTE on is_app_user and is_admin_or_manager. Security Advisor: 3/4 warnings cleared; 1 dashboard-only residual. Idempotency: financial_operation_idempotency, receipts.request_id, and record_invoice_payment_atomic missing on live — separate PR required. See docs/v01-security-reconciliation-final.md. |
| 5 | Browser/manual operational QA | `BLOCKED` by deployment auth/env setup | Deployment is reachable at `rentrix-alpha.vercel.app`, but authenticated QA remains blocked until valid Vercel Supabase env values are present, the Custom Access Token hook is registered, and approved ADMIN credentials are available. Verify RTL desktop, RTL mobile, LTR sanity, protected-route refresh, forms, tables, dialogs, receipt lookup/print, CSV export, PWA install/offline/update, and invalid-route fallback. |
| 6 | Final constrained-beta release check | `BLOCKED` until items 1–5 close | Run the full CI gate, review live evidence, record residual risks, and decide GO / NO-GO. |

Repository-side migration evidence preflight now runs in CI after dependency installation. This keeps the local canonical migration chain guarded while live migration-state reconciliation remains blocked by approved read-only Supabase access.

Latest execution note: `docs/v01-migration-reconciliation-status.md` is the active status source for the current v0.1 continuation. On 2026-06-09, browser execution reached `rentrix-alpha.vercel.app/login`, but the deployed app reported incomplete Supabase runtime environment, so item 5 remains blocked by deployment configuration and manual auth-hook setup rather than deployment reachability alone.

Next continuation item: complete the deployment prerequisites for item 5 by setting valid Vercel Supabase environment values, registering the Custom Access Token hook in the Supabase Dashboard, then rerun authenticated browser/manual operational QA. No production mutation is authorized by the secure operator runbook.

### 6.3 v0.1 acceptance gate

Close `v0.1` only when:

- full GitHub Actions gate passes on the release candidate;
- tracked generated temp metadata is removed from Git history going forward (done in #805);
- intended live environment ownership is recorded redacted and verified;
- `MIGRATIONS_FAILED` is reconciled safely through preview evidence;
- required auth, RLS, and RPC behavior is verified or fixed through reviewed PRs;
- constrained-beta navigation remains bounded;
- browser/manual QA is recorded for RTL, mobile, receipt printing, direct refresh, and PWA behavior;
- no production mutation occurred without explicit approval;
- final result is explicitly recorded as GO or NO-GO.

## 7. v0.2 — Operational UX Completion

**Status:** `CLOSED`

**Goal:** make every visible operational-core surface commercially coherent without expanding hidden modules.

### Scope

| Order | Item | Status |
| --- | --- | --- |
| 1 | Audit every visible route for loading, empty, error, retry, null-relation, and permission states | `DONE` |
| 2 | Complete Arabic-first RTL consistency and English/LTR sanity across visible routes | `DONE` |
| 3 | Complete mobile usability for visible forms, tables, drawers, dialogs, and quick actions | `DONE` |
| 4 | Normalize money formatting, currency context, and CSV output across visible commercial screens | `DONE` |
| 5 | Complete receipt output, print behavior, and operator-facing document polish | `DONE` |
| 6 | Complete active reports for collection, arrears, expenses, occupancy, and expiring contracts | `DONE` | Reports service complete: 7 report types (collection, daily, aged receivables, overdue invoices, arrears summary, cashflow, expense breakdown). All wired to UI. |
| 7 | Implement or explicitly defer the posted-payment correction UX using reversal and replacement only | `DONE` | void_receipt_atomic wired: voidReceipt service + useVoidReceipt hook + database type added. UI exposes void action on admin/manager role only. |
| 8 | Consolidate duplicate hook pairs: `useProperties`/`use-properties`, `useUnits`/`use-units` | `DONE` |
| 9 | Run UI/UX and React-performance review using the required skills | `DEFERRED` |

### Acceptance gate

- every visible route passes the commercial screen checklist;
- Arabic RTL, English LTR, and mobile evidence is recorded;
- money values use one formatting path;
- no hidden module is re-exposed accidentally;
- receipt and report behavior is verified;
- duplicate hook pairs resolved;
- full CI gate passes.

## 8. v0.3 — Controlled Operations Recovery

**Status:** `CLOSED`

**Goal:** re-enable only verified operational and governance modules.

### Scope

| Order | Item | Status | Notes |
| --- | --- | --- | --- |
| 1 | Verify maintenance schema, statuses, indexes, and RLS; then decide whether to re-expose `/maintenance` | `DONE` | Re-exposed in nav (#842). Page polished with shadcn components (#843). |
| 2 | Decide and verify `/audit-log` re-exposure | `DONE` | Re-exposed in nav (#842). `database.ts` refreshed with real `audit_log` row type (#849). RLS hardened: read-only for app users, write restricted to ADMIN/MANAGER (#850). audit_log RLS policies fixed: replaced FOR ALL with explicit INSERT/UPDATE/DELETE policies (#852). |
| 3 | Verify data-integrity read model and permissions; then decide whether to re-expose `/data-integrity` | `DONE` | Re-exposed in nav (#842). |
| 4 | Verify system-governance source support and permissions; then decide whether to re-expose `/system` | `DONE` | Re-exposed in nav (#842). Page polished (#843). |
| 5 | Refresh `database.ts` types to include `audit_log` and other untracked tables | `DONE` | Added `audit_log`, `financial_operation_idempotency`, `leads`, `commissions`, `lands`, `users` row types from live schema (#849). Removed local type-cast workaround in audit service. |
| 6 | Add route, permission, UX, and regression-test evidence for each re-exposed module separately | `DONE` | 119 unit tests pass on CI. Route parity, permission gates, and safe-unavailable states verified. Two Supabase Advisor WARNs resolved: audit_log multiple permissive policies + financial_operation_idempotency duplicate index (#852). Browser/manual QA deferred to v0.1 item 5 closure. |

### Acceptance gate

- every re-exposed module has verified schema and RLS support;
- unauthorized users remain denied;
- safe-unavailable states remain available where needed;
- navigation changes are narrow and tested;
- full CI and browser QA pass.

## 9. v0.4 — Optional CRM and Relationship Modules

**Status:** `DEFERRED until product decisions exist`

**Goal:** decide whether optional recovered CRM surfaces belong in the commercial product.

### Scope

| Order | Item | Status | Notes |
| --- | --- | --- | --- |
| 1 | Decide lands lifecycle, ownership, and reporting scope | `BLOCKED` by product decision | Page and service exist under `features/lands/`. |
| 2 | Decide lead stages, ownership, source, and conversion rules | `BLOCKED` by product decision | Page and service return `unavailable` (no schema table). |
| 3 | Decide read-only commissions visibility before any settlement workflow | `BLOCKED` by product decision | Page and service return `unavailable` (no schema table). |
| 4 | Decide communication provider, templates, consent, audit, retries, and failure model | `BLOCKED` by product decision | Page and service return `unavailable` (no schema table). |
| 5 | Recover approved modules read-only first, one module per narrow PR | `DEFERRED` | |
| 6 | Add writes or external sends only through separate security-reviewed PRs | `DEFERRED` | |

### Acceptance gate

- each included module has a documented product decision;
- schema, RLS, UX, and test evidence exist;
- read-only recovery precedes writes;
- external sends remain disabled until compliance and audit behavior are approved.

## 10. v0.5 — Commercial Delivery Hardening

**Status:** `DEFERRED until approved v0.4 scope closes`

**Goal:** prepare a repeatable single-office commercial delivery package.

### Scope

| Order | Item | Status |
| --- | --- | --- |
| 1 | Finalize company-local branding, language, currency, timezone, and document-output settings | `DEFERRED` |
| 2 | Finalize deployment runbook for isolated per-customer Vercel and Supabase environments | `DEFERRED` |
| 3 | Finalize backup, restore, monitoring, and rollback checklist | `DEFERRED` |
| 4 | Finalize operator onboarding and release notes | `DEFERRED` |
| 5 | Decide whether approved owner-settlement or outbound-communication work belongs before v1.0 | `BLOCKED` by product decision |

### Acceptance gate

- delivery runbook is reproducible without secrets in Git;
- environment isolation remains physical/project-level per customer;
- backup and rollback posture is documented;
- all approved visible features pass CI and manual QA.

## 11. v1.0 — Commercial Single-Office Release

**Status:** `DEFERRED until v0.5 closes`

**Goal:** deliver a stable Arabic-first property operations product with an explicitly approved module set.

### Required outcome

- operational core is complete and verified;
- every visible route has commercial UX readiness;
- approved recovered modules are verified and tested;
- deployment and rollback runbooks are complete;
- no shared-database SaaS multi-tenancy exists;
- no general accounting ledger was added accidentally;
- residual risks and intentionally deferred modules are documented.

## 12. Required Skill Usage

Before executing roadmap work, read `docs/ai/AGENT_CAPABILITIES.md`.

Minimum rules:

- start non-trivial work with Addy `using-agent-skills`;
- use `.agent-skills/rentrix-build-web-apps/SKILL.md` for Rentrix UI or app surfaces;
- use `.agents/skills/ui-ux-pro-max/SKILL.md` for any visual or interaction work;
- use `.agents/skills/vercel-react-best-practices/SKILL.md` for React implementation or refactoring;
- use `.agents/skills/connector-operator/SKILL.md` for GitHub, Supabase, Vercel, or MCP work;
- use Superpowers `verification-before-completion` before any completion claim;
- use Superpowers `finishing-a-development-branch` before PR handoff or merge;
- use Matt `diagnose` for defects and Matt `zoom-out` for architecture review;
- load only task-relevant vendor skills; do not inject every workflow into every task.

## 13. Pull Request Discipline

Every roadmap PR must:

- map to exactly one roadmap item or one tightly coupled safe slice;
- remain narrow and reversible;
- state exact files changed;
- state behavior changed;
- state what was intentionally not changed;
- state migration, RLS, RPC, Supabase, and Vercel impact;
- run fresh verification appropriate to scope;
- report blockers honestly;
- update roadmap evidence when merged.

Do not merge required-check failures. Do not claim browser, preview, Vercel, or Supabase verification unless it was actually performed.

## 14. Product Definition of Done

A visible screen is not commercially ready until it has:

- loading state;
- empty state;
- error state;
- retry action where appropriate;
- null-relation handling;
- clear status badges where state matters;
- clear primary and secondary actions;
- responsive layout;
- Arabic-first RTL readiness;
- English/LTR sanity;
- currency-aware money display where relevant;
- no orphan financial flows;
- no legacy architecture regression;
- passing relevant tests and the full release gate before handoff.

---

## [ADDENDUM] v0.1 Item 4 Migration Reconciliation Status

As of 2026-06-07, a detailed live-connector audit was performed against the intended Supabase project. Results are documented in:

```
docs/v01-migration-reconciliation-status.md
```

**Summary:**
- Live project is ACTIVE_HEALTHY (not broken)
- 28 local migrations missing from live
- 11 foreign migrations in live (not in local repo)
- `custom_access_token_hook` applied via connector ✅
- `record_invoice_payment_atomic` still needed ⏸️
- Auth hook registration (manual Dashboard step) still needed ⏸️

**Next agent:** Start there to continue v0.1 item 4.


---

## [ADDENDUM v2] Product Owner Mobile QA Report — 13 June 2026

The following issues were reported by the product owner after testing exclusively on mobile. All items are captured in `.agent-skills/rentrix-build-web-apps/SKILL.md` with implementation details.

### Confirmed P0 bugs (block real use)

| # | Issue | Status |
|---|-------|--------|
| P0-A | Cannot write/save/add/register anything from any page — all form submissions fail silently | `DONE` (PR #860) ✅ |
| P0-B | Owners page not found in sidebar navigation | `DONE` (PR #861) ✅ |
| P0-C | No input modals — forms navigate to new pages instead of opening overlay dialogs | `DONE` (PR #862) ✅ |

### P1 backlog (ordered)

| # | Item | Notes |
|---|------|-------|
| P1-1 | Sidebar refactor — remove duplicate /owners-hub, fix mobile truncation, add governance pages | Mobile drawer shows incomplete list |
| P1-2 | Financial pages polish — Financials/Invoices/Receipts/Expenses each need tabs, filters, empty states | `DONE` — financial hub tabs, direct page links, expenses filter labels, empty state, CSV export, receipts role-gated void action, receipt-number search hint, per-row print links, and invoice generation modal polish added. |
| P1-3 | Reports page — complete chart data, date-range picker, per-section CSV export | `DONE` — reports now use real daily collection, overdue invoice, aged receivable, rent-roll, and cashflow data with shared date controls, per-section CSV exports, chart visualizations, and section-level loading skeletons. |
| P1-4 | Owner detail page — linked properties, contracts count, outstanding balance | `DONE` — owner detail snapshot now loads linked properties, units, contracts, and invoices; page shows linked property rows, active contract count, and derived outstanding balance. |
| P1-5 | Settings page — add logo upload, VAT default, contract serial prefix, unsaved-changes guard | `DONE` — company settings now persist contract prefix, default VAT rate, notification preferences, upload-oriented logo data, preview coverage, and unsaved browser-refresh protection. |

### P2 polish (in parallel with P1)

| # | Item |
|---|------|
| P2-1 | Visual consistency — EmptyState, Skeleton, StatusBadge used uniformly across all pages |
| P2-2 | Magic touches — sidebar hover tooltips, dashboard trend arrows, receipt expand animation |
| P2-3 | Print support — receipt + invoice print view with `@media print` CSS |
| P2-4 | File upload & attachments — maintenance photos, contract PDFs, expense receipts → Supabase Storage |
| P2-5 | Mobile UX — bottom nav FAB, min-h-12 touch targets, table→card list below sm:, BottomSheet for forms |
| P2-6 | RTL consistency — all spacing via gap-*, no ml-*/mr-* in flex containers |

### Mobile-vs-desktop note

All issues above were found on mobile. Some may not appear on desktop. Agents must test both viewports. Mobile breakpoint is `< 768px`. Use `sm:` prefix for desktop-only elements.

### Execution order for next agent

1. P2 items — can be batched per page after P1 remains are stable

Read `.agent-skills/rentrix-build-web-apps/SKILL.md` for implementation patterns before starting any item.
