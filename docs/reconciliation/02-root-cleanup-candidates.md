# 02 — Root Cleanup Candidates and Retention Inventory

## Purpose

This inventory classifies repository paths before any deletion or move. It is based on the active pnpm workspace, root deployment configuration, current architectural tree, repository reconciliation evidence, and direct path inspection.

This document does **not** authorize broad deletion. Remove only `safe-delete-proven` items in a narrow follow-up PR with fresh verification.

## Classification values

| Classification | Meaning |
| --- | --- |
| `retain-runtime` | Required by the shipped application, shared runtime libraries, or canonical backend assets. |
| `retain-governance` | Required for CI, documentation, workflows, skills, deployment, or repository operations. |
| `retain-recovery-source` | Historical code retained for selective recovery. It is not runtime code. |
| `retain-generated-support` | Generated analysis support. It is not source of truth or runtime code. |
| `safe-delete-proven` | Generated local metadata proven unnecessary for runtime and safe to remove in a narrow follow-up PR. |
| `review-before-delete` | Potentially removable, but current usage or recovery value must be decided first. |
| `move-or-archive` | Historical evidence worth retaining outside the active working tree after a deliberate archive decision. |

## 1. Canonical runtime and backend assets

| Path | Classification | Evidence | Action |
| --- | --- | --- | --- |
| `artifacts/rentrix/` | `retain-runtime` | Active package in `pnpm-workspace.yaml`; current React, TanStack Router, React Query, Supabase, RTL, i18n, and PWA app. | Keep. New runtime feature files belong here. |
| `lib/api-client-react/` | `retain-runtime` | Included in root pnpm workspace. | Keep unless a separate dependency audit proves it unused. |
| `lib/db/` | `retain-runtime` | Included in root pnpm workspace. | Keep unless a separate dependency audit proves it unused. |
| `supabase/migrations/` | `retain-runtime` | Canonical versioned database migration chain and reconciliation evidence. | Keep. Review conservatively. |
| `supabase/functions/` | `retain-runtime` when present | Canonical edge-function boundary. | Keep approved functions; audit separately before removal. |

## 2. Governance, CI, skills, and root operations

| Path | Classification | Action |
| --- | --- | --- |
| `README.md`, `AGENTS.md`, `CLAUDE.md` | `retain-governance` | Keep concise and linked to canonical policy. |
| `docs/`, `.github/`, `.ai/` | `retain-governance` | Keep organized by policy, evidence, workflows, and CI ownership. |
| `.agent-skills/`, `.agents/`, `.codex/vendor/` | `retain-governance` | Keep as agent guidance. Never import into runtime. |
| `scripts/` | `retain-governance` | Keep reviewed automation and sync helpers. |
| `package.json`, `pnpm-workspace.yaml`, TypeScript configs | `retain-governance` | Keep authoritative workspace configuration. |
| `vercel.json` | `retain-governance` | Keep as authoritative root deployment config. |
| `sonar-project.properties` | `retain-governance` | Keep unless quality tooling is explicitly retired. |
| `.replit` | `retain-governance` | Keep while local Replit workflow remains useful. |
| `.gitignore` | `retain-governance` | Keep and extend for generated Supabase temp metadata. |

## 3. Proven safe deletion candidates

These files are generated local Supabase metadata. They are not workspace packages, application imports, migration files, deployment inputs, or canonical backend configuration.

| Path | Classification | Follow-up action |
| --- | --- | --- |
| `supabase/.temp/pooler-url` | `safe-delete-proven` | Delete from Git and ignore `supabase/.temp/`. |
| `supabase/.temp/postgres-version` | `safe-delete-proven` | Delete from Git and ignore `supabase/.temp/`. |
| `supabase/.temp/gotrue-version` | `safe-delete-proven` | Delete from Git and ignore `supabase/.temp/`. |
| `supabase/.temp/cli-latest` | `safe-delete-proven` | Delete from Git and ignore `supabase/.temp/`. |

### Required narrow follow-up PR

The first cleanup PR after onboarding should:

