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

Baseline source: `main@ea6b79e6eeb9e5168e73c20ccc990efbc862e85b`, after the merged Wave 1 navigation cut.

### 3.1 Recently merged reconciliation work

| Original request | Final merged result | Purpose |
| --- | --- | --- |
| PR #795 | squash commit `a585a118f5a28ba3bbcb277c89dbc9eb74277e2b` | Contract ISO-calendar-date validation and regression coverage. |
| PR #796 | replacement PR #801, squash commit `0c16f382` | Financial-posting design reconciliation document. |
| PR #797 | squash commit `b98f50149c1424d1f2f7171fb58b6dc986dd8b9b` | Auth/RLS hardening plan updated with actual read-only connector evidence. |
| PR #799 | replacement PR #802, squash commit `ea6b79e6eeb9e5168e73c20ccc990efbc862e85b` | Constrained-beta navigation cut, stale-test fixes, mobile-nav decoupling, and route-parity CI coverage. |

### 3.2 Visible constrained-beta navigation

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

### 3.3 Registered but intentionally hidden routes

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

### 3.4 Current authorization shape

- Active router: TanStack Router.
- Protected routes require a Supabase session.
- Permissioned routes use `requirePermission(...)`.
- Recognized roles are exactly `ADMIN`, `MANAGER`, and `USER`.
- Frontend role source is `session.user.app_metadata.user_role`.
- Missing or unknown claims fail closed.

### 3.5 Current verification gate

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

The latest merged navigation PR passed the full gate.

### 3.6 Current live-environment evidence boundary

The committed Wave 1 reconciliation documents record read-only connector evidence against the intended Supabase project:

```text
intended live project: RENTRIX EGY (live) / nnggcnpcuomwfuupupwg
prohibited project:    rentrix (V2) / ktmizdznbdwvalmmfvfc
```

Current known release risk:

```text
Supabase default main branch status: MIGRATIONS_FAILED
```

Read-only connector evidence exists for project identity, branch inventory, Supabase security advisors, Supabase performance advisors, and Vercel project listing. Detailed migration-list, table-inventory, SQL catalog, log, Vercel deployment-detail, and environment-target reads remain blocked by the connector safety boundary or unavailable credentials.

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

A continuation request is based on intent, not on a literal keyword. Examples include Arabic or English messages equivalent to “continue”, “resume”, “proceed”, “finish the next step”, or “keep going”.

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

### 6.1 Completed repository-side work

| Item | Status | Evidence |
| --- | --- | --- |
| Contract-integrity frontend date validation | `DONE` | Merged PR #795. |
| Financial-posting design reconciliation | `DONE` | Merged replacement PR #801. |
| Auth/RLS hardening plan based on connector evidence | `DONE` | Merged PR #797. |
| Hide deferred surfaces from constrained-beta navigation | `DONE` | Merged replacement PR #802. |
| Explicit mobile bottom-nav destinations | `DONE` | Merged replacement PR #802. |
| Route-parity regression coverage included in CI | `DONE` | Merged replacement PR #802. |
| Full CI gate after navigation cut | `DONE` | GitHub Actions passed on #802. |

### 6.2 Remaining ordered work to close v0.1

| Order | Item | Status | Required result |
| --- | --- | --- | --- |
| 1 | Agent onboarding and repository-governance cleanup | `READY` | Merge the docs-only onboarding PR: current snapshot, version roadmap, skill matrix, root architecture, and cleanup-candidate inventory. |
| 2 | Safe root-cleanup PR | `READY` after item 1 | Remove tracked generated `supabase/.temp/*` metadata, add an ignore rule, and verify no runtime or migration dependency. Do not combine risky archive moves. |
| 3 | Secure operator runbook | `READY` after item 1 | Record redacted environment ownership and the intended/prohibited Supabase refs without committing secrets. Include Vercel project identity evidence where available. |
| 4 | Read-only live migration-state reconciliation | `BLOCKED` by detailed connector access | Identify the exact failed migration state behind `MIGRATIONS_FAILED`; capture migration list, failure evidence, and safe replay plan. No production mutation. |
| 5 | Preview-branch migration replay | `BLOCKED` by item 4 and preview access | Prove replay outside production; split any repair into a narrow reviewed migration PR. |
| 6 | Auth, RLS, and RPC least-privilege reconciliation | `BLOCKED` by detailed catalog access | Verify live hook registration, JWT claims, grants, policies, helper execution, idempotency posture, and posted-payment immutability. Split fixes into narrow PRs. |
| 7 | Browser/manual operational QA | `BLOCKED` until preview or staging is reachable | Verify RTL desktop, RTL mobile, LTR sanity, protected-route refresh, forms, tables, dialogs, receipt lookup/print, CSV export, PWA install/offline/update, and invalid-route fallback. |
| 8 | Final constrained-beta release check | `BLOCKED` until items 2–7 close | Run the full CI gate, review live evidence, record residual risks, and decide GO / NO-GO. |

