# Rentrix Root Layout and Architectural Tree

Use this map before creating, moving, importing, or deleting files. It defines the repository categories, folder ownership, allowed dependency direction, and cleanup boundaries.

## 1. Shipped Product Boundary

```text
rentrixxx/
├── artifacts/rentrix/          # Active React application
├── lib/                        # Shared workspace libraries
└── supabase/                   # Canonical backend assets and migrations
```

These paths define the shipped product. Runtime code may depend only on approved runtime libraries and generated types inside this boundary.

### Allowed dependency direction

```text
artifacts/rentrix/src/
    ├── may import from artifacts/rentrix/src/
    ├── may import approved workspace packages from lib/
    └── may call Supabase APIs represented by canonical assets under supabase/

lib/
    └── must not import feature UI or route modules from artifacts/rentrix/

supabase/
    └── must not depend on frontend source files
```

Do not create a parallel application, router, state layer, or financial-calculation path.

## 2. Active Application Structure

```text
artifacts/rentrix/
├── src/
│   ├── app/                    # App-level composition and auth shell
│   ├── components/             # Shared presentational components and UI primitives
│   ├── features/               # Feature-local pages, services, hooks, tests, and schemas
│   ├── hooks/                  # Shared hooks
│   ├── integrations/           # Supabase client and external integration boundaries
│   ├── layouts/                # App shell and navigation
│   ├── lib/                    # Shared runtime helpers
│   ├── routes/                 # TanStack Router route components
│   ├── services/               # Shared runtime services only when feature-local ownership is unsuitable
│   ├── store/                  # Minimal approved client state
│   ├── types/                  # Runtime and generated database-facing types
│   ├── App.tsx
│   ├── index.tsx
│   └── routeTree.ts            # Active TanStack Router tree
├── public/                     # PWA assets and static files
├── package.json
└── vite.config.ts
```

### File-placement rules inside the app

- Put new domain behavior under the relevant `src/features/<domain>/` directory.
- Keep service modules and hooks close to the feature unless they are genuinely shared.
- Keep route registration in TanStack Router files and `routeTree.ts`.
- Put shared UI primitives under `src/components/` only when multiple features reuse them.
- Do not place new runtime code in `archive/recovery-reference/`, agent-tooling folders, or generated-analysis folders.

## 3. Canonical Backend Assets

```text
supabase/
├── migrations/                 # Versioned canonical migration chain
├── functions/                  # Approved edge functions when present
└── .temp/                      # Local generated metadata; must not be tracked going forward
```

### Backend rules

- Migrations are versioned, conservative, reviewable, and environment-sensitive.
- RLS, auth, RPC, grants, and data repairs require explicit review.
- Never commit secrets, service-role keys, production data, or local Supabase metadata.
- `supabase/.temp/` is generated local state, not product architecture.

## 4. Governance and Documentation

```text
README.md                       # Repository start page
AGENTS.md                       # Canonical operating policy
CLAUDE.md                       # Short compatibility entry point
docs/
├── README.md                   # Documentation index
├── ROOT_LAYOUT.md              # This architectural map
├── RENTRIX_MASTER_PLAN.md      # Single authoritative version roadmap
├── ai/                         # Durable agent and engineering policy
├── decisions/                  # ADRs and durable architecture decisions
├── reconciliation/             # Repository comparisons and cleanup inventories
├── stabilization/              # Historical stabilization evidence
├── wave1/                      # Wave-specific reconciliation evidence
└── demo-gates/                 # Validation and release-gate evidence
.github/                        # CI and pull-request governance
.ai/                            # Rentrix-specific execution workflows
```

### Documentation rules

- Put stable current policy in `docs/ai/` or `docs/decisions/`.
- Put the ordered implementation roadmap only in `docs/RENTRIX_MASTER_PLAN.md`.
- Put cleanup inventories under `docs/reconciliation/`.
- Treat older `PHASE_*`, stabilization, recovery, and audit reports as historical evidence unless explicitly promoted into current policy.
- Avoid adding loose one-off reports to the repository root.

## 5. Agent Tooling

```text
.agent-skills/                  # Rentrix-owned reusable skills
.agents/                        # Installed/shared skills and connector helpers
.codex/vendor/                  # Source-locked upstream references
```

Runtime code must never import files from these folders.

Current agent capability ownership is documented in:

```text
docs/ai/AGENT_CAPABILITIES.md
```

## 6. Scripts and Root Configuration

```text
scripts/                        # Repository automation and approved sync helpers
package.json                    # Root pnpm scripts
pnpm-workspace.yaml             # Workspace membership
tsconfig.json                   # Root TypeScript project
tsconfig.base.json              # Shared TypeScript defaults
vercel.json                     # Authoritative root deployment config
sonar-project.properties        # Static-analysis scope
.replit                         # Local launcher only
.gitignore                      # Generated-file exclusion policy
```

### Root-configuration rules

- `vercel.json` is authoritative for root deployment.
- `.replit` may launch local development only; it must not define product architecture.
- Add a root script only when repository-wide execution needs it.
- Put environment-local generated state in ignored paths, not in Git.

## 7. Optional Support Artifacts

```text
artifacts/rentrix-promo/        # Optional promotional support
```

The promo project is not production runtime. Retain, archive, or remove it only through a reviewed cleanup PR after confirming current use.

## 8. Recovery Reference Archive

```text
archive/recovery-reference/     # Concise reference-only recovery notes
```

Broad historical recovery trees were removed after selective extraction. The archive path is not deployed runtime and must not be imported.

### Recovery rules

- Compare a recovery note against the active architecture before reuse.
- Port only the narrow behavior required by the current roadmap item.
- Adapt legacy code to TanStack Router, React Query, current auth, feature services, and current Supabase boundaries.
- Never restore legacy `react-router-dom`, `useApp`, `AppContext`, `dataService`, local DB flows, or historical barrels into active runtime.
- Do not expand the archive with executable legacy source; keep only concise, proven-unique notes.

## 9. Generated Analysis Support

```text
understand-anything/            # Generated repository-understanding artifacts
```

Use generated analysis only as orientation support. Verify every conclusion against active code, migrations, tests, and runtime configuration before editing.

## 10. Dependency Firewall

The following dependency directions are prohibited:

```text
active runtime → archive/recovery-reference
active runtime → .agent-skills
active runtime → .agents
active runtime → .codex/vendor
active runtime → understand-anything
shared lib      → active feature UI or route modules
Supabase SQL    → frontend source files
```

Use repository search and build verification to enforce this firewall before deleting or moving files.

## 11. Cleanup Categories

Before removing anything, classify it in `docs/reconciliation/02-root-cleanup-candidates.md` as one of:

```text
retain-runtime
retain-governance
retain-recovery-source
retain-generated-support
safe-delete-proven
review-before-delete
move-or-archive
```

Delete only `safe-delete-proven` items in a narrow follow-up PR with fresh verification.

## 12. Adding a New Top-Level Folder

Create a new top-level folder only when:

1. it clearly belongs to a category above;
2. an existing category cannot own the files cleanly;
3. dependency direction remains explicit;
4. root documentation is updated in the same reviewed PR.
