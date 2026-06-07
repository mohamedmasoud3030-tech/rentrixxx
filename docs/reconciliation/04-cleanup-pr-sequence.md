# Cleanup PR Sequence

Date: 2026-06-07

Base audit: `docs/reconciliation/03-repository-structure-audit.md`

Principle: every cleanup must be a narrow reviewed PR. Do not combine generated-file deletion, deployment changes, optional artifact decisions, archive moves, runtime edits, migrations, or CI changes.

## 1. PR 1: Delete tracked Supabase temp metadata

PR title: `Cleanup: remove tracked Supabase temp metadata`

Objective: remove generated local Supabase metadata from Git and prevent it from being tracked again.

Exact files or folders affected:

- Delete `supabase/.temp/pooler-url`.
- Delete `supabase/.temp/postgres-version`.
- Delete `supabase/.temp/gotrue-version`.
- Delete `supabase/.temp/cli-latest`.
- Add `supabase/.temp/` to `.gitignore`.

Why it is safe or why it requires review:

- The four files are one-line local generated Supabase metadata.
- Dependency search found no runtime import, TypeScript scope, build input, package script, CI use, Vercel/Replit use, route use, or migration dependency.
- `docs/ROOT_LAYOUT.md` already states `supabase/.temp/` is generated local state, not product architecture.

Verification commands:

```bash
rg -n --fixed-strings 'supabase/.temp' package.json pnpm-workspace.yaml tsconfig.json tsconfig.base.json artifacts/rentrix/package.json artifacts/rentrix/tsconfig.json artifacts/rentrix/tsconfig.test.json artifacts/rentrix/vite.config.ts .github/workflows vercel.json artifacts/rentrix/vercel.json .replit .gitignore scripts supabase artifacts/rentrix/src lib docs/ai docs/ROOT_LAYOUT.md docs/RENTRIX_MASTER_PLAN.md docs/reconciliation/02-root-cleanup-candidates.md README.md AGENTS.md
git ls-files supabase/.temp
git diff --check
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
```

Expected CI gate: full GitHub Actions gate in `.github/workflows/ci.yml`.

Rollback plan: restore the four deleted files from the previous commit and remove the `.gitignore` entry.

Dependencies: none.

Human approval required? No product decision required, but review is still required before merge.

## 2. PR 2: Verify deployment root and decide app-local Vercel config

PR title: `Docs: record deployment-root ownership for Vercel config`

Objective: prove whether Vercel deploys from repository root or `artifacts/rentrix`, then document the authority before any deletion.

Exact files or folders affected:

- Likely documentation only under `docs/reconciliation/` or `docs/demo-gates/`.
- No config deletion in this PR unless deployment owners explicitly approve.
- Candidate for later deletion only: `artifacts/rentrix/vercel.json`.

Why it is safe or why it requires review:

- Root `vercel.json` contains install command, build command, output directory, SPA rewrite, and security headers.
- App-local `artifacts/rentrix/vercel.json` contains only local output and SPA rewrite.
- Removing the app-local file is safe only if every active Vercel workflow uses repository root.

Verification commands:

```bash
sed -n '1,220p' vercel.json
sed -n '1,220p' artifacts/rentrix/vercel.json
rg -n 'artifacts/rentrix/vercel.json|vercel.json|outputDirectory|buildCommand' docs README.md AGENTS.md .github artifacts/rentrix -g '!artifacts/rentrix/node_modules/**'
pnpm build
git diff --check
```

Expected CI gate: docs-only PR can use `git diff --check`; if config changes are made later, run the full CI gate.

Rollback plan: revert the docs/config decision commit; restore app-local Vercel config if deleted in a later PR.

Dependencies: PR 1 can happen first but is not required.

Human approval required? Yes, deployment owner must confirm actual Vercel project root.

## 3. PR 3: Decide Replit metadata ownership

PR title: `Docs: record Replit launcher and artifact ownership`

Objective: determine whether `.replit` and `artifacts/rentrix/.replit-artifact/` are both still required.

Exact files or folders affected:

- `.replit`
- `.replitignore`
- `artifacts/rentrix/.replit-artifact/artifact.toml`
- Documentation under `docs/reconciliation/` if needed.

Why it is safe or why it requires review:

