# Anthropic Skills (Vendored Copy)

These directories are vendored copies of selected Anthropic skills.

## Source

- Repository: https://github.com/anthropics/skills
- Source path: `skills/`

## Skills copied

- `frontend-design`
- `webapp-testing`
- `web-artifacts-builder`

## Why these are in-repo

They are stored in this repository for code review, auditability, and portability.

## Runtime activation notes

The active runtime skill location is usually `~/.agents/skills` unless your agent/CLI supports repo-local skill discovery.

Repo-local copies do not automatically activate in most setups. To activate manually, copy or symlink these directories into `~/.agents/skills`.