### 6.3 v0.1 acceptance gate

Close `v0.1` only when:

- full GitHub Actions gate passes on the release candidate;
- tracked generated temp metadata is removed from Git history going forward;
- intended live environment ownership is recorded redacted and verified;
- `MIGRATIONS_FAILED` is reconciled safely through preview evidence;
- required auth, RLS, and RPC behavior is verified or fixed through reviewed PRs;
- constrained-beta navigation remains bounded;
- browser/manual QA is recorded for RTL, mobile, receipt printing, direct refresh, and PWA behavior;
- no production mutation occurred without explicit approval;
- final result is explicitly recorded as GO or NO-GO.

## 7. v0.2 — Operational UX Completion

**Status:** `DEFERRED until v0.1 closes`

**Goal:** make every visible operational-core surface commercially coherent without expanding hidden modules.

### Scope

| Order | Item | Status |
| --- | --- | --- |
| 1 | Audit every visible route for loading, empty, error, retry, null-relation, and permission states | `DEFERRED` |
| 2 | Complete Arabic-first RTL consistency and English/LTR sanity across visible routes | `DEFERRED` |
| 3 | Complete mobile usability for visible forms, tables, drawers, dialogs, and quick actions | `DEFERRED` |
| 4 | Normalize money formatting, currency context, and CSV output across visible commercial screens | `DEFERRED` |
| 5 | Complete receipt output, print behavior, and operator-facing document polish | `DEFERRED` |
| 6 | Complete active reports for collection, arrears, expenses, occupancy, and expiring contracts | `DEFERRED` |
| 7 | Implement or explicitly defer the posted-payment correction UX using reversal and replacement only | `DEFERRED` |
| 8 | Run UI/UX and React-performance review using the required skills | `DEFERRED` |

### Acceptance gate

- every visible route passes the commercial screen checklist;
- Arabic RTL, English LTR, and mobile evidence is recorded;
- money values use one formatting path;
- no hidden module is re-exposed accidentally;
- receipt and report behavior is verified;
- full CI gate passes.

## 8. v0.3 — Controlled Operations Recovery

**Status:** `DEFERRED until v0.2 closes`

**Goal:** re-enable only verified operational and governance modules.

### Scope

| Order | Item | Status |
| --- | --- | --- |
| 1 | Verify maintenance schema, statuses, indexes, and RLS; then decide whether to re-expose `/maintenance` | `DEFERRED` |
| 2 | Verify audit source schema and permissions; then decide whether to re-expose `/audit-log` | `DEFERRED` |
| 3 | Verify data-integrity read model and permissions; then decide whether to re-expose `/data-integrity` | `DEFERRED` |
| 4 | Verify system-governance source support and permissions; then decide whether to re-expose `/system` | `DEFERRED` |
| 5 | Add route, permission, UX, and regression-test evidence for each re-exposed module separately | `DEFERRED` |

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

| Order | Item | Status |
| --- | --- | --- |
| 1 | Decide lands lifecycle, ownership, and reporting scope | `BLOCKED` by product decision |
| 2 | Decide lead stages, ownership, source, and conversion rules | `BLOCKED` by product decision |
| 3 | Decide read-only commissions visibility before any settlement workflow | `BLOCKED` by product decision |
| 4 | Decide communication provider, templates, consent, audit, retries, and failure model | `BLOCKED` by product decision |
| 5 | Recover approved modules read-only first, one module per narrow PR | `DEFERRED` |
| 6 | Add writes or external sends only through separate security-reviewed PRs | `DEFERRED` |

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
