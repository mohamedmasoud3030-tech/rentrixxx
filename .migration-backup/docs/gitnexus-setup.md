# GitNexus setup for this repository

This project is configured to work with **GitNexus** so future coding/debug sessions can use repository-aware MCP context.

## Why

GitNexus builds a local knowledge graph for the repo and exposes it to coding agents via MCP.

## One-time setup (global)

Run once on your machine:

```bash
npm run gitnexus:setup
```

Then register MCP for Codex (if not auto-detected):

```bash
codex mcp add gitnexus -- npx -y gitnexus@latest mcp
```

## Per-repo indexing

From the repository root:

```bash
npm run gitnexus:analyze
```

This indexes the codebase into a local `.gitnexus/` folder (gitignored).

## Useful commands

```bash
npm run gitnexus:status   # Check index status
npm run gitnexus:mcp      # Start MCP server manually (stdio)
```

## Suggested routine

- Run `npm run gitnexus:analyze` after major refactors.
- Re-run when MCP reports stale index.
- Keep using `npx -y gitnexus@latest` to always get the latest fixes.
