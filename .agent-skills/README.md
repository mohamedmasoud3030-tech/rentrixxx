# Rentrix Agent Skills

This directory contains Rentrix-specific agent skills and operating guidance. These files are documentation and agent instructions only; they are not runtime app code and must not be imported by the Rentrix application.

## Skills

### `rentrix-build-web-apps`

Use `.agent-skills/rentrix-build-web-apps/SKILL.md` when Codex is asked to implement, modify, or review Rentrix UI/web app surfaces and prepare Vercel-ready PRs.

This skill covers Rentrix-specific expectations for:

- Following `docs/RENTRIX_MASTER_PLAN.md` and the current phase order
- Preserving TanStack Router, React Query, and Supabase service-module architecture
- Avoiding legacy patterns such as `useApp`, `AppContext`, `dataService`, local DB flows, `legacy-src`, and `react-router-dom`
- Maintaining Arabic-first, RTL-ready, and LTR-safe UI behavior
- Applying commercial screen readiness checks before PR handoff
- Reporting Vercel, Sonar, and Codacy status accurately

The skill is inspired structurally by a web-app-building plugin layout, but its content is written specifically for Rentrix and does not vendor or import external plugin code.
