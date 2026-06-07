# Rentrix Build Web Apps Skill

## Purpose

Use this skill for Rentrix web UI, routing, data-flow, validation, responsive, RTL/LTR, and hosted-preview work. This file is agent guidance only and must not be imported into runtime code.

## Start before editing

1. Read `AGENTS.md`.
2. Read `docs/ai/ONBOARDING.md`.
3. Read `docs/RENTRIX_MASTER_PLAN.md`.
4. Identify the active release and first `READY` roadmap item.
5. Read `docs/ai/AGENT_CAPABILITIES.md` and load only task-relevant skills.
6. Read `docs/ai/GIT_TOOLING_POLICY.md` before branch, PR, CI, or merge work.
7. Inspect existing routes, components, hooks, services, utilities, and tests.
8. Reuse current patterns before creating new files.
9. Keep the PR limited to one roadmap slice.

## Architecture rules

- Keep the active app under `artifacts/rentrix/`.
- Keep TanStack Router, React Query, Supabase services, i18n, RTL, and PWA patterns.
- Do not create a parallel app or replace the shell.
- Do not restore legacy `react-router-dom`, `useApp`, `AppContext`, `dataService`, or local-DB patterns.
- Keep presentational components separate from data services.
- Keep registered-but-hidden routes hidden until their roadmap recovery item is approved.
- Do not mix unrelated domains in one PR.

## UI rules

- Build Arabic-first UI and keep English/LTR safe.
- Use logical layout classes where practical.
- Preserve loading, empty, error, retry, null-relation, responsive, and status states.
- Use shared money formatting and avoid hardcoded currency labels.
- Keep TypeScript explicit and avoid `any`.

## Companion skills

For visual or interaction work, read:

```text
.agents/skills/ui-ux-pro-max/SKILL.md
```

For React implementation or refactoring, read:

```text
.agents/skills/vercel-react-best-practices/SKILL.md
```

For connector work, read:

```text
.agents/skills/connector-operator/SKILL.md
```

Use the verification reference listed in `docs/ai/AGENT_CAPABILITIES.md` before claiming completion.

## Supabase boundary

- Keep migration, auth, RPC, and RLS work conservative and preview-first.
- Do not add schema work unless the roadmap slice and approval allow it.
- Preserve domain invariants and prevent orphan financial flows.

## Verification

Run the applicable GitHub Actions-equivalent gate:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
```

When a local checkout exists, also run:

```bash
git diff --check
rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true
```

Use targeted tests while editing and fresh full-gate evidence before handoff.

## Required report

State the active release, roadmap item, changed files, behavior changed, checks run, blockers, hosted-check notes, intentionally unchanged areas, and next roadmap item.
