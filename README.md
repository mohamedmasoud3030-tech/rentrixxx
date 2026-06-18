# Rentrix

Rentrix is an Arabic-first, single-office property operations system for managing the verified property workflow: properties, units, people, tenants, owners, contracts, invoices, payments, receipts, arrears, expenses, and reports.

The active application is intentionally focused. SaaS multi-tenancy and accounting-grade ledger work are outside the current stabilization scope. Approved recovered modules such as lands, leads, commissions, and communication are live visible modules with permission guards.

## Start here

Read in this order:

1. `AGENTS.md`
2. `docs/ROADMAP.md` (current phase status + quick phase overview)
3. `docs/ai/CURRENT_EXECUTION_CONTEXT.md`
4. `docs/ai/ONBOARDING.md`
5. `docs/RENTRIX_MASTER_PLAN.md`
6. `docs/ai/AGENT_CAPABILITIES.md`
7. `docs/ai/GIT_TOOLING_POLICY.md`

`docs/ai/CURRENT_EXECUTION_CONTEXT.md` is the single current execution source of truth for scope, blockers, contradictions, next PR order, and future-agent rules. `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md` records the currently BLOCKED live handover evidence gates. `docs/ai/V05_COMMERCIAL_HARDENING_PREP.md` defines repo-only v0.5 preparation without claiming Production GO. `docs/ai/ONBOARDING.md` contains the current application snapshot and the full reading sequence. `docs/RENTRIX_MASTER_PLAN.md` defines the final product shape, current release, ordered releases, and next ready item. `docs/ai/AGENT_CAPABILITIES.md` maps tasks to skills and project additions. `docs/ai/GIT_TOOLING_POLICY.md` defines how branch, diff, PR, CI, and merge tools must be used.

## Docs map

**Quick entry:** `docs/ROADMAP.md` — phases, current work, status at a glance.

Read first: `AGENTS.md`, `README.md`, `docs/ROADMAP.md`, `docs/ai/CURRENT_EXECUTION_CONTEXT.md`, `docs/RENTRIX_MASTER_PLAN.md`, `docs/FIRST_CLIENT_DELIVERY_PLAN.md`, and `docs/ai/ONBOARDING.md`.

Active policy docs: `docs/ai/domain-rules.md`, `docs/ai/engineering-policy.md`, `docs/ai/security-policy.md`, `docs/ai/release-policy.md`, `docs/ai/testing-guide.md`, and `docs/decisions/README.md`.

Technical references: `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`, `docs/ai/V05_COMMERCIAL_HARDENING_PREP.md`, `docs/ai/PRINT_AND_EXPORT_READINESS.md`, `docs/ai/REPORTING_DEFINITIONS.md`, `docs/ai/SECURE_OPERATOR_RUNBOOK.md`, `docs/ROOT_LAYOUT.md`, `docs/ai/AGENT_CAPABILITIES.md`, and `docs/ai/GIT_TOOLING_POLICY.md`.

Old reports, audits, evidence packs, superseded indexes, and release-thread notes were removed from active repository docs to keep the docs map small. Use git history when historical material is needed, and do not copy old status forward without verifying it against active code, migrations, and current source-of-truth docs.

## Canonical runtime

```text
artifacts/rentrix/
```

Shared workspace libraries live under `lib/`, and canonical database assets live under `supabase/`.

Do not treat recovery notes, promotional artifacts, generated analysis, or agent-tooling folders as active application code.

## Root map

```text
rentrixxx/
├── artifacts/rentrix/          # Active React application
├── lib/                        # Shared workspace libraries
├── supabase/                   # Canonical migrations and backend assets
├── docs/                       # Active product, engineering, policy, and technical references
├── scripts/                    # Repository automation helpers
├── .github/                    # CI and pull-request governance
├── .ai/                        # Rentrix-specific agent workflows
├── .agent-skills/              # Rentrix-owned reusable agent skills
├── .agents/                    # Installed/shared agent tooling and plugin metadata
└── .codex/vendor/              # Source-locked upstream skills and plugins
```

See `docs/ROOT_LAYOUT.md` for retention rules, dependency direction, and root-folder ownership.

`archive/recovery-reference/` and `understand-anything/` are not present in the current repository checkout. Treat any references to those paths as removed historical references unless a future reviewed cleanup or tooling PR recreates them deliberately.

## Optional support artifacts

```text
artifacts/rentrix-promo/
```

The promo project is retained but is not part of the production runtime.

## Current constrained-beta boundary

Visible navigation includes the verified operational flow plus approved, permission-guarded operations modules. `/lands`, `/leads`, `/commissions`, and `/communication` are live visible approved modules in the active app, not pending or hidden deferred routes. `/accounting` redirects to `/financials` and must not be expanded into a general ledger during stabilization.

Use `docs/ai/ONBOARDING.md` as the current source for the exact route snapshot and incomplete/planned/deferred classifications.

## Root configuration

- `package.json` and `pnpm-workspace.yaml` define the workspace boundary.
- `vercel.json` is the authoritative root deployment configuration.
- `sonar-project.properties` limits static analysis to shipped sources.
- `.replit` is a local launcher only and must not define product architecture.

## Local setup

Use pnpm only:

```bash
pnpm install --frozen-lockfile
```

Run the application:

```bash
pnpm --filter ./artifacts/rentrix run dev
```

## Verification

For runtime pull requests, use the current GitHub Actions gate from `.github/workflows/ci.yml`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
```

For schema or RLS changes, also run the repository-approved Supabase validation flow when a required local or preview Supabase environment is available.

## Product boundaries

- Keep Rentrix single-office.
- Preserve Arabic RTL and English LTR behavior.
- Do not restore legacy `react-router-dom`, `AppContext`, `useApp`, `dataService`, or local database flows into the active app.
- Do not wire a general accounting ledger during stabilization.
- Reuse historical code only after deliberate adaptation to the active TanStack Router, React Query, and Supabase architecture.

## Incomplete / Planned / Deferred Work

The Custom Access Token Hook is `DONE` by owner confirmation and is not a current repo-stabilization blocker. Authenticated ADMIN browser QA, mobile/physical-device print QA, and the final production GO/NO-GO are currently `BLOCKED` by missing live/operator evidence and tracked in `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`. Full production readiness must not be claimed before that final QA closes.

Commercial hardening v0.5 is now repo-only preparation in `docs/ai/V05_COMMERCIAL_HARDENING_PREP.md`; it does not imply Production GO. v1.0 commercial release remains `PLANNED`. External communication sending, a general accounting ledger, accounting-grade tax finality, SaaS multi-tenancy, and blind legacy restoration are `OUT OF SCOPE` unless a later reviewed product decision changes the boundary. Owner settlement/payout workflow is `NEEDS OWNER DECISION`. Dedicated generated receipt PDF remains `PLANNED`; current receipts use browser print.

## Historical references

`archive/recovery-reference/` and `understand-anything/` are not present in the current repository checkout. Old reports were removed from active repository docs and remain available through git history. `.migration-backup/` and `artifacts/rentrix/legacy-src/` were removed in PR #805.
