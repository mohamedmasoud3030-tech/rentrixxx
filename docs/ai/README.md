# Rentrix AI Operating Guide

This directory is the durable project context for coding agents. `AGENTS.md` is the canonical repository policy. `ONBOARDING.md` is the canonical current application snapshot and reading sequence.

## Start here

1. Read `../../AGENTS.md`.
2. Read `ONBOARDING.md`.
3. Follow the full reading order listed in `ONBOARDING.md` before non-trivial edits.

`ONBOARDING.md` records the active runtime boundary, visible constrained-beta navigation, registered-but-hidden routes, authorization shape, domain invariants, and current CI verification gate.

## Durable policy files

- `product-scope.md` — approved product and constrained-beta scope.
- `domain-rules.md` — business invariants.
- `engineering-policy.md` — source-first implementation discipline.
- `security-policy.md` — sensitive surfaces and review rules.
- `testing-guide.md` — verification expectations.
- `release-policy.md` — merge-readiness requirements.
- `../decisions/README.md` — durable product and architecture decisions.
- `../../.ai/workflows/README.md` — narrow task workflows.

## Documentation rules

- Keep `ONBOARDING.md` current when approved changes alter visible navigation, registered deferred routes, runtime boundaries, authorization roles, the CI gate, or release-critical connector cautions.
- Record stable product boundaries and business invariants under `docs/ai/`.
- Record durable architecture decisions under `docs/decisions/`.
- Put task-specific execution steps in `.ai/workflows/`.
- Keep entry-point files short. Do not duplicate long reading lists or current-state snapshots across `AGENTS.md`, `CLAUDE.md`, `README.md`, and this file.
