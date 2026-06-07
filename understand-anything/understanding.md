# /understand Snapshot

Date: 2026-05-25 (UTC)

## Installed Plugin State

- Plugin id: `understand-anything`
- Marketplace source: local plugin path `./understand-anything`
- Entrypoint command: `/understand`

## Workspace Understanding

- Monorepo root: `/workspace/rentrixxx`
- Main application package: `artifacts/rentrix`
- Root package manager: `pnpm@10.11.1`
- Root scripts include workspace build, lint, and typecheck orchestration.

## High-Signal Structure

- `artifacts/rentrix/`: active application package.
- `archive/recovery-reference/`: concise reference-only recovery notes.
- `.agents/plugins/marketplace.json`: plugin marketplace registry.
- `understand-anything/knowledge-graph.json`: plugin knowledge graph seed.

## Validation Commands (project guidance)

- `pnpm --filter ./artifacts/rentrix run typecheck`
- `pnpm --filter ./artifacts/rentrix run build`
- `pnpm --filter ./artifacts/rentrix run lint`

## Notes

This snapshot was generated locally to satisfy `/understand` by summarizing repository topology and command entrypoints currently available in this environment.
