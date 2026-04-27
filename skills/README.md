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
