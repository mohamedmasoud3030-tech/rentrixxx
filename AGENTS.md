# Rentrix Agent Instructions

## Start here

1. Read `README.md`.
2. Read `docs/ai/ONBOARDING.md` for the canonical reading order and the current constrained-beta application snapshot.
3. Inspect the repository root and the active app under `artifacts/rentrix/` before changing code.

Use actual code and migrations as the source of truth. Prefer `rg` and `rg --files` for search. Do not infer active behavior from historical reports, recovery folders, or old pull requests.

## Root boundary

- Treat `artifacts/rentrix/`, `lib/`, and `supabase/` as the canonical runtime boundary.
- Treat `artifacts/mockup-sandbox/` and `artifacts/rentrix-promo/` as optional support artifacts only.
- Treat `.migration-backup/` and `artifacts/rentrix/legacy-src/` as historical recovery sources only.
- Treat `.agents/`, `.agent-skills/`, `.ai/`, and `.codex/vendor/` as agent-tooling layers, not runtime code.
- Read `docs/ROOT_LAYOUT.md` before creating a new top-level folder or moving files between root categories.

## Product boundary

Rentrix is a focused single-office property operations system. It is Arabic-first with RTL support and must remain safe for English/LTR usage.

Do not reintroduce SaaS multi-tenancy. Do not wire a general accounting ledger during stabilization. Do not expand scope while performing audits, repairs, or release-readiness work.

The current visible constrained-beta navigation and the registered-but-hidden deferred routes are documented in `docs/ai/ONBOARDING.md`. Do not re-expose or delete deferred routes casually.

## Domain invariants

- A property owns units.
- A contract references exactly one unit and one tenant.
- A payment belongs to exactly one contract. Standalone payments are not allowed.
- A receipt is generated only from a posted payment.
- Active contracts for the same unit must not overlap.
- Orphan chains are not allowed: each unit has a property, each contract has a unit and tenant, each payment has a contract, and each property expense has a property.
- Posted payments are immutable. Corrections use reversal and replacement.
- Outstanding balance is derived through one canonical calculation path and is never edited manually.

## Active architecture constraints

- The active application is `artifacts/rentrix/`.
- Keep the current TanStack Router, React Query, Supabase, PWA, RTL, and i18n direction.
- Do not restore legacy `useApp`, `AppContext`, `dataService`, local database flows, or `react-router-dom` into the active app.
- Reuse legacy code only after comparing it against current architecture and adapting it deliberately.
- Treat migrations, RLS policies, auth boundaries, environment handling, and financial posting behavior as sensitive surfaces.

## Codex vendor skills

Codex may use upstream agent or plugin skills vendored or source-locked under `.codex/vendor/`.

- Do not edit upstream skill or plugin files directly.
- Do not rewrite upstream skill text to make it Rentrix-specific.
- Put Rentrix-specific instructions in this file, project docs, or task prompts.
- Do not import vendor skill files from the production bundle.
- Treat `.codex/vendor/source-lock.json` as the source of truth for upstream repository, commit, and path.

Available sources:

- OpenAI Build Web Apps plugin: `.codex/vendor/openai-build-web-apps/`
- Anthropic Agent Skills manifest: `.codex/vendor/anthropic-skills/`
- Addy Osmani Agent Skills: `.codex/vendor/addy-agent-skills/` (start with `skills/using-agent-skills/SKILL.md`)

## Working rules

- Preserve dirty worktrees and avoid destructive Git operations.
- Keep changes bounded and reviewable.
- Record durable product or architecture decisions under `docs/decisions/`.
- Select a workflow from `.ai/workflows/README.md` before implementation.
- For non-trivial engineering tasks, consult `.codex/vendor/addy-agent-skills/skills/using-agent-skills/SKILL.md`, then load only task-relevant workflows.
- If a referenced Addy workflow is missing locally, run `scripts/sync-codex-vendor-skills.sh` once. If GitHub access is unavailable, stop and report the exact blocker instead of guessing or retrying alternate routes.
- Report exact blockers instead of guessing or hiding failed checks.

## Required verification

For runtime pull requests, use the current GitHub Actions gate defined in `.github/workflows/ci.yml`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
```

For schema or RLS changes, also run the repository-approved database validation flow when the required local or preview Supabase environment is available.

## Optional selected references

- Current onboarding snapshot: `docs/ai/ONBOARDING.md`
- Bundle guide: `docs/codex/SELECTED_AGENT_SKILLS.md`
- Connector operations reference: `.agents/skills/connector-operator/SKILL.md`
