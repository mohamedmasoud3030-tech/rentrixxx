# Rentrix AI Operating Guide

This directory is the durable project context for coding agents. `AGENTS.md` is the canonical entry point. Keep this directory concise, current, and based on the active codebase.

## Required reading order

1. `product-scope.md`
2. `domain-rules.md`
3. `engineering-policy.md`
4. `release-policy.md`
5. `../decisions/README.md`
6. `../../.ai/workflows/README.md`

## Documentation rules

- Record stable product boundaries and business invariants here.
- Record durable architecture decisions under `docs/decisions/`.
- Put task-specific execution steps in `.ai/workflows/`.
- Do not duplicate long instructions across `AGENTS.md`, `CLAUDE.md`, and these files.
- Update these documents when an approved decision changes.