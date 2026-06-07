# Repository Structure Audit

Date: 2026-06-07

Audit branch: `docs/repository-structure-audit`

Base commit inspected: `e20f8c0554d71419440b91537e8f9d3a7d90fa35` (`Docs: make Rentrix onboarding roadmap-driven (#803)`)

Latest-main limitation: this checkout has no configured Git remote and no local `main` ref. `git remote show origin` failed with `fatal: 'origin' does not appear to be a git repository`, and `git rev-parse main` failed with `ambiguous argument 'main'`. Open PR inspection was therefore unavailable from this environment. The worktree was clean before the audit branch was created.

## 1. Executive summary

This audit confirms the current runtime boundary described by `AGENTS.md`, `README.md`, `docs/ai/ONBOARDING.md`, and `docs/ROOT_LAYOUT.md`:

```text
artifacts/rentrix/   active React application
lib/                shared workspace libraries
supabase/           canonical backend assets and migrations
```

The pnpm workspace includes only `artifacts/rentrix`, `lib/api-client-react`, and `lib/db`. The active Vite build root is `artifacts/rentrix`, and the active app entry point is `artifacts/rentrix/index.html` loading `src/index.tsx`.

No runtime file was deleted, moved, renamed, archived, or modified for this audit. The only recommended first cleanup PR remains the low-risk generated metadata cleanup already suggested by `docs/reconciliation/02-root-cleanup-candidates.md`: remove the four tracked `supabase/.temp/*` files and add `supabase/.temp/` to `.gitignore`, after dependency search and full CI.

Highest-confidence findings:

- `supabase/.temp/{pooler-url,postgres-version,gotrue-version,cli-latest}` are tracked local generated metadata and have no runtime, TypeScript, build, script, CI, Vercel, Replit, route, or migration dependency found in the inspected sources.
- `.migration-backup/` and `artifacts/rentrix/legacy-src/` are recovery sources only. They still contain unique recovery value, but active runtime must not import them wholesale.
- `artifacts/rentrix/core/contracts/ContractEngine.ts` is outside the active `src` tree, not included in workspace TypeScript scope, and references legacy `AppContextType`/`dataService` patterns. It should be reviewed for archive or removal separately, not restored into runtime.
- `artifacts/mockup-sandbox/` and `artifacts/rentrix-promo/` are optional support packages with standalone package files, but they are not root workspace members and are not production runtime.
- Root `vercel.json` is the repository-root deployment authority. `artifacts/rentrix/vercel.json` is only meaningful if a deployment is rooted at `artifacts/rentrix`.

## 2. Verified active architecture

Evidence:

- `pnpm-workspace.yaml` lists exactly `artifacts/rentrix`, `lib/api-client-react`, and `lib/db` as workspace packages.
- Root `package.json` runs recursive build and filters lint/typecheck to the active app.
- `artifacts/rentrix/package.json` defines active `dev`, `build`, `typecheck`, `typecheck:test`, `test`, `lint`, and `test:financials` scripts.
- `artifacts/rentrix/vite.config.ts` sets the Vite root to `artifacts/rentrix` and build output to `artifacts/rentrix/dist/public`.
- `artifacts/rentrix/index.html` loads `/src/index.tsx`; `src/index.tsx` renders `App`; `App.tsx` mounts `AppProviders` and `AppRouterProvider`.
- `artifacts/rentrix/src/routeTree.ts` registers the active TanStack Router routes, including the intentionally hidden deferred routes documented in onboarding.

Verified route shape:

- Active router: TanStack Router.
- Auth boundary: Supabase session checks in route `beforeLoad` handlers.
- Permission boundary: `requirePermission(...)` with `AppPermission` and `assertSessionPermission(...)`.
- Registered but hidden deferred routes remain present: `/lands`, `/leads`, `/maintenance`, `/commissions`, `/communication`, `/system`, `/audit-log`, `/data-integrity`.
- `/accounting` remains a redirect to `/financials`.

