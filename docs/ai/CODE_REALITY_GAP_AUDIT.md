# Rentrix Code Reality Gap Audit

Repository-only audit performed from `main@7bff142` on 2026-06-16. Scope was documentation and code-reality alignment only. No product fixes, live Supabase work, live Vercel work, credentials, migrations, or production data changes were performed.

## Sources Audited

- Current guidance: `AGENTS.md`, `README.md`, `docs/ai/CURRENT_EXECUTION_CONTEXT.md`, `docs/ai/ONBOARDING.md`, `docs/RENTRIX_MASTER_PLAN.md`, `docs/ai/AGENT_CAPABILITIES.md`, `docs/ai/GIT_TOOLING_POLICY.md`, `.ai/workflows/README.md`, selected local skill guidance.
- Runtime boundary: `artifacts/rentrix/src/`, `artifacts/rentrix/package.json`, root `package.json`, `pnpm-workspace.yaml`, `.github/workflows/ci.yml`.
- Backend assets for understanding only: `supabase/migrations/` filenames and referenced generated database types. No database commands were run.

## Classification Matrix

| Area | Classification | Repository evidence | Notes / gaps |
| --- | --- | --- | --- |
| Auth / login | Implemented and repository-verified | TanStack auth route redirects logged-in users away from `/login`; protected route requires Supabase session; `auth-service.ts` uses Supabase password auth. | Production authorization still depends on Custom Access Token Hook registration so JWTs contain app metadata role claims. |
| Authorization / permissions | Partially implemented | Role extraction supports `app_metadata.user_role` and `app_metadata.role`; guarded routes use `requirePermission`. | Frontend guards are UX only; backend grants/RLS remain the true boundary. Hook registration is unverified. |
| Dashboard | Implemented and repository-verified | Dashboard snapshot reads financial, operational, and arrears services; tests exist. | Live KPI correctness still needs authenticated data QA. |
| Properties | Implemented and repository-verified | List, detail, form page/modal, service, hooks, and tests exist. | Browser form-save QA is still operator-gated. |
| Units | Implemented and repository-verified | Units page, service, hook, list/card tests, and status normalization tests exist. | Unit status DB triggers are documented as live-verified, but this audit did not touch live DB. |
| People / tenants / owners | Implemented and repository-verified | People CRUD/soft-delete, tenant workspace, owners page/detail/services/hooks/tests exist. | Owner settlements and payout workflows remain deferred; owner balance formulas are not a canonical financial report. |
| Contracts | Implemented and repository-verified | Contracts list/detail/form, create/update/soft-delete, renewal RPC facade, payments tab, CSV export, PDF export, and tests exist. | Active-overlap enforcement is DB-backed; this audit did not replay migrations or live flows. |
| Invoices | Implemented and repository-verified | Invoice list/detail service, invoice generation RPC facade, page, filters, summary helpers, and tests exist. | Dedicated invoice print/PDF UI is not verified in active invoice page. |
| Payments / receipts | Partially implemented | Payment recording calls `record_invoice_payment_atomic`; receipt list/detail projects posted payments; receipt print uses browser print; void action is role-gated and calls RPC wrapper. | Full authenticated invoice -> payment -> receipt -> allocation -> idempotency E2E remains blocked. Receipt detail IDs are payment-backed, not internal receipt IDs. |
| Arrears | Implemented and repository-verified | Arrears page delegates to financial arrears workflow and report services. | Canonical balance behavior still needs authenticated live flow QA after payment/void. |
| Reports | Implemented and repository-verified | Reports page has date filters, chart sections, real report service hooks, and CSV exports with BOM/date-stamped filenames. | Reports PDF export is not implemented; KPI definitions require product/live validation. |
| Print / PDF / CSV | Partially implemented | Receipt browser print, contract PDF, contract CSV, reports CSV, generic document helpers exist. | Dedicated receipt PDF, reports PDF, active invoice PDF button, and active expense PDF button are missing or unverified. |
| Settings / change password | Implemented and repository-verified | Settings service/page/tests and change-password service/page/tests exist. | Logo upload is upload-oriented local data support; storage/live asset behavior needs operator QA. |
| Maintenance | Implemented and repository-verified | Maintenance page, service, hooks, helpers, and tests exist; route/nav permission guard exists. | Live RLS/schema behavior was not rechecked in this audit. |
| Accounting placeholder | Blocked / unsafe to expand | `/accounting` redirects to `/financials`; PDF helpers include accounting-style documents but no active ledger route should be inferred. | Do not build balance sheet, P&L, journals, or general ledger during stabilization. |
| Lands / leads / commissions / communication | Present but intentionally unavailable | Routes remain registered and permissioned, hidden from visible nav. All current read-model services return `status: 'unavailable'`. | Earlier docs that implied `/lands` had usable service support were stale. Re-exposure requires product decision, schema/RLS, UX, and tests. |
| Arabic RTL / mobile | Partially implemented | App shell sets `dir` from language state, visible desktop/mobile nav exists, print CSS and responsive card/table patterns exist, tests cover nav items and mobile-oriented components. | Needs authenticated browser/device QA for RTL desktop, mobile drawer, bottom nav, forms, print, and English/LTR sanity. |
| PWA / offline assumptions | Partially implemented | Vite PWA auto-update, Workbox cache patterns, public manifest, icons, and `offline.html` exist. | Offline behavior was not browser-tested; app status label is UI state, not proof of durable offline business workflow. |
| Supabase client usage | Implemented and repository-verified | Single typed Supabase client uses env guard placeholders when configuration is incomplete. Services call Supabase directly with generated types and feature-local helpers. | Runtime env values and live auth behavior require operator evidence. |
| RLS / read-write risk | Blocked / unsafe to touch now | Migrations document RLS, grants, RPC hardening, and audit policies; frontend code uses permission guards. | This audit did not run DB validation. New RLS/migration work is unsafe without a confirmed bug and approved environment path. |
| Routes / sidebar / navigation | Implemented and repository-verified | Route tree registers visible, governance, and deferred routes; nav groups expose approved routes; mobile bottom nav is intentionally narrow. | Deferred routes are registered but hidden; this is intentional, not a missing sidebar bug. |
| Tests / CI coverage | Implemented and repository-verified | Root scripts call app typecheck/lint/build; app has targeted Vitest scripts; CI also runs repository migration-evidence collection and financial tests with diagnostics. | Local safe verification in this audit excludes live Supabase and does not replace PR CI or browser QA. |

