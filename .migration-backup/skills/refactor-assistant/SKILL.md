# Refactor Assistant Skill

## Goal
Run safe, incremental refactors without runtime regressions.

## Workflow
1. Inventory import edges before change.
2. Apply smallest coherent step.
3. Re-run typecheck/lint/build.
4. Re-check dependency boundaries.
5. Commit only after clean verification.

## Guardrails
- Do not mix unrelated refactors.
- Prefer adapter/facade over direct low-level calls from UI.
- Keep behavior stable unless explicitly requested.
