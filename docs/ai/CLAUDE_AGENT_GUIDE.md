# Rentrix Claude Agent Guide

Claude Code-specific guidance for this repository. Shared product, security, roadmap, and verification rules live in `docs/ai/AGENT_OPERATING_PROTOCOL.md`.

## 1. Entry point

Claude Code starts from `CLAUDE.md`, not `AGENTS.md`.

Follow the Claude Code operating model from:

```text
https://github.com/shanraisshan/claude-code-best-practice
```

Apply that model within the Rentrix roadmap, product boundaries, and verification rules.

## 2. Memory and instructions

Keep `CLAUDE.md` short. Put shared Rentrix rules in `docs/ai/AGENT_OPERATING_PROTOCOL.md` and Claude-specific behavior in this file.

Do not duplicate large policy blocks in Claude memory files. Prefer links to canonical Rentrix docs so stale guidance is easy to find and update.

## 3. Claude Code execution model

Use Claude Code planning, agents, commands, skills, hooks, and memory only when they help the current phase-sized task.

Do not scatter work across unrelated micro-tasks. Keep a single coherent objective, then verify and hand off one PR.

Do not ask the user for secrets, tokens, passwords, admin credentials, Supabase keys, Vercel keys, or production access in chat.

## 4. Verification and handoff

Prefer local verification. For docs-only work, use focused documentation checks and final diff review.

If protected live verification is required, record it as blocked pending operator-provided evidence rather than using Supabase Cloud or Vercel production without approval.

Summarize changed files, verification performed, skipped checks, and the suggested PR title/body at handoff.