## Contradictions and Stale Claims Found

- `docs/ai/CURRENT_EXECUTION_CONTEXT.md` still described the reports CSV polish PR as in review even though PR #913 is merged at `main@7bff142`.
- `docs/RENTRIX_MASTER_PLAN.md` and older route-status language implied `/lands` had a usable page/service path under `features/lands`; the active `lands-service.ts` returns `status: 'unavailable'`.
- The user-requested safe verification list omits the CI workflow's `pnpm supabase:migration-evidence` step. This audit did not run live or DB-mutating validation; CI remains broader than the requested local-safe command list.
- Several historical roadmap addenda mark print/PDF work as `DONE`; current code supports receipt browser print and contract PDF, but dedicated invoice PDF UI, dedicated receipt PDF generation, reports PDF, and expense PDF UI are still missing or unverified.

## Broken / Missing / Deferred Feature Reality

- No active UI evidence was found for a dedicated invoice PDF/print export action.
- No active UI evidence was found for an expense PDF export action.
- Reports export CSV only; no reports PDF export exists.
- Receipts print through the browser; no generated receipt PDF service/action exists.
- Optional CRM routes are safe-unavailable, not implemented product modules.
- Accounting-style PDF helpers exist, but no general ledger feature is approved or reachable as a product route.
- Authenticated browser QA, PWA install/offline/update QA, and mobile print behavior remain unverified.

## Execution Plan Cleanup

### Phase 1: v0.1 Release-Evidence Closure

Goal: close or keep blocking the constrained-beta decision with evidence, not new features.

Why it matters: the repository is broadly wired, but production readiness is still blocked by auth-hook and authenticated runtime evidence.

Likely files/areas: `docs/ai/CURRENT_EXECUTION_CONTEXT.md`, `docs/RENTRIX_MASTER_PLAN.md`, `docs/v01/migration-reconciliation-status.md`, `docs/demo-gates/`, release checklist docs.

