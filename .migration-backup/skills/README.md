# Skills Framework (Development-Time Only)

This `/skills` directory is an **optional, non-runtime** layer inspired by concepts from the `claude-skills` repository.

## Scope
- Agent/Codex workflow enhancement only
- Architecture analysis and refactor guidance
- Dependency graph inspection and code-quality checks

## Non-goals
- No production runtime integration
- No UI/business/service coupling
- No new runtime dependencies

## Usage
- Read `skills/registry.ts` for available skills and intent.
- Each skill has a `SKILL.md` playbook.
- Execute checks manually from terminal; these files are not imported by app runtime.

## Reuse Anthropic Skills Repository
If you want to leverage public skills from `anthropics/skills` inside this project workflow:

1. Run:
   - `npm run skills:import:anthropic`
2. Imported files are stored under (gitignored):
   - `skills/external/anthropics`
3. Optional overrides:
   - `ANTHROPIC_SKILLS_REF` (default: `main`)
   - `ANTHROPIC_SKILLS_PATH` (default: `skills`)

> This import is **development-time only** and does not affect production runtime.
