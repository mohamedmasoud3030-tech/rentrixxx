# Understand Anything Plugin Setup

This repository registers the external `understand-anything` plugin from `Lum1104/Understand-Anything` in `.agents/plugins/marketplace.json`.

## Install and run

Use the plugin commands from the coding agent environment:

```text
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
/understand
```

According to the upstream project, `/understand` scans the project and writes the generated knowledge graph to:

```text
.understand-anything/knowledge-graph.json
```

## Important notes

- The repository-local `understand-anything/knowledge-graph.json` is only a seed/metadata graph and is not a replacement for running `/understand`.
- The marketplace entry intentionally points at the upstream GitHub source instead of a local plugin folder.
- Do not import plugin files into the Rentrix runtime app.
- Generated `.understand-anything/` outputs should be treated as analysis artifacts, not production runtime code.

## Rentrix usage

After installation, run `/understand` from the repository root to analyze the current `main` codebase. Use the generated graph to support the main-branch inventory, duplicate detection, and legacy recovery plan.
