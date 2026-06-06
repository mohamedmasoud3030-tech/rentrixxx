# Codex Vendor Skills

This repository keeps upstream skill/plugin references under `.codex/vendor/` so Codex can use them while working on Rentrix.

## Current sources

| Source | Upstream | Commit | Local path |
| --- | --- | --- | --- |
| OpenAI Build Web Apps | `openai/plugins/plugins/build-web-apps` | `dc902811491b3a724672e19dec103da57b4880e5` | `.codex/vendor/openai-build-web-apps` |
| Anthropic Agent Skills | `anthropics/skills/skills` | `6a5bb06904ab164a345e41c381fc9097954b83da` | `.codex/vendor/anthropic-skills/skills` |
| Addy Osmani Agent Skills | `addyosmani/agent-skills` | `5b4c6dade5e6b5a48067d08861a11732d8e3a2bf` | `.codex/vendor/addy-agent-skills` |

## Rules

- Keep upstream files unchanged.
- Keep Rentrix-specific guidance in `AGENTS.md` or docs only.
- Never import these files into the runtime app.
- Use `scripts/sync-codex-vendor-skills.sh` to refresh the local mirrors from the locked commits.
- For Addy Osmani Agent Skills, start with `skills/using-agent-skills/SKILL.md`, then load only the workflows relevant to the current task. Do not inject every workflow into every task.

## Why this exists

Codex can treat these sources similarly to Vercel/Supabase helper material: read them as task-specific guidance, then apply only the relevant guidance to Rentrix changes.

The Addy Osmani pack is bootstrap-ready in the repository through its upstream meta-skill. Running the sync script refreshes the complete locked mirror.

## Validation

This PR is documentation/vendor-only. No runtime app files are changed, so build/typecheck is not required for app correctness. If a future PR uses these skills to change runtime code, run the normal Rentrix validation gates described in `AGENTS.md`.
