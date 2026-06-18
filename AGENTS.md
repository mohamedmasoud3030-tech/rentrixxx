# Rentrix Agent Entry Point

Primary entrypoint for Codex CLI and generic coding agents.

## Codex operating model

Codex CLI agents must follow the operating model from:

```text
https://github.com/shanraisshan/codex-cli-best-practice
```

Apply that model through the Rentrix-specific rules in:

```text
docs/ai/AGENT_OPERATING_PROTOCOL.md
docs/ai/CODEX_AGENT_GUIDE.md
```

Claude Code agents should start from `CLAUDE.md` instead.

## Required reading before edits

Read these files before non-trivial repository changes:

1. `README.md`
2. `docs/ai/CURRENT_EXECUTION_CONTEXT.md`
3. `docs/ai/ONBOARDING.md`
4. `docs/RENTRIX_MASTER_PLAN.md`
5. `docs/ai/AGENT_OPERATING_PROTOCOL.md`
6. `docs/ai/CODEX_AGENT_GUIDE.md`
7. `docs/ai/AGENT_CAPABILITIES.md`
8. `docs/ai/GIT_TOOLING_POLICY.md`
9. `.ai/workflows/README.md`

Use actual code and migrations as the source of truth. Prefer `rg` and `rg --files`.

## Runtime boundary

Canonical runtime paths:

```text
artifacts/rentrix/
lib/
supabase/
```

The active app is `artifacts/rentrix/`. Preserve TanStack Router, React Query, Supabase, PWA, RTL, and i18n direction.

Agent tooling paths such as `.agents/`, `.agent-skills/`, `.ai/`, and `.codex/vendor/` are not runtime code.

## Product boundary

Rentrix is Arabic-first, safe for English/LTR usage, and single-office only.

Do not introduce SaaS multi-tenancy, organizations, memberships, subscriptions, or organization-scoped runtime behavior.

Do not introduce a general accounting ledger, accounting finality, profit, net income, payout readiness, or owner settlement claims unless the feature is fully implemented, calculation-backed, verified, and explicitly approved.

## Domain invariants

- A property owns units.
- A contract references exactly one unit and one tenant.
- A payment belongs to exactly one contract.
- A receipt is generated only from a posted payment.
- Active contracts for the same unit must not overlap.
- Orphan chains are not allowed.
- Posted payments are immutable.
- Corrections use reversal and replacement.
- Outstanding balance is derived through one canonical calculation path and is never edited manually.

## Execution rules

- Follow the documented next phase in `docs/RENTRIX_MASTER_PLAN.md`.
- Work as one coherent phase-sized task; do not scatter micro-tasks.
- Use one coherent branch and one pull request per phase.
- Keep changes narrow and preserve dirty worktrees.
- Do not use Supabase Cloud, Vercel production, live SQL, or production configuration without explicit approval.
- Do not ask for secrets, tokens, passwords, admin credentials, Supabase keys, or Vercel keys in chat.
- Prefer local verification and report verification honestly.
- For branch, pull-request, CI, and merge work, follow `docs/ai/GIT_TOOLING_POLICY.md`.

## Verification

For runtime pull requests, use the current GitHub Actions gate from `.github/workflows/ci.yml`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
```

For docs-only changes, run focused documentation checks such as `git diff --check` and targeted file inspection unless runtime behavior changed.
