# Rentrix Documentation Index

Use this page to navigate repository documentation without treating every historical report as current policy.

## Canonical guidance

1. `ROOT_LAYOUT.md` — root ownership and retention rules.
2. `ai/README.md` — durable coding-agent context.
3. `decisions/README.md` — active product and architecture decisions.
4. `codex/VENDOR_SKILLS.md` — source-locked workflow references.
5. `codex/SELECTED_AGENT_SKILLS.md` — optional additive references.

## Current operational evidence

```text
demo-gates/
reconciliation/
```

Use `reconciliation/01-repository-inventory.md` as the detailed source map for runtime, recovery sources, and known duplication risks.

## Historical reports

Files named like `PHASE_*`, recovery audits, and completion reports are retained as historical evidence. Before acting on an older report, verify that the referenced route, module, schema, and migration are still active.

Prefer current code, migrations, `AGENTS.md`, and `docs/decisions/README.md` when conflicts exist.

## Placement rules

- Stable product policy belongs under `docs/ai/` or `docs/decisions/`.
- Runtime validation notes belong under `docs/demo-gates/`.
- Repository comparisons belong under `docs/reconciliation/`.
- Avoid adding one-off reports loosely to the repository root.
