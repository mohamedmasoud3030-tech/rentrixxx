# Rentrix Codex Agent Guide

Codex-specific guidance for this repository. Shared product, security, roadmap, and verification rules live in `docs/ai/AGENT_OPERATING_PROTOCOL.md`.

## 1. Entry point

Codex CLI and generic coding agents start from `AGENTS.md`.

Follow the Codex CLI operating model from:

```text
https://github.com/shanraisshan/codex-cli-best-practice
```

Adapt that model to Rentrix by keeping work source-driven, phase-sized, locally verified, and bounded to the active roadmap.

## 2. Context loading

Before edits, read the required Rentrix files listed in `AGENTS.md` and `docs/ai/AGENT_OPERATING_PROTOCOL.md`.

Use `rg` and `rg --files` for repository inspection. Do not infer active behavior from old reports, recovery references, or historical pull requests.

Load only relevant skills from `docs/ai/AGENT_CAPABILITIES.md`. Do not import agent-tooling files into production code.

## 3. Codex execution model

Work in small, reviewable steps inside one coherent phase objective.

Before editing, state the intended file set and confirm it is inside the allowed task scope.

Use local tools for verification whenever possible. If a check cannot run because of missing dependencies, network, credentials, or environment limits, report that explicitly instead of implying success.

Use non-interactive commands. Prefer `apply_patch` for manual edits. Avoid destructive Git operations.

## 4. Branch and PR handoff

Keep one branch and one PR per phase. Review `git status`, `git diff --stat`, and focused patches before committing.

For docs-only changes, do not run Supabase Cloud, Vercel, live SQL, production checks, or runtime deployments.

Use a clear PR title and body that describe scope, verification, and any skipped checks.