Acceptance criteria: Custom Access Token Hook registration proof recorded; JWT role claim verified after login; ADMIN authenticated QA covers dashboard, contracts, invoice payment recording, receipt generation/void constraints, arrears, reports, RTL/mobile navigation, direct refresh, invalid route, receipt print, and PWA smoke; GO/NO-GO recorded.

Verification commands: `pnpm typecheck`; `pnpm lint`; `pnpm build`; `pnpm --filter ./artifacts/rentrix run typecheck:test`; `pnpm --filter ./artifacts/rentrix test`.

Repo-only vs live-approval: repo docs and tests are repo-only; hook registration, authenticated QA, Vercel/Supabase evidence, and live payment flow require explicit live/operator approval.

Must not touch: migrations, RLS, RPCs, production data, Supabase settings, Vercel settings, product scope, hidden route visibility, general ledger, SaaS/multi-tenancy.

### Phase 2: Document Output Completion

Goal: turn current partial print/PDF support into an explicit approved document-output set.

Why it matters: users see print/export claims, but invoice PDF, receipt PDF, reports PDF, and expense PDF are missing or unverified.

Likely files/areas: `artifacts/rentrix/src/features/financials/invoices/`, `artifacts/rentrix/src/features/financials/receipts/`, `artifacts/rentrix/src/features/reports/`, `artifacts/rentrix/src/services/pdfService.ts`, `artifacts/rentrix/src/services/documents/`, `docs/ai/PRINT_AND_EXPORT_READINESS.md`.

Acceptance criteria: product-approved document list; active buttons only where logic exists; Arabic/RTL output checked; CSV formula/BOM behavior preserved; no accounting-ledger documents exposed.

Verification commands: targeted document tests; `pnpm typecheck`; `pnpm lint`; `pnpm build`; `pnpm --filter ./artifacts/rentrix test`.

Repo-only vs live-approval: implementation and unit tests are repo-only; browser print, mobile print, and real Arabic data export require operator/browser QA.

Must not touch: live storage buckets, migrations, general accounting screens, owner-settlement docs, external sends.

### Phase 3: Optional Route Product Decisions

Goal: decide whether lands, leads, commissions, and communication belong in v1, and keep them safe-unavailable until approved.

Why it matters: registered routes can be mistaken for product readiness; hidden unavailable modules need explicit product decisions.

Likely files/areas: `docs/decisions/`, `docs/RENTRIX_MASTER_PLAN.md`, `docs/ai/product-scope.md`, `artifacts/rentrix/src/features/{lands,leads,commissions,communication}/`, `artifacts/rentrix/src/routeTree.ts`, `artifacts/rentrix/src/layouts/app-nav-items.ts`.

Acceptance criteria: one decision per optional module; any approved module has schema, RLS, permissions, read model, UX, tests, and navigation decision; rejected modules remain hidden and unavailable.

Verification commands: `pnpm typecheck`; `pnpm lint`; `pnpm build`; route/nav tests.

Repo-only vs live-approval: docs and unavailable-state tests are repo-only; any schema/RLS or external-provider decision requires live/security approval.

Must not touch: external messaging providers, commission settlement payouts, land write flows, hidden navigation visibility without product approval.

### Phase 4: Commercial Delivery Hardening

Goal: package a repeatable single-office delivery process after v0.1 evidence and optional-route decisions are closed.

Why it matters: first-client delivery needs safe environment setup, backups, onboarding, monitoring, and rollback, not random feature PRs.

Likely files/areas: delivery runbooks, `docs/ai/SECURE_OPERATOR_RUNBOOK.md`, `docs/demo-gates/`, settings/company profile docs, deployment docs.

Acceptance criteria: isolated customer deployment runbook; backup/restore checklist; redacted environment ownership; operator onboarding; release notes; no secrets in Git.

Verification commands: repo-safe docs checks plus full CI gate before release candidate.

Repo-only vs live-approval: runbook drafting is repo-only; environment provisioning, secrets, backups, and live release validation require explicit live approval.

Must not touch: production secrets, live data, SaaS multi-tenancy, shared-database organization scoping, broad ledger expansion.
