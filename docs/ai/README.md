# Rentrix AI Operating Guide

This directory is the durable project context for coding agents. `AGENTS.md` is the canonical entry point. Keep this directory concise, current, and based on the active codebase.

## Required reading order

1. `product-scope.md`
2. `engineering-policy.md`
3. `release-checklist.md`
4. `../decisions/README.md`
5. `../../.ai/workflows/README.md`

## Documentation rules

- Record stable product boundaries and business invariants here.
- Record durable architecture decisions under `docs/decisions/`.
- Put task-specific execution steps in `.ai/workflows/`.
- Do not duplicate long instructions across `AGENTS.md`, `CLAUDE.md`, and these files.
- Update these documents when an approved decision changes.