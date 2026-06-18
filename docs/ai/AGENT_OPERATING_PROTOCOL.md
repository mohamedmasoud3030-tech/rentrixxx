# Rentrix Agent Operating Protocol

Shared operating rules for Codex CLI, Claude Code, and generic coding agents working in Rentrix.

## 1. Read before editing

Before non-trivial edits, read:

1. `AGENTS.md` for Codex CLI and generic agents, or `CLAUDE.md` for Claude Code.
2. `README.md`.
3. `docs/ai/CURRENT_EXECUTION_CONTEXT.md`.
4. `docs/ai/ONBOARDING.md`.
5. `docs/RENTRIX_MASTER_PLAN.md`.
6. `docs/ai/AGENT_CAPABILITIES.md`.
7. `docs/ai/GIT_TOOLING_POLICY.md`.
8. `.ai/workflows/README.md`.

Then load only task-relevant references and skills. Use active code, migrations, and tests as the source of truth.

## 2. Follow the next documented phase

Use `docs/RENTRIX_MASTER_PLAN.md` and `docs/ai/CURRENT_EXECUTION_CONTEXT.md` to identify the active release, blocked gates, and next ready work.

Do not invent a new roadmap lane when a documented next phase exists. If the requested work conflicts with the roadmap, report the conflict and ask for explicit product direction.

## 3. Work as one coherent phase-sized task

Keep each branch and pull request focused on one coherent phase-sized objective.

Do not create scattered micro-tasks, unrelated cleanup, opportunistic refactors, or multiple loosely connected PR slices. Split only when a real safety, review, or ownership boundary requires it.

Use one coherent branch and one pull request per phase.

## 4. Environment and secret safety

Do not use Supabase Cloud, Vercel production, live SQL, live production data, or production configuration without explicit approval.

Do not ask for secrets, tokens, passwords, admin credentials, Supabase keys, Vercel keys, service-role keys, or operator credentials in chat. If verification needs protected access, report the exact blocker and provide a safe local or operator-run alternative.

Do not mutate production configuration from an agent session.

## 5. Product boundaries

Rentrix is an Arabic-first, single-office property operations system. English/LTR behavior must remain safe.

Do not introduce SaaS, shared-database multi-tenancy, organizations, memberships, invitations, subscriptions, or organization-scoped runtime behavior.

Do not introduce ledger/accounting finality, profit, net income, payout readiness, owner settlement claims, or accounting-grade tax claims unless the capability is fully implemented, calculation-backed, tested, and explicitly approved.

Do not use `/accounting` as permission to build a general ledger; it currently redirects to `/financials`.

## 6. Domain invariants

Preserve these invariants:

- A property owns units.
- A contract references exactly one unit and one tenant.
- A payment belongs to exactly one contract.
- Standalone payments are not allowed.
- A receipt is generated only from a posted payment.
- Active contracts for the same unit must not overlap.
- Orphan chains are not allowed.
- Posted payments are immutable.
- Corrections use reversal and replacement.
- Outstanding balance is derived through one canonical calculation path and is never edited manually.

## 7. Local-first verification

Prefer local verification. Run the smallest meaningful checks for the change, then broader gates when runtime behavior, schema, RLS, financial posting, or release readiness is affected.

For docs-only changes, `git diff --check` plus targeted file inspection is usually sufficient unless the docs change commands, generated references, or release evidence.

For runtime pull requests, use the full gate in `.github/workflows/ci.yml` and mirrored in `README.md`.

Report verification honestly. Distinguish passed checks, failed checks, skipped checks, and environment limitations.

## 8. Git and PR discipline

Follow `docs/ai/GIT_TOOLING_POLICY.md` for branch, diff, CI, PR, and merge work.

Preserve dirty worktrees. Avoid destructive Git operations unless the user explicitly approves a documented branch refresh.

Before handoff, review the final diff and confirm it only contains intended files.
