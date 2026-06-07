# Rentrix

Rentrix is an Arabic-first, single-office property operations system for managing the verified property workflow: properties, units, people, tenants, owners, contracts, invoices, payments, receipts, arrears, expenses, and reports.

The active application is intentionally focused. SaaS multi-tenancy and accounting-grade ledger work are outside the current stabilization scope. Some recovered routes remain registered for controlled verification but are intentionally hidden from constrained-beta navigation.

## Start here

Read in this order:

1. `AGENTS.md`
2. `docs/ai/ONBOARDING.md`
3. `docs/RENTRIX_MASTER_PLAN.md`
4. `docs/ai/AGENT_CAPABILITIES.md`
5. `docs/ai/GIT_TOOLING_POLICY.md`

`docs/ai/ONBOARDING.md` contains the current application snapshot and the full reading sequence. `docs/RENTRIX_MASTER_PLAN.md` defines the final product shape, current release, ordered releases, and next ready item. `docs/ai/AGENT_CAPABILITIES.md` maps tasks to skills and project additions. `docs/ai/GIT_TOOLING_POLICY.md` defines how branch, diff, PR, CI, and merge tools must be used.

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
├── docs/                       # Product, engineering, audit, and recovery docs
├── scripts/                    # Repository automation helpers
├── .github/                    # CI and pull-request governance
├── .ai/                        # Rentrix-specific agent workflows
├── .agent-skills/              # Rentrix-owned reusable agent skills
├── .agents/                    # Installed/shared agent tooling and plugin metadata
├── .codex/vendor/              # Source-locked upstream skills and plugins
├── archive/recovery-reference/ # Minimal reference-only recovery notes
└── understand-anything/        # Generated repository-understanding artifacts
```

See `docs/ROOT_LAYOUT.md` for retention rules, dependency direction, and root-folder ownership.

## Optional support artifacts

```text
artifacts/rentrix-promo/
```

The promo project is retained but is not part of the production runtime.

## Current constrained-beta boundary

Visible navigation is intentionally limited to the verified operational flow. Routes such as lands, leads, maintenance, commissions, communication, system governance, audit log, and data integrity remain registered for controlled recovery but are hidden from visible navigation. `/accounting` redirects to `/financials` and must not be expanded into a general ledger during stabilization.

Use `docs/ai/ONBOARDING.md` as the current source for the exact route snapshot.

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

## Recovery references

Only concise notes under `archive/recovery-reference/` remain for selective maintenance reference, and they must not be imported into the active application. `.migration-backup/` and `artifacts/rentrix/legacy-src/` were removed in PR #805.
