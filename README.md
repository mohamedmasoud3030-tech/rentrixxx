# Rentrix

Rentrix is an Arabic-first, single-office property operations system for managing properties, units, people, contracts, invoices, payments, receipts, arrears, expenses, maintenance, and reports.

The active application is intentionally focused. SaaS multi-tenancy and accounting-grade ledger work are outside the current stabilization scope.

## Start here

Read in this order:

1. `AGENTS.md`
2. `docs/ROOT_LAYOUT.md`
3. `docs/README.md`
4. `docs/ai/README.md`
5. `docs/decisions/README.md`
6. `.ai/workflows/README.md`

## Canonical runtime

```text
artifacts/rentrix/
```

Shared workspace libraries live under `lib/`, and canonical database assets live under `supabase/`.

Do not treat recovery folders, preview sandboxes, or promotional artifacts as active application code.

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
├── .migration-backup/          # Historical recovery source only
└── understand-anything/        # Generated repository-understanding artifacts
```

See `docs/ROOT_LAYOUT.md` for retention rules and root-folder ownership.

## Optional support artifacts

```text
artifacts/mockup-sandbox/
artifacts/rentrix-promo/
```

These support preview, visual exploration, or promotional work. They are not part of the production runtime.

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

For runtime changes:

```bash
pnpm --filter ./artifacts/rentrix run typecheck
pnpm --filter ./artifacts/rentrix run lint
pnpm --filter ./artifacts/rentrix run test
pnpm --filter ./artifacts/rentrix run build
```

For schema or RLS changes, also run the repository-approved Supabase validation flow when a local Supabase environment is available.

## Product boundaries

- Keep Rentrix single-office.
- Preserve Arabic RTL and English LTR behavior.
- Do not restore legacy `react-router-dom`, `AppContext`, `useApp`, `dataService`, or local database flows into the active app.
- Do not wire a general accounting ledger during stabilization.
- Reuse historical code only after deliberate adaptation to the active TanStack Router, React Query, and Supabase architecture.

## Historical sources

`.migration-backup/` and `artifacts/rentrix/legacy-src/` are retained for selective recovery only. They are not runtime code and must not be imported wholesale into the active application.
