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


## Note on bundled binary assets

To keep PRs reviewable and avoid binary upload issues, this vendored copy does **not** include `web-artifacts-builder/scripts/shadcn-components.tar.gz`.
The `init-artifact.sh` helper now continues without that optional tarball.


When the tarball is absent, `scripts/init-artifact.sh` prints a clear fallback notice, continues setup, and initializes/adds a starter shadcn/ui component set via CLI so projects are still usable.

To restore full original behavior (prebundled 40+ component extraction), place `shadcn-components.tar.gz` back at:

- `tools/agent-skills/anthropic/web-artifacts-builder/scripts/shadcn-components.tar.gz`

If you must track this binary in Git later, prefer Git LFS to keep repository diffs and review workflows manageable.
