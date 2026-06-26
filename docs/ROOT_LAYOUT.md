# Rentrix Root Layout and Architectural Tree

Use this map before creating, moving, importing, or deleting files. It defines the repository categories, folder ownership, allowed dependency direction, and cleanup boundaries.

## 1. Shipped Product Boundary

```text
rentrixxx/
├── rentrix-app/                # Active React application
├── lib/                        # Shared workspace libraries
└── supabase/                   # Canonical backend assets and migrations
```

These paths define the shipped product. Runtime code may depend only on approved runtime libraries and generated types inside this boundary.

### Allowed dependency direction

```text
rentrix-app/src/
    ├── may import from rentrix-app/src/
    ├── may import approved workspace packages from lib/
    └── may call Supabase APIs represented by canonical assets under supabase/

lib/
    └── must not import feature UI or route modules from rentrix-app/

supabase/
    └── must not depend on frontend source files
```

Do not create a parallel application, router, state layer, or financial-calculation path.

## 2. Active Application Structure

```text
rentrix-app/
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
- Do not place new runtime code in removed historical-reference paths, agent-tooling folders, or generated-analysis folders.

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
├── ROOT_LAYOUT.md              # This architectural map
├── RENTRIX_MASTER_PLAN.md      # Single authoritative version roadmap
├── FIRST_CLIENT_DELIVERY_PLAN.md # Active first-client delivery plan
├── ai/                         # Durable agent and engineering policy
└── decisions/                  # ADRs and durable architecture decisions
.github/                        # CI and pull-request governance
.ai/                            # Rentrix-specific execution workflows
```

### Documentation rules

- Put stable current policy in `docs/ai/` or `docs/decisions/`.
- Put the ordered implementation roadmap only in `docs/RENTRIX_MASTER_PLAN.md`.
- Put current cleanup decisions in active policy docs; old cleanup inventories were removed from active docs and remain available through git history.
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

## 6. Scripts and Deployment Configuration

```text
scripts/                        # Repository automation and approved sync helpers
package.json                    # Root pnpm scripts
pnpm-workspace.yaml             # Workspace membership
tsconfig.json                   # Root TypeScript project
tsconfig.base.json              # Shared TypeScript defaults
rentrix-app/vercel.json         # Authoritative Vercel configuration
sonar-project.properties        # Static-analysis scope
.replit                         # Local launcher only
.gitignore                      # Generated-file exclusion policy
```

### Root-configuration rules

- `rentrix-app/vercel.json` is the only Vercel configuration. The Vercel project uses `rentrix-app` as its root directory.
- `.replit` may launch local development only; it must not define product architecture.
- Add a root script only when repository-wide execution needs it.
- Put environment-local generated state in ignored paths, not in Git.

## 7. Optional Support Artifacts

```text
artifacts/rentrix-promo/        # Optional promotional support
```

The promo project is not production runtime. Retain, archive, or remove it only through a reviewed cleanup PR after confirming current use.

## 8. Removed Historical References

`archive/recovery-reference/` is not present in the current repository checkout. Broad historical recovery trees were removed after selective extraction and old notes remain available through git history. Do not describe this path as an existing active directory unless a future reviewed cleanup PR recreates it deliberately.

### Recovery rules

- Compare a recovery note against the active architecture before reuse.
- Port only the narrow behavior required by the current roadmap item.
- Adapt legacy code to TanStack Router, React Query, current auth, feature services, and current Supabase boundaries.
- Never restore legacy `react-router-dom`, `useApp`, `AppContext`, `dataService`, local DB flows, or historical barrels into active runtime.
- Do not expand the archive with executable legacy source; keep only concise, proven-unique notes.

## 9. Generated Analysis Support

`understand-anything/` is not present in the current repository checkout. If generated analysis is recreated later, use it only as orientation support and verify every conclusion against active code, migrations, tests, and runtime configuration before editing.

## 10. Dependency Firewall

The following dependency directions are prohibited:

```text
active runtime → .agent-skills
active runtime → .agents
active runtime → .codex/vendor
active runtime → removed or generated historical references
shared lib      → active feature UI or route modules
Supabase SQL    → frontend source files
```

Use repository search and build verification to enforce this firewall before deleting or moving files.

## 11. Cleanup Categories

Before removing anything, classify it in an active cleanup plan or current source-of-truth doc as one of:

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
