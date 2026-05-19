# Rentrix Agent Instructions

## Codex vendor skills

Codex may use upstream agent/plugin skills vendored or source-locked under `.codex/vendor/`.

### Non-negotiable vendor policy

- Do not edit upstream skill/plugin files directly.
- Do not rewrite upstream skill text to make it Rentrix-specific.
- Put Rentrix-specific instructions in this `AGENTS.md`, project docs, or task prompts only.
- Do not import vendor skill files from the production app bundle.
- Treat `.codex/vendor/source-lock.json` as the source of truth for upstream repository, commit, and path.

### Available upstream sources

- OpenAI Build Web Apps plugin: `.codex/vendor/openai-build-web-apps/`
- Anthropic Agent Skills source lock and marketplace manifest: `.codex/vendor/anthropic-skills/`

### Rentrix project scope reminders

- Keep Rentrix small and focused.
- Do not restore legacy app architecture, legacy `useApp`, `AppContext`, `dataService`, local DB flows, or `react-router-dom` if the current app does not use them.
- Prefer focused PRs with clear boundaries.
- Run the relevant validation commands before merge when runtime code changes:
  - `pnpm --filter ./artifacts/rentrix run typecheck`
  - `pnpm --filter ./artifacts/rentrix run build`
  - `pnpm --filter ./artifacts/rentrix run lint`
  - targeted tests when applicable

### When to use the vendored/source-locked skills

- Use OpenAI `build-web-apps` guidance for frontend, React, shadcn/ui, Supabase/Postgres, browser testing, and web-app QA tasks.
- Use Anthropic skills as reference materials only when their task area matches the user request, especially document creation/editing, web testing, skill creation, and MCP builder workflows.
