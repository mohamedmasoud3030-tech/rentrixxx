# Rentrix Agent Instructions

## Read before editing

1. `docs/ai/README.md`
2. `docs/ai/product-scope.md`
3. `docs/ai/domain-rules.md`
4. `docs/ai/engineering-policy.md`
5. `docs/ai/release-policy.md`
6. `docs/decisions/README.md`
7. `.ai/workflows/README.md`

Inspect the repository root and the active app under `artifacts/rentrix/` before changing code. Use actual code as the source of truth. Prefer `rg` and `rg --files` for search.

## Product boundary

Rentrix is a focused single-office property operations system. It is Arabic-first with RTL support and must remain safe for English/LTR usage.

Do not reintroduce SaaS multi-tenancy. Do not wire a general accounting ledger during stabilization. Do not expand scope while performing audits, repairs, or release-readiness work.

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
- Treat migrations, RLS policies, and environment handling as sensitive boundaries.

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

## Working rules

- Preserve dirty worktrees and avoid destructive Git operations.
- Keep changes bounded and reviewable.
- Record durable product or architecture decisions under `docs/decisions/`.
- Select a workflow from `.ai/workflows/README.md` before implementation.
- Report exact blockers instead of guessing or hiding failed checks.

## Required verification

For runtime changes:

```bash
pnpm --filter ./artifacts/rentrix run typecheck
pnpm --filter ./artifacts/rentrix run build
pnpm --filter ./artifacts/rentrix run lint
pnpm --filter ./artifacts/rentrix run test
```

For schema or RLS changes, also run the repository-approved database validation flow when the local Supabase environment is available.
