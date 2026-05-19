# Codex Vendor Skill Sources

This directory is for upstream agent/plugin/skill references that Codex can use while working on Rentrix.

## Source policy

- Keep upstream skills/plugins unmodified.
- Put any Rentrix-specific routing, scope, or usage instructions in separate files outside the upstream mirrors.
- Do not mix these reference files with runtime application code.
- Do not import these files from the Rentrix app bundle.

## Vendored source groups

- `openai-build-web-apps/` tracks OpenAI `plugins/build-web-apps` at commit `dc902811491b3a724672e19dec103da57b4880e5`.
- `anthropic-skills/` tracks Anthropic `skills/skills` from `main`.

## Usage

Codex should read `AGENTS.md` first, then use the source manifests under each vendor group to locate the exact upstream skill/plugin materials needed for the task.