- `.replit` is documented as a local launcher only and currently runs the active app.
- App-local artifact metadata may be required by Replit previews even though it is not CI/runtime code.

Verification commands:

```bash
sed -n '1,220p' .replit
sed -n '1,220p' artifacts/rentrix/.replit-artifact/artifact.toml
rg -n '.replit|.replit-artifact|artifact.toml' . -g '!node_modules/**' -g '!artifacts/rentrix/node_modules/**' -g '!.git/**'
git diff --check
```

Expected CI gate: docs-only PR can use `git diff --check`; any config removal should run full CI and a Replit smoke check.

Rollback plan: restore removed Replit files from the previous commit.

Dependencies: none.

Human approval required? Yes, Replit workflow owner must confirm.

## 4. PR 4: Classify app-root recovery/status markdown

PR title: `Docs: classify app-root historical reports`

Objective: decide whether loose markdown files in `artifacts/rentrix/` belong in `docs/archive/`, `archive/recovery/`, in place, or can be deleted later.

Exact files or folders affected:

- `artifacts/rentrix/FALLBACK_WORKFLOW.md`
- `artifacts/rentrix/FIGMA_VISUAL_DIRECTION.md`
- `artifacts/rentrix/OLD_BUT_GOLD_DIRECT_PORT_AUDIT.md`
- `artifacts/rentrix/P1_C_UI_COMPONENTS_STATUS.md`
- `artifacts/rentrix/PR_567_DECOMPOSITION.md`

Why it is safe or why it requires review:

- These are documentation/reference files, not active runtime imports.
- They may contain recovery or design context, so deletion requires review.

Verification commands:

```bash
git ls-files 'artifacts/rentrix/*.md'
rg -n 'FALLBACK_WORKFLOW|FIGMA_VISUAL_DIRECTION|OLD_BUT_GOLD_DIRECT_PORT|P1_C_UI_COMPONENTS_STATUS|PR_567_DECOMPOSITION' . -g '!node_modules/**' -g '!artifacts/rentrix/node_modules/**' -g '!.git/**'
git diff --check
```

Expected CI gate: `git diff --check` for docs-only classification. If files are moved later, run link checks/searches and the relevant docs checks.

Rollback plan: restore moved/deleted docs from the previous commit.

Dependencies: none.

Human approval required? Yes, for archive/delete decisions.

## 5. PR 5: Decide optional artifact ownership

PR title: `Docs: decide optional artifact ownership`

Objective: determine whether `artifacts/mockup-sandbox/` and `artifacts/rentrix-promo/` remain useful, should be archived, should move to separate repositories, or can be removed.

Exact files or folders affected:

- `artifacts/mockup-sandbox/`
- `artifacts/rentrix-promo/`
- Documentation under `docs/reconciliation/` if needed.

Why it is safe or why it requires review:

- Both have standalone package files and Vite configs but are not root workspace members.
- They may support design exploration or promotion workflows outside production runtime.

Verification commands:

```bash
rg -n 'mockup-sandbox|rentrix-promo|@workspace/mockup-sandbox|@workspace/rentrix-promo' . -g '!node_modules/**' -g '!artifacts/rentrix/node_modules/**' -g '!.git/**'
git ls-files artifacts/mockup-sandbox artifacts/rentrix-promo
pnpm install --frozen-lockfile
pnpm build
git diff --check
```

Expected CI gate: docs-only ownership PR can use `git diff --check`; archive/delete PR should run full CI and preserve assets externally if approved.

Rollback plan: restore optional artifact folders from previous commit or external archive.

Dependencies: PR 1 recommended first.

Human approval required? Yes, design/marketing owner decision required.

## 6. PR 6: Review app-local shadowed contract engine

PR title: `Docs: decide legacy contract engine disposition`

Objective: determine whether `artifacts/rentrix/core/contracts/ContractEngine.ts` should be archived, retained as recovery source, or removed.

Exact files or folders affected:

- `artifacts/rentrix/core/contracts/ContractEngine.ts`

Why it is safe or why it requires review:

- It is outside active `src`, not in app TypeScript include, and no active references were found.
- It imports legacy `AppContextType`/`dataService` patterns, which are prohibited for active runtime restoration.
- It may still have recovery value for contract behavior comparison.

Verification commands:

