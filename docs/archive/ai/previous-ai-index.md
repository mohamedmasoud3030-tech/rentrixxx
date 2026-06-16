# Rentrix AI Operating Guide

This directory is the durable project context for coding agents. `AGENTS.md` is the canonical repository policy. `CURRENT_EXECUTION_CONTEXT.md` is the single current execution source of truth. `ONBOARDING.md` is the canonical current application snapshot and reading sequence.

## Start here

1. Read `../../AGENTS.md`.
2. Read `CURRENT_EXECUTION_CONTEXT.md`.
3. Read `ONBOARDING.md`.
4. Read `../RENTRIX_MASTER_PLAN.md` for the active release and next ready item.
5. Read `AGENT_CAPABILITIES.md` for the skill and tooling map.
6. Read `GIT_TOOLING_POLICY.md` before branch, PR, CI, or merge work.
7. Follow the full reading order listed in `ONBOARDING.md` before non-trivial edits.

`CURRENT_EXECUTION_CONTEXT.md` records current scope, blockers, next PR order, known contradictions, and future-agent rules. `ONBOARDING.md` records the active runtime boundary, visible constrained-beta navigation, registered-but-hidden routes, authorization shape, domain invariants, and current CI gate.

## Durable policy files

- `AGENT_CAPABILITIES.md` — project skills, installed additions, and task-to-skill matrix.
- `CURRENT_EXECUTION_CONTEXT.md` — current execution scope, blockers, contradictions, next PR order, and future-agent rules.
- `GIT_TOOLING_POLICY.md` — Git and GitHub usage rules.
- `SECURE_OPERATOR_RUNBOOK.md` — redacted Vercel/Supabase ownership evidence and connector-safe blocker reporting.
- `product-scope.md` — approved product and constrained-beta scope.
- `domain-rules.md` — business invariants.
- `engineering-policy.md` — source-first implementation discipline.
- `security-policy.md` — sensitive surfaces and review rules.
- `testing-guide.md` — verification expectations.
- `release-policy.md` — merge and release-readiness requirements.
- `../decisions/README.md` — durable product and architecture decisions.
- `../../.ai/workflows/README.md` — execution workflows.

## Documentation rules

- Keep `CURRENT_EXECUTION_CONTEXT.md` current when approved changes alter current execution scope, blockers, contradictions, next PR order, or future-agent rules.
- Keep `ONBOARDING.md` current when approved changes alter visible navigation, registered deferred routes, runtime boundaries, authorization roles, the CI gate, or release-critical connector cautions.
- Keep the ordered roadmap only in `../RENTRIX_MASTER_PLAN.md`.
- Record stable product boundaries and business invariants under `docs/ai/`.
- Record durable architecture decisions under `docs/decisions/`.
- Put task-specific execution steps in `.ai/workflows/`.
- Keep entry-point files short. Do not duplicate long reading lists or current-state snapshots across `AGENTS.md`, `CLAUDE.md`, `README.md`, and this file.
