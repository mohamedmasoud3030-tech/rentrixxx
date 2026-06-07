# Selected Agent Skills Bundle

This bundle adds task-specific upstream skills without replacing or editing any existing Codex vendor bundle.

## Safety boundary

- Existing files under `.codex/vendor/` remain unchanged.
- Existing `scripts/sync-codex-vendor-skills.sh` remains unchanged.
- The selected bundle is additive and isolated under `.codex/vendor/selected-agent-skills/`.
- The selected sync script never deletes or overwrites an existing file.
- If a destination file already exists with different content, the sync script stops and reports the conflict.

## Locked sources

The source of truth is:

```text
.codex/vendor/selected-source-lock.json
```

The selected bundle includes:

| Source | Selected files | Purpose |
| --- | --- | --- |
| `obra/superpowers` | `verification-before-completion`, `using-git-worktrees`, `finishing-a-development-branch` | Fresh verification evidence and isolated branch / PR workflows |
| `mattpocock/skills` | `diagnose`, `zoom-out`, `handoff`, `write-a-skill` | Disciplined debugging, architecture context, session handoff, and local skill authoring |
| `pjt222/agent-almanac` | `troubleshoot-mcp-connection` | MCP troubleshooting reference |

## Materialize the selected upstream files

Run once in a Codex environment with GitHub network access:

```bash
bash scripts/sync-selected-agent-skills.sh
```

The script copies locked upstream files into:

```text
.codex/vendor/selected-agent-skills/
```

It is safe to run repeatedly when existing files are byte-identical. It stops instead of overwriting a differing local file.

## Local connector workflow

A Rentrix-specific connector policy is available immediately at:

```text
.agents/skills/connector-operator/SKILL.md
```

Use it for connector or MCP operations. It requires schema inspection, conservative error classification, one repeated call at most for temporary transport failures, and factual blocker reporting.

## Runtime boundary

These files are agent guidance only. Never import them into the Rentrix production bundle.
