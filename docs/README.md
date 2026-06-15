# Rentrix Documentation Index

Use this page to navigate repository documentation without treating every historical report as current policy. Older reports are historical snapshots, not current execution guidance, unless `ai/CURRENT_EXECUTION_CONTEXT.md` and active code/migrations verify the same fact.

## Start here

1. `../AGENTS.md` — canonical repository operating policy.
2. `ai/CURRENT_EXECUTION_CONTEXT.md` — single current execution source of truth for scope, blockers, contradictions, next PR order, and future-agent rules.
3. `ai/ONBOARDING.md` — constrained-beta application snapshot and reading order.
4. `RENTRIX_MASTER_PLAN.md` — final product shape, current release, ordered releases, acceptance gates, and continuation behavior.
5. `ai/AGENT_CAPABILITIES.md` — project skills, installed additions, and task-to-skill matrix.
6. `ai/GIT_TOOLING_POLICY.md` — Git and GitHub usage rules.
7. `ROOT_LAYOUT.md` — architectural tree, ownership, dependency direction, and retention rules.
8. `ai/SECURE_OPERATOR_RUNBOOK.md` — redacted constrained-beta environment ownership and connector-safe blocker reporting.

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
audits/
demo-gates/
reconciliation/
v01/
v02/
wave1/
```

Use:

```text
reconciliation/01-repository-inventory.md
reconciliation/02-root-cleanup-candidates.md
```

`audits/` holds dated, narrow follow-up audits (e.g. schema/migration integrity reviews) that produced migrations or other fixes. These are historical snapshots; verify the referenced migration and schema against `ai/CURRENT_EXECUTION_CONTEXT.md` and active code before relying on an older audit.

`v01/` and `v02/` hold dated status/review reports for specific v0.1 and v0.2 reconciliation threads (security, migrations, idempotency, mobile/RTL/money formatting). They are historical snapshots, not live policy; check `ai/CURRENT_EXECUTION_CONTEXT.md` first and `RENTRIX_MASTER_PLAN.md` second before acting on one.

Use `v01/first-client-delivery-plan.md` as a historical draft sequencing plan for converting the constrained-beta path into one real, paying first-client rollout. It does not replace `ai/CURRENT_EXECUTION_CONTEXT.md` or `RENTRIX_MASTER_PLAN.md`; it reorders existing v0.1, v0.4, and v0.5 scope around first-client delivery.

Use the Wave 1 documents as historical reconciliation inputs before any live Supabase or Vercel rollout work, then verify against `ai/CURRENT_EXECUTION_CONTEXT.md`, active code/migrations, and fresh connector evidence:

```text
wave1/1A_CONTRACT_INTEGRITY_RECONCILIATION.md
wave1/1B_FINANCIAL_POSTING_DESIGN_RECONCILIATION.md
wave1/1C_AUTH_AND_RLS_HARDENING_PLAN.md
```

Use `ai/SECURE_OPERATOR_RUNBOOK.md` for the current redacted Vercel/Supabase ownership registry and the connector blocker report template.

## Historical reports

Files named like `PHASE_*`, recovery audits, completion reports, and dated status or audit reports are retained as historical evidence. Before acting on an older report, verify that the referenced route, module, schema, migration, environment state, and product decision are still active.

Prefer current code, migrations, `AGENTS.md`, `ai/CURRENT_EXECUTION_CONTEXT.md`, `ai/ONBOARDING.md`, `RENTRIX_MASTER_PLAN.md`, and `decisions/README.md` when conflicts exist.

## Placement rules

- Stable product policy belongs under `ai/` or `decisions/`.
- Ordered roadmap work belongs only in `RENTRIX_MASTER_PLAN.md`.
- Runtime validation notes belong under `demo-gates/`.
- Repository comparisons and cleanup inventories belong under `reconciliation/`.
- Wave-specific rollout reconciliation belongs under `wave1/`.
- Dated narrow follow-up audits (schema, migrations, security, etc.) belong under `audits/`.
- v0.1/v0.2 dated status and review reports belong under `v01/`/`v02/`, not loose at the `docs/` root.
- Avoid adding one-off reports loosely to the repository root.