1. remove only the four tracked `supabase/.temp/*` files above;
2. add `supabase/.temp/` to `.gitignore`;
3. verify repository search has no runtime, migration, deployment, or script dependency on those files;
4. run `git diff --check` and the full GitHub Actions gate when a local checkout or PR CI is available;
5. avoid archive moves, legacy deletion, and unrelated cleanup.

## 4. Historical recovery sources

| Path | Classification | Evidence | Action |
| --- | --- | --- | --- |
| `.migration-backup/` | `retain-recovery-source` | Broad historical app snapshot with legacy router, contexts, services, schema assets, scripts, and old package files. Repository reconciliation identified remaining selective recovery value and incompatible architecture coupling. | Keep for now. Do not import wholesale. Review for archive only after recovery work is exhausted. |
| `artifacts/rentrix/legacy-src/` | `retain-recovery-source` | Historical source mirror nested under the active package. Repository reconciliation found useful selective recovery evidence plus deprecated architecture patterns. | Keep for now. Do not include in runtime imports. Consider moving outside the active package in a later archive PR after proving no build or import effect. |

Before moving or deleting either recovery tree:

- prove active runtime imports do not reference it;
- prove build inputs and TypeScript configs do not include it;
- confirm no current roadmap item still needs selective recovery from it;
- retain a tagged archive or documented external archive location when product history matters;
- run full verification after any move.

## 5. Optional support artifacts

| Path | Classification | Evidence | Action |
| --- | --- | --- | --- |
| `artifacts/mockup-sandbox/` | `review-before-delete` | Optional visual exploration package outside root pnpm workspace. | Decide whether UI exploration still uses it. Archive or remove only through a dedicated cleanup PR. |
| `artifacts/rentrix-promo/` | `review-before-delete` | Optional promotional package outside root pnpm workspace. | Decide whether promotional use still exists. Archive or remove only through a dedicated cleanup PR. |

## 6. Generated analysis support

| Path | Classification | Evidence | Action |
| --- | --- | --- | --- |
| `understand-anything/` | `retain-generated-support` | Contains generated repository-understanding output. | Keep only while useful. Never treat as source of truth or import into runtime. |

## 7. Deployment and local-launch duplication to review

| Path | Classification | Evidence | Action |
| --- | --- | --- | --- |
| `artifacts/rentrix/vercel.json` | `review-before-delete` | App-local deployment config contains local output and SPA rewrite. Root `vercel.json` remains authoritative for repository-root deployment and adds install, build, and security headers. | Keep until deployment-root ownership is verified. Delete only when all active deployment workflows use repository root. |
| `.replit` | `retain-governance` | Explicit local launcher for `artifacts/rentrix`. | Retain unless local Replit workflow is intentionally retired. |

## 8. Historical documentation to organize later

| Path pattern | Classification | Action |
| --- | --- | --- |
| `docs/PHASE_*` | `move-or-archive` | Keep readable for now. Move under a historical archive category only through a dedicated docs-organization PR with link updates. |
| `docs/stabilization/` | `retain-governance` | Keep. It informs roadmap blockers. |
| `docs/wave1/` | `retain-governance` | Keep. It informs live rollout work. |
| `docs/reconciliation/` | `retain-governance` | Keep repository inventory and cleanup classification. |

## 9. Forbidden broad cleanup patterns

Do not:

- delete recovery trees because they look unused;
- import historical barrels into runtime while attempting cleanup;
- remove app-local deployment config before deployment-root verification;
- move historical docs without updating inbound links;
- delete vendored skills or source-lock files while onboarding references them;
- combine safe temp-file removal with archive moves or product code changes.

## 10. Cleanup order

Execute cleanup only in this order:

1. **Safe generated metadata cleanup** — remove tracked `supabase/.temp/*`, add ignore rule, verify.
2. **Deployment-root verification** — decide whether `artifacts/rentrix/vercel.json` remains necessary.
3. **Optional artifact decision** — archive or remove mockup and promo packages only if no owner workflow uses them.
4. **Historical documentation organization** — move old loose reports only after link inventory.
5. **Recovery-source archive decision** — move or archive recovery trees only after selective recovery work is demonstrably exhausted.

Each step must be a separate narrow reviewed PR.
