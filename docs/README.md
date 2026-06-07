# Rentrix Documentation Index

Use this page to navigate repository documentation without treating every historical report as current policy.

## Start here

1. `../AGENTS.md` — canonical repository operating policy.
2. `ai/ONBOARDING.md` — current constrained-beta application snapshot, full reading order, runtime boundaries, registered-but-hidden routes, and current CI gate.
3. `ROOT_LAYOUT.md` — root ownership and retention rules.

## Canonical guidance

1. `ai/product-scope.md` — approved product and constrained-beta scope.
2. `ai/domain-rules.md` — business invariants.
3. `ai/engineering-policy.md` — source-first change discipline.
4. `ai/security-policy.md` — sensitive boundaries.
5. `ai/testing-guide.md` — current verification expectations.
6. `ai/release-policy.md` — merge-readiness gate.
7. `decisions/README.md` — durable product and architecture decisions.
8. `codex/VENDOR_SKILLS.md` — source-locked workflow references.
9. `codex/SELECTED_AGENT_SKILLS.md` — optional additive references.

## Current operational evidence

```text
demo-gates/
reconciliation/
wave1/
```

Use `reconciliation/01-repository-inventory.md` as the detailed source map for runtime, recovery sources, and known duplication risks.

Use the Wave 1 documents before any live Supabase or Vercel rollout work:

```text
wave1/1A_CONTRACT_INTEGRITY_RECONCILIATION.md
wave1/1B_FINANCIAL_POSTING_DESIGN_RECONCILIATION.md
wave1/1C_AUTH_AND_RLS_HARDENING_PLAN.md
```

## Historical reports

Files named like `PHASE_*`, recovery audits, and completion reports are retained as historical evidence. Before acting on an older report, verify that the referenced route, module, schema, and migration are still active.

Prefer current code, migrations, `AGENTS.md`, `ai/ONBOARDING.md`, and `decisions/README.md` when conflicts exist.

## Placement rules

- Stable product policy belongs under `ai/` or `decisions/`.
- Runtime validation notes belong under `demo-gates/`.
- Repository comparisons belong under `reconciliation/`.
- Wave-specific rollout reconciliation belongs under `wave1/`.
- Avoid adding one-off reports loosely to the repository root.
