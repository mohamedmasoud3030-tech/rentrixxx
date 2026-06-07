# Rentrix Documentation Index

Use this page to navigate repository documentation without treating every historical report as current policy.

## Start here

1. `../AGENTS.md` — canonical repository operating policy.
2. `ai/ONBOARDING.md` — current constrained-beta application snapshot and reading order.
3. `RENTRIX_MASTER_PLAN.md` — final product shape, current release, ordered releases, acceptance gates, and continuation behavior.
4. `ai/AGENT_CAPABILITIES.md` — project skills, installed additions, and task-to-skill matrix.
5. `ai/GIT_TOOLING_POLICY.md` — Git and GitHub usage rules.
6. `ROOT_LAYOUT.md` — architectural tree, ownership, dependency direction, and retention rules.
7. `ai/SECURE_OPERATOR_RUNBOOK.md` — redacted constrained-beta environment ownership and connector-safe blocker reporting.

## Canonical guidance

1. `ai/product-scope.md` — approved product and constrained-beta scope.
2. `ai/domain-rules.md` — business invariants.
3. `ai/engineering-policy.md` — source-first change discipline.
4. `ai/security-policy.md` — sensitive boundaries.
5. `ai/testing-guide.md` — current verification expectations.
6. `ai/release-policy.md` — merge and release-readiness gate.
7. `decisions/README.md` — durable product and architecture decisions, plus open decisions required.
8. `../.ai/workflows/README.md` — execution workflows, including roadmap continuation and safe root cleanup.
9. `codex/VENDOR_SKILLS.md` — source-locked workflow references.
10. `codex/SELECTED_AGENT_SKILLS.md` — optional additive references.

## Current operational evidence

```text
demo-gates/
reconciliation/
wave1/
```

Use:

```text
reconciliation/01-repository-inventory.md
reconciliation/02-root-cleanup-candidates.md
```

Use the Wave 1 documents before any live Supabase or Vercel rollout work:

```text
wave1/1A_CONTRACT_INTEGRITY_RECONCILIATION.md
wave1/1B_FINANCIAL_POSTING_DESIGN_RECONCILIATION.md
wave1/1C_AUTH_AND_RLS_HARDENING_PLAN.md
```

Also see `CONSTRAINED_BETA_LAUNCH_AUDIT_2026_06_06.md` for the most recent NO-GO live-environment audit.
Use `ai/SECURE_OPERATOR_RUNBOOK.md` for the current redacted Vercel/Supabase ownership registry and the connector blocker report template.

## Historical reports

Files named like `PHASE_*`, recovery audits, and completion reports are retained as historical evidence. Before acting on an older report, verify that the referenced route, module, schema, and migration are still active.

Prefer current code, migrations, `AGENTS.md`, `ai/ONBOARDING.md`, `RENTRIX_MASTER_PLAN.md`, and `decisions/README.md` when conflicts exist.

## Placement rules

- Stable product policy belongs under `ai/` or `decisions/`.
- Ordered roadmap work belongs only in `RENTRIX_MASTER_PLAN.md`.
- Runtime validation notes belong under `demo-gates/`.
- Repository comparisons and cleanup inventories belong under `reconciliation/`.
- Wave-specific rollout reconciliation belongs under `wave1/`.
- Avoid adding one-off reports loosely to the repository root.
