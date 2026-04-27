# Code Quality Checker Skill

## Goal
Standardize final validation for stabilization work.

## Validation Suite
1. `npm run -s type-check`
2. `npm run -s lint`
3. `npm run -s build`
4. Boundary checks via `rg` for forbidden import edges.

## Output
- List exact commands run
- Mark pass/fail
- Include any environment limitations explicitly
