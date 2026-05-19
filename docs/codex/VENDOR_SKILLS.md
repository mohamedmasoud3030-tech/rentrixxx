# Codex Vendor Skills

This repository keeps upstream skill/plugin references under `.codex/vendor/` so Codex can use them while working on Rentrix.

## Current sources

| Source | Upstream | Commit | Local path |
| --- | --- | --- | --- |
| OpenAI Build Web Apps | `openai/plugins/plugins/build-web-apps` | `dc902811491b3a724672e19dec103da57b4880e5` | `.codex/vendor/openai-build-web-apps` |
| Anthropic Agent Skills | `anthropics/skills/skills` | `6a5bb06904ab164a345e41c381fc9097954b83da` | `.codex/vendor/anthropic-skills/skills` |

## Rules

- Keep upstream files unchanged.
- Keep Rentrix-specific guidance in `AGENTS.md` or docs only.
- Never import these files into the runtime app.
- Use `scripts/sync-codex-vendor-skills.sh` to refresh the local mirrors from the locked commits.

## Why this exists

Codex can treat these sources similarly to Vercel/Supabase helper material: read them as task-specific guidance, then apply only the relevant guidance to Rentrix changes.

## Validation

This PR is documentation/vendor-only. No runtime app files are changed, so build/typecheck is not required for app correctness. If a future PR uses these skills to change runtime code, run the normal Rentrix validation gates described in `AGENTS.md`.