```bash
rg -n 'ContractEngine|core/contracts|AppContextType|dataService' . -g '!node_modules/**' -g '!artifacts/rentrix/node_modules/**' -g '!.git/**'
pnpm typecheck
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
git diff --check
```

Expected CI gate: full CI if the file is moved or deleted.

Rollback plan: restore the file from the previous commit.

Dependencies: none.

Human approval required? Yes, domain/recovery review required.

## 7. PR 7: Decide active-app sparse support folders

PR title: `Docs: decide sparse active-app support folders`

Objective: decide whether `src/db/local-cache.ts` and `src/design-system/figmaVisualTokens.ts` are active future support or cleanup candidates.

Exact files or folders affected:

- `artifacts/rentrix/src/db/local-cache.ts`
- `artifacts/rentrix/src/design-system/figmaVisualTokens.ts`

Why it is safe or why it requires review:

- `src/db/local-cache.ts` is TypeScript-included but no active consumer was found.
- `src/design-system/figmaVisualTokens.ts` is TypeScript-included but no active consumer was found.
- Both live under active `src`, so deletion requires stricter import, TypeScript, build, route, and test evidence plus human decision.

Verification commands:

```bash
rg -n 'rentrixCache|local-cache|@/db|figmaVisualTokens|@/design-system|src/design-system' artifacts/rentrix/src artifacts/rentrix/package.json artifacts/rentrix/tsconfig.json artifacts/rentrix/tsconfig.test.json artifacts/rentrix/vite.config.ts docs
pnpm --filter ./artifacts/rentrix run typecheck
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
git diff --check
```

Expected CI gate: full CI for any deletion under active `src`.

Rollback plan: restore files from the previous commit.

Dependencies: none.

Human approval required? Yes, product/design/engineering decision required.

## 8. PR 8: Archive or externalize broad recovery trees

PR title: `Archive: move reviewed recovery sources`

Objective: after selective recovery value is exhausted or externally preserved, move or remove broad recovery trees.

Exact files or folders affected:

- `.migration-backup/`
- `artifacts/rentrix/legacy-src/`

Why it is safe or why it requires review:

- These paths are not active runtime/build inputs, but they contain large amounts of historical source, docs, tests, skills, Supabase, Prisma, SDK, workflows, and scripts.
- They carry high recovery value and high confusion risk.

Verification commands:

```bash
rg -n '.migration-backup|legacy-src' package.json pnpm-workspace.yaml tsconfig.json tsconfig.base.json artifacts/rentrix/package.json artifacts/rentrix/tsconfig.json artifacts/rentrix/tsconfig.test.json artifacts/rentrix/vite.config.ts .github/workflows vercel.json artifacts/rentrix/vercel.json .replit scripts supabase artifacts/rentrix/src lib docs README.md AGENTS.md
git ls-files .migration-backup artifacts/rentrix/legacy-src
git log --oneline --stat -- .migration-backup artifacts/rentrix/legacy-src
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
git diff --check
```

Expected CI gate: full GitHub Actions gate plus explicit archive/tag evidence.

Rollback plan: restore the recovery trees from the previous commit or tagged archive.

Dependencies: only after lower-risk cleanup and explicit human approval.

Human approval required? Yes, strongly required.

## 9. PR 9: Organize historical documentation

PR title: `Docs: organize historical reports`

Objective: move old loose reports only after a link inventory proves references can be updated safely.

Exact files or folders affected:

- `docs/PHASE_*`
- `docs/stabilization/`
- `docs/wave1/`
- Other historical reports discovered by link inventory.

Why it is safe or why it requires review:

- Historical docs are not runtime inputs, but many current policy and roadmap files reference stabilization, wave, and reconciliation evidence.

Verification commands:

```bash
rg -n 'PHASE_|docs/stabilization|docs/wave1|docs/reconciliation|CONSTRAINED_BETA|RENTRIX_CODE_INVENTORY' docs README.md AGENTS.md .ai .github artifacts/rentrix -g '!artifacts/rentrix/node_modules/**'
git diff --check
```

Expected CI gate: docs-only checks plus full link/reference search.

Rollback plan: restore file locations and links from previous commit.

Dependencies: after recovery and optional artifact decisions, unless limited to documentation index corrections.

Human approval required? Yes, documentation owner review required.