## 3. Full root tree classification

Legend for evidence columns: `Y` yes, `N` no evidence found, `Partial` limited or context-specific, `Docs` documentation-only references, `N/A` not applicable.

| Path | Classification | Current purpose | Runtime import? | TypeScript scope? | Build input? | Package/script ref? | CI ref? | Vercel/Replit ref? | Route ref? | Migration ref? | Docs ref? | Newer replacement? | Recovery value | Deletion or move risk | Recommended action | Required verification before action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AGENTS.md` | retain-governance | Canonical agent policy and repo boundary. | N | N | N | N | N | N | N | N | Y | N | Low | High governance risk. | Retain. | Review if operating policy changes. |
| `README.md` | retain-governance | Repository start page and architecture overview. | N | N | N | N | N | N | N | N | Y | N | Low | High onboarding risk. | Retain. | Update only with approved architecture changes. |
| `CLAUDE.md` | retain-governance | Compatibility entry point. | N | N | N | N | N | N | N | N | Y | N | Low | Low to medium governance risk. | Retain. | Search inbound references before any move. |
| `.agent-skills/` | retain-governance | Rentrix-owned reusable skill layer. | N | N | N | N | N | N | N | N | Y | N | Medium | Agent workflow breakage if removed. | Retain. | Confirm no production imports and no missing replacement skill. |
| `.agents/` | retain-governance | Installed/shared skills and connector helpers. | N | N | N | N | N | N | N | N | Y | N | Medium | Agent workflow and connector guidance risk. | Retain. | Confirm no production imports and no active connector dependency before pruning. |
| `.ai/` | retain-governance | Rentrix workflow definitions. | N | N | N | N | N | N | N | N | Y | N | Medium | Agent workflow risk. | Retain. | Review workflow references in `AGENTS.md` and onboarding. |
| `.codex/vendor/` | retain-governance | Source-locked upstream workflow references. | N | N | N | N | N | N | N | N | Y | N | Medium | Agent workflow and source-lock risk. | Retain. | Use sync scripts only if documented references are missing. |
| `.github/` | retain-governance | CI and PR governance. | N | N | N | N | Y | N | N | N | Y | N | Low | High CI risk. | Retain. | Any CI change must pass workflow review. |
| `.migration-backup/` | retain-recovery-source | Broad historical app snapshot with old source, docs, skills, scripts, Prisma, Supabase files, SDKs, tests, workflows, and package files. | N | N | N | N | N | N | N | N | Y | Active app and canonical docs replace runtime pieces. | High | High if deleted before recovery review; confusion risk if retained indefinitely. | Keep for now; later external archive or archive folder only after tagged backup and review. | Prove no runtime/build/script/migration dependency; compare unique recovery modules; tag or externalize archive if moved. |
| `.npmrc` | retain-governance | Package-manager configuration. | N | N | Partial | Y | Partial | N | N | N | N | N | Low | Install behavior risk. | Retain. | Run full install gate before changes. |
| `.replit` | retain-governance | Local Replit launcher for active app. | N | N | N | N | N | Y | N | N | Y | N | Low | Local environment risk. | Retain while Replit workflow is used. | Verify Replit ownership before removal. |
| `.replitignore` | retain-governance | Replit ignore policy. | N | N | N | N | N | Partial | N | N | N | N | Low | Local environment risk. | Retain unless Replit workflow retired. | Verify Replit behavior. |
| `.gitignore` | retain-governance | Generated-file exclusion policy. | N | N | N | N | N | N | N | N | Y | N | Low | High repository hygiene risk. | Retain; add `supabase/.temp/` in first cleanup PR. | Run `git status --ignored` and dependency search. |
| `artifacts/rentrix/` | retain-runtime | Active React application package. | Y | Y | Y | Y | Y | Y | Y | N | Y | N | High | Critical runtime risk. | Retain. | Full CI gate for any runtime change. |
| `artifacts/mockup-sandbox/` | review-before-delete | Optional visual exploration package with standalone Vite setup. | N | N from root workspace | N from root build | Not root workspace | N | Local artifact metadata only | N | N | Y | Active app is replacement for production runtime. | Medium | Unknown owner/workflow risk. | Decide owner: retain, archive, separate repo, or delete in dedicated PR. | Confirm no current design workflow uses it; run search and optional package build if retained. |
| `artifacts/rentrix-promo/` | review-before-delete | Optional promotional/video support package with standalone Vite setup and assets. | N | N from root workspace | N from root build | Not root workspace | N | Local artifact metadata only | N | N | Y | Active app is replacement for product runtime. | Medium | Marketing/asset owner risk. | Decide owner: retain, archive, separate repo, or delete in dedicated PR. | Confirm no promo workflow uses it; preserve assets externally if removed. |
| `docs/` | retain-governance | Durable policy, roadmap, decisions, reconciliation, stabilization, wave evidence, demo gates, and historical reports. | N | N | N | N | N | N | N | N | Y | N | Medium | Governance and audit trail risk. | Retain; organize historical docs only in separate docs PR. | Link inventory before any move. |
| `lib/api-client-react/` | retain-runtime | Workspace shared API client utilities. | Y via app dependency | Y | Y via workspace build | Y | Y via root typecheck/build | N | N | N | Partial | N | Low | Runtime library risk. | Retain. | Run root typecheck/build. |
| `lib/db/` | retain-runtime | Workspace database package and Drizzle config. | N direct app import found | Y | Y via workspace build | Y | Y via root typecheck/build | N | N | Partial through DB workflows | Partial | N | Medium | Backend tooling risk. | Retain. | Run root typecheck/build and DB-specific validation before DB changes. |
| `node_modules/` | retain-generated-support | Local installed dependencies, untracked by Git. | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N | None | Do not track. | Keep untracked locally. | Use `pnpm install --frozen-lockfile` to regenerate. |
| `package.json` | retain-governance | Root scripts and dependency policy. | N | N | Y | Y | Y | Y via Vercel build command | N | N | Y | N | Low | High build/install risk. | Retain. | Full CI gate. |
| `pnpm-lock.yaml` | retain-governance | Locked dependency graph. | N | N | Y | Y | Y | Y | N | N | N | N | Low | High install reproducibility risk. | Retain. | `pnpm install --frozen-lockfile`. |
| `pnpm-workspace.yaml` | retain-governance | Workspace membership and catalog. | N | N | Y | Y | Y | Y | N | N | Y | N | Low | High workspace risk. | Retain. | Full CI gate. |
| `scripts/` | retain-governance | Approved vendor skill sync helpers. | N | N | N | N direct | N | N | N | N | Y | N | Medium | Agent tooling sync risk. | Retain. | Run only when referenced files are missing or refresh approved. |
| `sonar-project.properties` | retain-governance | Static-analysis scope. | N | N | N | N | N in GitHub Actions | N | N | N | Y | N | Low | Quality tooling risk if Sonar is active. | Retain unless Sonar retired. | Verify SonarCloud/project settings. |
| `supabase/` | retain-runtime | Canonical backend migrations, functions, config, and generated temp metadata. | N frontend imports | N | N | N | N in CI | N | N | Y | Y | N | High | Critical backend history risk. | Retain; only delete tracked `.temp` metadata in first cleanup PR. | Search dependencies, Supabase validation for schema/RLS changes. |
| `tsconfig.base.json` | retain-governance | Shared TypeScript defaults. | N | Y | Y | Y | Y | N | N | N | N | N | Low | High TS behavior risk. | Retain. | Full CI gate. |
| `tsconfig.json` | retain-governance | Root TypeScript project references for shared libs. | N | Y | Y | Y | Y | N | N | N | N | N | Low | High typecheck risk. | Retain. | `pnpm typecheck`. |
| `understand-anything/` | retain-generated-support | Generated repository understanding support. | N | N | N | N | N | N | N | N | Y | N | Low | Low runtime risk; possible analysis history loss. | Retain while useful; never source of truth. | Confirm no agent workflow relies on it before deletion. |
| `vercel.json` | retain-governance | Authoritative repository-root Vercel deployment config. | N | N | Y in Vercel | Y through Vercel install/build | N local CI | Y | N | N | Y | N | Low | High deployment/security-header risk. | Retain. | Verify actual Vercel project root before change. |

## 4. Active application folder classification

| Path | Folder status | Evidence | Recommended action |
| --- | --- | --- | --- |
| `artifacts/rentrix/src/app/` | active-runtime | Imported by `App.tsx`, route wrappers, and `routeTree.ts`; includes providers, router, dashboard, login, and not-found pages. | Retain. |
| `artifacts/rentrix/src/components/` | active-runtime | Imported by layouts, routes, features, error boundaries, and financial pages. | Retain. |
| `artifacts/rentrix/src/db/` | needs-human-decision | Included by `tsconfig.json`, but no active consumer of `rentrixCache` or `@/db` was found; current docs describe local-cache as an offline shell. | Do not delete without an explicit offline-cache product decision and fresh import/build/test evidence. |
| `artifacts/rentrix/src/design-system/` | needs-human-decision | Contains `figmaVisualTokens.ts`; no active import in `src` found. Related root markdown documents visual direction. | Decide whether tokens are active design reference, archive material, or deletion candidate in a later docs/design cleanup PR. |
| `artifacts/rentrix/src/features/` | active-runtime | Contains most registered page surfaces, services, hooks, and tests; heavily imported by routes and tests. | Retain. |
| `artifacts/rentrix/src/hooks/` | active-runtime | `use-auth.tsx` is imported by active providers/layouts and tied to Supabase session state. | Retain. |
| `artifacts/rentrix/src/integrations/` | active-runtime | Supabase client is imported by route guards and feature services. | Retain. |
| `artifacts/rentrix/src/layouts/` | active-runtime | Protected shell and navigation are imported by protected route and tested by `app-nav-items.test.ts`. | Retain. |
| `artifacts/rentrix/src/lib/` | active-runtime | Runtime environment, i18n, diagnostics, and helpers are imported by app entry, features, and services. | Retain. |
| `artifacts/rentrix/src/routes/` | active-runtime | Route modules are imported by `routeTree.ts`. Hidden deferred route files remain intentionally registered. | Retain. |
| `artifacts/rentrix/src/services/` | active-runtime | Auth and document/PDF services are imported by active hooks/features/tests. | Retain. |
| `artifacts/rentrix/src/store/` | active-runtime | `useUiStore` is imported by `app-shell.tsx` and settings. | Retain. |
| `artifacts/rentrix/src/styles/` | active-runtime | `globals.css` is imported by `src/index.tsx`. | Retain. |
| `artifacts/rentrix/src/test/` | active-but-stable | Test helper imported by contract tests and included by `tsconfig.test.json`, but not runtime. | Retain with tests. |
| `artifacts/rentrix/src/types/` | active-runtime | Domain and database types are imported by services, features, store, Supabase client, and tests. | Retain. |
| `artifacts/rentrix/src/App.tsx` | active-runtime | Main app component imported by `src/index.tsx`. | Retain. |
| `artifacts/rentrix/src/index.tsx` | active-runtime | Vite HTML entry script target. | Retain. |
| `artifacts/rentrix/src/routeTree.ts` | active-runtime | Canonical TanStack route registration and permission guard wiring. | Retain. |

## 5. Recovery-source analysis

### `.migration-backup/`

Classification: `retain-recovery-source`

Current contents include old source, docs, skills, GitHub workflows/scripts, Supabase files, Prisma files, SDKs, tests, public assets, package files, and deployment/config files. Active code, package scripts, TypeScript config, Vite config, CI, Vercel, Replit, route registration, and migrations do not reference `.migration-backup/`; only governance and reconciliation docs reference it.

Unique recovery value remains because it contains historical services, design-system files, Supabase functions/migrations/sql, tests, docs, and scripts that may be useful for selective comparison. It also contains obsolete or shadowed copies of skills, GitHub workflows, Supabase files, docs, source, Prisma, SDK, tests, scripts, package files, and deployment config.

Recommended action: keep temporarily. Later options, in order of safety, are external archive after a tag, move under an explicit archive/recovery location, or delete after recovery review proves no remaining value. Do not move or delete in this audit.

### `artifacts/rentrix/legacy-src/`

Classification: `retain-recovery-source`

The active app `tsconfig.json` explicitly excludes `legacy-src/**`; root package scripts and Vite build do not include it. Searches found no active runtime imports from `artifacts/rentrix/src` to `legacy-src`. The folder contains legacy app, contexts, hooks, services, UI, design system, security, finance, owner portal, reports, and tests. It also includes deprecated architecture patterns such as legacy `useApp`, `AppContext`, `dataService`, local database flows, and UI modules that must not be restored wholesale.

Recommended action: keep for now as recovery evidence. Because it is nested inside the active app package, it creates confusion risk. A later archive PR may move it outside `artifacts/rentrix/` only after proving no import, TypeScript, build, route, test, or recovery dependency remains.

## 6. Duplicate and shadowed file analysis

| Path | Classification | Analysis | Recommended later destination |
| --- | --- | --- | --- |
| `artifacts/rentrix/core/contracts/` | duplicate-or-shadowed | Outside active `src`, not in package TypeScript include, no active references found. `ContractEngine.ts` imports legacy `AppContextType`/`dataService` from `../../src/types`, which is incompatible with the current active architecture. | `archive/recovery/` or deletion after human review. |
| `artifacts/rentrix/FALLBACK_WORKFLOW.md` | review-before-delete | App-root markdown, docs only. References deployment/index fallback ideas. Not runtime. | `docs/archive/` or delete after review. |
| `artifacts/rentrix/FIGMA_VISUAL_DIRECTION.md` | review-before-delete | App-root visual direction doc, related to unused `figmaVisualTokens.ts`. Not runtime. | `docs/archive/` or retain if design reference remains active. |
| `artifacts/rentrix/OLD_BUT_GOLD_DIRECT_PORT_AUDIT.md` | retain-recovery-source | Recovery/reference report in app root. Not runtime. | `archive/recovery/` or `docs/archive/` after review. |
| `artifacts/rentrix/P1_C_UI_COMPONENTS_STATUS.md` | review-before-delete | App-root status report. Not runtime. | `docs/archive/` after link review. |
| `artifacts/rentrix/PR_567_DECOMPOSITION.md` | retain-recovery-source | PR decomposition/recovery note. Not runtime. | `archive/recovery/` or `docs/archive/` after review. |
| `artifacts/rentrix/.replit-artifact/` | review-before-delete | Replit artifact metadata for app. Not referenced by root package/CI, but paired with `.replit`. | Retain in place until Replit ownership is confirmed. |
| `artifacts/rentrix/vercel.json` | review-before-delete | App-local Vercel config with local output and SPA rewrite. Root `vercel.json` is authoritative from repository root. | Delete later only if all deployments use repository root. |

## 7. Optional artifact analysis

| Path | Classification | Current purpose | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
| `artifacts/mockup-sandbox/` | review-before-delete | Optional visual exploration app with Vite, generated mockup files, and Replit artifact metadata. | Has standalone `package.json`, `vite.config.ts`, `tsconfig.json`; not listed in root `pnpm-workspace.yaml`; no CI/root build membership found. | Needs human decision: still useful, archive candidate, separate-repository candidate, or safe-delete candidate after owner check. |
| `artifacts/rentrix-promo/` | review-before-delete | Optional promotional/video support app with assets and standalone Vite config. | Has standalone `package.json`, `vite.config.ts`, `tsconfig.json`, media assets, and Replit artifact metadata; not listed in root workspace; no CI/root build membership found. | Needs human decision: still useful, archive candidate, separate-repository candidate, or safe-delete candidate after marketing/asset owner check. |

## 8. Generated-file analysis

| Path | Classification | Evidence | Recommended action |
| --- | --- | --- | --- |
| `supabase/.temp/pooler-url` | safe-delete-proven | Tracked one-line local Supabase pooler metadata; no runtime/build/script/CI/deployment/route/migration dependency found. | First cleanup PR should delete from Git and ignore `supabase/.temp/`. |
| `supabase/.temp/postgres-version` | safe-delete-proven | Tracked generated local version metadata; no dependency found. | First cleanup PR should delete from Git and ignore `supabase/.temp/`. |
| `supabase/.temp/gotrue-version` | safe-delete-proven | Tracked generated local version metadata; no dependency found. | First cleanup PR should delete from Git and ignore `supabase/.temp/`. |
| `supabase/.temp/cli-latest` | safe-delete-proven | Tracked generated local CLI metadata; no dependency found. | First cleanup PR should delete from Git and ignore `supabase/.temp/`. |

The first cleanup PR should change nothing else.

## 9. Deployment-config duplication analysis

| Path | Classification | Authority | Evidence | Recommendation |
| --- | --- | --- | --- | --- |
| `vercel.json` | retain-governance | Authoritative when the Vercel project root is repository root. | Defines install command, build command, output directory `artifacts/rentrix/dist/public`, SPA rewrite, and security headers. Referenced by docs as authoritative. | Retain. |
| `artifacts/rentrix/vercel.json` | review-before-delete | App-local only if Vercel project root is `artifacts/rentrix`. | Defines only `dist/public` and SPA rewrite. Does not include root install/build/security headers. | Keep until actual Vercel project root is verified. |
| `.replit` | retain-governance | Root local launcher. | Runs `pnpm --filter @workspace/rentrix run dev` in `./artifacts/rentrix`, sets port/base path. | Retain while local Replit workflow is used. |
| `artifacts/rentrix/.replit-artifact/` | review-before-delete | App artifact metadata. | Defines web artifact, dev command, production build, public dir, rewrite, and port. | Retain until Replit artifact ownership is confirmed. |

## 10. Human decisions required

1. Decide whether `.migration-backup/` should remain in place, move to an external archive, move under a future archive folder, or be removed after a tagged backup.
2. Decide whether `artifacts/rentrix/legacy-src/` should remain nested under the active package or move outside `artifacts/rentrix/` in a later archive PR.
3. Decide whether `artifacts/rentrix/core/contracts/ContractEngine.ts` has remaining recovery value or can be archived/deleted.
4. Decide whether app-root markdown reports under `artifacts/rentrix/*.md` should move to `docs/archive/`, `archive/recovery/`, remain in place, or be deleted.
5. Decide whether optional artifacts `artifacts/mockup-sandbox/` and `artifacts/rentrix-promo/` have active owners or should be archived, split to separate repositories, or removed.
6. Decide whether `artifacts/rentrix/src/db/local-cache.ts` is part of a future offline/cache strategy or should later become a deletion candidate.
7. Decide whether `artifacts/rentrix/src/design-system/figmaVisualTokens.ts` is an active design reference or historical visual evidence.
8. Verify the actual Vercel project root before deleting `artifacts/rentrix/vercel.json`.
9. Verify Replit artifact ownership before deleting `.replit` or app-local `.replit-artifact` metadata.

## 11. Risks and unknowns

- Latest remote `main`, open PRs, and PR CI could not be inspected because the checkout has no configured remote.
- This audit is source-level and local. It does not prove external Vercel, Replit, Supabase, or GitHub settings.
- Generated analysis under `understand-anything/` was treated as orientation support only, not source of truth.
- Historical docs may contain stale instructions. Link inventory is required before moving `docs/PHASE_*`, `docs/stabilization/`, `docs/wave1/`, or app-root reports.
- Runtime deletion recommendations inside `artifacts/rentrix/src/` are intentionally conservative. `db` and `design-system` need human decisions before cleanup.
- Documentation consistency review covered `docs/ROOT_LAYOUT.md`, `docs/reconciliation/02-root-cleanup-candidates.md`, `docs/RENTRIX_MASTER_PLAN.md`, `docs/ai/ONBOARDING.md`, and `docs/ai/AGENT_CAPABILITIES.md`. The audit evidence confirmed their current repository-boundary statements, so this PR does not change them.

## 12. Evidence commands used and results

Commands run from `/workspace/rentrixxx`:

| Command | Result summary |
| --- | --- |
| `git status --short --branch` | Initial branch was `work`, clean. Audit branch later clean except docs changes. |
| `git branch --show-current` | Initial branch `work`; audit branch `docs/repository-structure-audit`. |
| `git rev-parse HEAD` | Base commit `e20f8c0554d71419440b91537e8f9d3a7d90fa35`. |
| `git rev-parse main` | Failed because no local `main` ref exists. |
| `git remote show origin` | Failed because no `origin` remote is configured. |
| `git fetch origin --prune` | Failed for the same missing remote. |
| `gh pr list --state open --limit 20 --json number,title,headRefName,baseRefName,url` | Not usable because remote access/configuration was unavailable. |
| `find .. -name AGENTS.md -print` | Found root `AGENTS.md` plus a nested skill-specific AGENTS file outside runtime scope. |
| `rg --files -g '!node_modules/**' -g '!artifacts/rentrix/node_modules/**'` | Found 843 non-node_modules files. |
| `git ls-files` | Found 1496 tracked files. |
| `git ls-files <path> \| wc -l` | Confirmed tracked file counts for root and special paths, including `.migration-backup` 441, `legacy-src` 286, `supabase/.temp` 4. |
| `sed -n ... package.json pnpm-workspace.yaml tsconfig*.json artifacts/rentrix/package.json artifacts/rentrix/tsconfig*.json` | Confirmed workspace membership, scripts, and TypeScript scopes. |
| `sed -n ... artifacts/rentrix/vite.config.ts .github/workflows/ci.yml vercel.json artifacts/rentrix/vercel.json .replit .gitignore` | Confirmed build root/output, CI gate, deployment duplication, Replit launcher, and missing `supabase/.temp/` ignore. |
| `sed -n ... artifacts/rentrix/src/routeTree.ts` | Confirmed active route registration and hidden deferred route presence. |
| `find artifacts/rentrix/src -maxdepth 1 -mindepth 1 -printf '%f\n'` | Confirmed active app folder list. |
| `rg -n '@/<folder>/' artifacts/rentrix/src ...` | Checked import evidence for active app folders. |
| `rg -n 'rentrixCache\|local-cache\|@/db' ...` | Found no active consumer of `src/db/local-cache.ts`; docs mention it as offline shell. |
| `rg -n 'figmaVisualTokens\|@/design-system' artifacts/rentrix/src ...` | Found no active consumer of `src/design-system/figmaVisualTokens.ts`. |
| `rg -n --fixed-strings '<special path>' package.json pnpm-workspace.yaml ...` | Checked active references for recovery, optional, generated, deployment, and Replit paths. |
| `git log --oneline --stat -- <path>` | Reviewed path history for active folders and special paths without using age as the deciding signal. |
| `git diff --check` | To be run after docs are written. |
