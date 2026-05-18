# Rentrix Build Web Apps Skill

## Purpose

Use this skill when Codex is asked to build, modify, or review Rentrix web UI or app surfaces. It is a Rentrix-specific operating guide for safely delivering UI, routing, data, validation, and hosted-preview-ready changes without regressing the current application architecture.

This skill is for agent instructions only. It is not runtime application code and must not be imported by the Rentrix app.

## When to use

Use this skill for Rentrix tasks involving:

- Landing pages
- Dashboard screens
- Settings screens
- Properties and units screens
- Tenant and person screens
- Contracts screens
- Financial UI surfaces
- Shared UI components
- Responsive layout fixes
- Vercel preview readiness

## Pre-coding checklist

Before changing files, Codex must:

1. Read `docs/RENTRIX_MASTER_PLAN.md`.
2. Identify the current active phase from the master plan and the latest user-approved recovery task.
3. Confirm the requested task belongs to the current active phase or is explicitly approved by the user.
4. Inspect existing routes, components, hooks, services, utilities, and tests before adding new files.
5. Reuse existing UI components, layouts, hooks, services, and formatting helpers before creating duplicates.
6. Confirm forbidden areas for the task, including runtime domains, migrations, CI, dependency files, and unrelated screens.
7. Define the expected output before coding: affected phase item, files/areas expected to change, runtime behavior expected to change, validation commands, and PR notes.

Stop and report a blocker if the task conflicts with the active phase, requires unauthorized schema work, or would require replacing established architecture.

## Rentrix architecture rules

- Do not create a parallel app.
- Do not replace the app shell.
- Use TanStack Router where routing is already established.
- Use React Query for async data where established.
- Use Supabase service modules where established.
- Do not reintroduce `useApp`, `AppContext`, `dataService`, local DB patterns, `legacy-src`, or `react-router-dom`.
- Do not mock financial flows when real Supabase services exist.
- Do not query Supabase directly from presentational components when service modules or hooks already cover the data flow.
- Keep page components responsible for orchestration and keep presentational components focused.
- Do not mix unrelated domains in one PR.
- Preserve existing capabilities unless removal is explicitly requested.

## UI implementation rules

- Build Arabic-first UI.
- Keep layouts RTL-ready.
- Keep layouts LTR-safe where practical.
- Prefer logical Tailwind classes where safe, including:
  - `text-start` and `text-end`
  - `ms-*` and `me-*`
  - `start-*` and `end-*`
- Preserve current visual behavior unless a redesign is explicitly scoped.
- Do not mass-translate screens unless the active phase allows that work.
- Use Phase 3 i18n helpers for shared or core labels where appropriate.
- Use the normalized company settings contract where appropriate.
- Use centralized money formatting for money displays.
- Do not show money as plain numbers.
- Do not hardcode `OMR` in UI components.
- Keep TypeScript explicit and avoid `any`.
- Extract helpers for validation, filtering, formatting, state synchronization, safe URL handling, and payload conversion.

## Commercial readiness checklist

A Rentrix screen or UI change should include or preserve:

- Loading state
- Empty state
- Error state
- Retry action where appropriate
- Null relation handling
- Status badges where state matters
- Clear primary action
- Clear secondary actions
- Responsive layout
- RTL/LTR safety
- Currency-aware money display
- No orphan financial flows

## Vercel and hosted checks behavior

- After PR creation, wait for hosted checks.
- Vercel preview must be green before merge when applicable.
- If Vercel fails, inspect build logs before guessing.
- Do not claim screenshot or preview verification unless it was actually performed.
- If browser or screenshot tooling is unavailable, state that clearly in the PR notes and final response.

## Sonar and Codacy behavior

- A failing Quality Gate blocks merge.
- New Sonar issues should be fixed before merge.
- Fix Sonar and Codacy issues in the same PR unless the user explicitly says otherwise.
- Treat high-risk Codacy AI Review comments as blockers even if the regular issue count is zero.
- Prefer these common fixes:
  - Replace nested ternaries with guarded render blocks or named helper functions.
  - Replace duplicated JSX with extracted components, helpers, or table-driven rendering.
  - Replace duplicated tests with table-driven tests.
  - Remove unused imports, props, and variables.
  - Replace duplicated literals with constants, resource tables, or shared label maps.
  - Replace confusing negated conditions with positive booleans.

## Supabase safety

- Do not add schema changes or Supabase migrations unless explicitly approved.
- If a migration is needed, stop and report:
  - Why the migration is required
  - The exact proposed migration
  - Data impact
  - Rollback considerations
- Do not add payment, receipt, accounting, document, communications, or related schema outside approved phases.
- Do not make destructive migrations or delete backward-compatible fields unless explicitly approved.
- Do not add orphan financial records or flows.

## Required validation

Run and report these commands for tasks using this skill unless the user explicitly narrows validation or the environment prevents a command from running:

```bash
pnpm --filter ./artifacts/rentrix run typecheck
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix run build
pnpm --filter ./artifacts/rentrix run lint
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
git diff --check
rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true
```

If the task is docs-only or agent-instructions-only, still run `git diff --check` and the forbidden-pattern scan. Run the full Rentrix validation suite when the environment or task scope requires it.

## Required output

Every task using this skill must output:

- Real GitHub PR number/link
- Active phase
- Phase item completed
- Summary
- Changed files
- UI/runtime behavior changed
- Testing results
- Sonar/Codacy/Vercel notes
- Risks/notes
- What was intentionally not changed
- Next task according to plan
