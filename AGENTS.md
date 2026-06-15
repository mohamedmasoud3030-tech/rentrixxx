# Rentrix Agent Instructions

## Start here

1. Read `README.md`.
2. Read `docs/ai/ONBOARDING.md` for the current application snapshot and canonical reading order.
3. Read `docs/RENTRIX_MASTER_PLAN.md` for the active release, the next ready item, and the ordered path to `v1.0`.
4. Read `docs/ai/AGENT_CAPABILITIES.md` and load only the skills relevant to the task.
5. Read `docs/ai/GIT_TOOLING_POLICY.md` before branch, pull-request, CI, or merge work.
6. Inspect the repository root and the active app under `artifacts/rentrix/` before changing code.

Use actual code and migrations as the source of truth. Prefer `rg` and `rg --files` for search. Do not infer active behavior from historical reports, recovery folders, or old pull requests.

## Root boundary

- Treat `artifacts/rentrix/`, `lib/`, and `supabase/` as the canonical runtime boundary.
- Treat `artifacts/rentrix-promo/` as the retained optional promotional artifact.
- Treat `archive/recovery-reference/` as reference-only cleanup notes, not runtime code.
- Treat `.agents/`, `.agent-skills/`, `.ai/`, and `.codex/vendor/` as agent-tooling layers, not runtime code.
- Read `docs/ROOT_LAYOUT.md` before creating a new top-level folder or moving files between root categories.
- **`.migration-backup/` and `artifacts/rentrix/legacy-src/` no longer exist** (removed in PR #805). Do not reference them.

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
- Reuse archived recovery notes only after comparing them against current architecture and adapting deliberately.
- Treat migrations, RLS policies, auth boundaries, environment handling, and financial posting behavior as sensitive surfaces.

## Known release blockers and closed tech debt

- `useProperties.ts` / `use-properties.ts` and `useUnits.ts` / `use-units.ts` duplicate hook pairs were consolidated in v0.2. Current canonical hooks are `use-properties.ts` and `use-units.ts`.
- `database.ts` now includes `public.audit_log`; the audit service uses the generated database type directly.
- Live Supabase migration-state reconciliation and authenticated browser/manual QA remain blocked by dashboard/management API access and browser-driving capability, as documented in `docs/RENTRIX_MASTER_PLAN.md` and `docs/v01/migration-reconciliation-status.md`.

## Skills and workflows

- Select one primary workflow from `.ai/workflows/README.md` before implementation.
- For continuation requests, use the roadmap-continuation workflow and select the first ready item automatically.
- For non-trivial tasks, consult `.codex/vendor/addy-agent-skills/skills/using-agent-skills/SKILL.md`, then load only task-relevant skills.
- Use `docs/ai/AGENT_CAPABILITIES.md` as the task-to-skill map.
- Do not edit upstream skill or plugin files directly.
- Do not import agent-tooling files into the production bundle.
- If a referenced vendored skill is missing locally, run the documented sync script once when network access is available. Otherwise report the exact blocker.

## Git working rules

Follow `docs/ai/GIT_TOOLING_POLICY.md`.

- Preserve dirty worktrees.
- Keep branches, commits, and pull requests narrow.
- Read branch state, diff, patches, and fresh CI evidence before merging.
- Avoid destructive Git operations unless a documented branch refresh is required.
- Report exact blockers instead of guessing or retrying undocumented connector paths.

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

## Selected references

- Current snapshot: `docs/ai/ONBOARDING.md`
- Ordered roadmap: `docs/RENTRIX_MASTER_PLAN.md`
- Skill inventory: `docs/ai/AGENT_CAPABILITIES.md`
- Git policy: `docs/ai/GIT_TOOLING_POLICY.md`
- Root cleanup inventory: `docs/reconciliation/02-root-cleanup-candidates.md`
- Connector operations reference: `.agents/skills/connector-operator/SKILL.md`
