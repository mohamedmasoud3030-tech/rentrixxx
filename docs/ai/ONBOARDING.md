# Rentrix Agent Onboarding

This is the canonical onboarding sequence and current application snapshot for coding agents. Read `AGENTS.md` first, then use this file before editing.

When documentation and code disagree, inspect the active code and migrations, report the mismatch, and update the stale documentation through a reviewed change. Do not guess from historical reports, recovery folders, or old pull requests.

## 1. Product boundary

Rentrix is an Arabic-first, single-office property operations system. English/LTR behavior must remain functional.

Keep the stabilization scope bounded:

- no SaaS multi-tenancy;
- no organizations, memberships, invitations, subscriptions, or organization-scoped runtime behavior;
- no accounting-grade ledger expansion;
- no blind restoration from legacy or backup code;
- no unrelated feature work during audits, repairs, or release-readiness tasks.

## 2. Canonical repository boundary

The shipped product boundary is:

```text
artifacts/rentrix/   # active React application
lib/                # shared workspace libraries
supabase/           # canonical migrations and backend assets
```

Other important categories:

```text
artifacts/rentrix-promo/        # optional promotional support only
archive/recovery-reference/     # concise reference-only recovery notes
.ai/                            # Rentrix-specific agent workflows
.agent-skills/                  # Rentrix-owned reusable skills
.agents/                        # installed or shared agent tooling
.codex/vendor/                  # source-locked upstream references
understand-anything/            # generated analysis support only
```

Do not import agent-tooling files, generated analysis artifacts, or historical recovery modules into the production bundle.

## 3. Current constrained-beta application snapshot

The active application is under `artifacts/rentrix/`. The visible desktop navigation currently exposes the verified operational flow only.

### Visible desktop navigation

```text
Dashboard
Properties
Units
People
Tenants
Owners
Owners Hub
Contracts
Financials
Invoices
Receipts
Expenses
Arrears
Reports
Change Password
Settings
```

### Visible mobile bottom navigation

```text
Dashboard
Properties
Contracts
Financials
Arrears
```

### Registered but intentionally hidden routes

The following routes remain registered in `artifacts/rentrix/src/routeTree.ts`, but they are intentionally hidden from visible constrained-beta navigation until they are separately verified and approved:

```text
/lands
/leads
/maintenance
/commissions
/communication
/system
/audit-log
/data-integrity
```

Do not delete these routes merely because they are hidden. Do not re-expose them in navigation merely because they remain registered.

`/accounting` remains registered only as a redirect to `/financials`. Do not wire a general ledger while stabilization is active.

### Current routing and authorization shape

- TanStack Router is the active router.
- Protected routes require a Supabase session.
- Permissioned routes use `requirePermission(...)` from the active route tree.
- Recognized authorization roles are exactly `ADMIN`, `MANAGER`, and `USER`.
- The frontend reads the role from `session.user.app_metadata.user_role`.
- Missing or unknown role claims fail closed.
- Frontend visibility and route guards improve UX; they do not replace backend authorization, grants, or RLS.

## 4. Domain invariants

Read `domain-rules.md` before changing contracts, invoices, payments, receipts, arrears, expenses, migrations, or RLS.

Preserve at minimum:

- property owns units;
- contract references exactly one unit and one tenant;
- active contracts for one unit do not overlap;
- payment belongs to exactly one contract;
- standalone payments are not allowed;
- receipt is generated only from a posted payment;
- posted payments are immutable;
- corrections use reversal and replacement;
- outstanding balance is derived through one canonical calculation path;
- orphan chains are not allowed.

## 5. Required reading order

After `AGENTS.md`, read in this order before non-trivial edits:

1. `README.md`
2. `docs/RENTRIX_MASTER_PLAN.md`
3. `docs/ai/AGENT_CAPABILITIES.md`
4. `docs/ai/GIT_TOOLING_POLICY.md`
5. `docs/ROOT_LAYOUT.md`
6. `docs/README.md`
7. `docs/ai/product-scope.md`
8. `docs/ai/domain-rules.md`
9. `docs/ai/engineering-policy.md`
10. `docs/ai/security-policy.md`
11. `docs/ai/testing-guide.md`
12. `docs/ai/release-policy.md`
13. `docs/decisions/README.md`
14. `.ai/workflows/README.md`

Then load only the task-specific references needed for the requested change.

## 6. Source-first execution rules

Before editing:

1. inspect the repository root;
2. inspect `artifacts/rentrix/`;
3. identify the active roadmap release and first ready item;
4. confirm the active route, service, schema, migration, and test paths from code;
5. classify legacy, backup, archive, generated, and vendor files before using them;
6. choose the applicable workflow from `.ai/workflows/README.md`;
7. choose the smallest relevant skill set from `AGENT_CAPABILITIES.md`;
8. follow `GIT_TOOLING_POLICY.md` for branch, diff, PR, CI, and merge work;
9. keep the final diff narrow and reviewable.

Prefer `rg --files` and `rg` when available. Avoid destructive Git operations. Preserve dirty worktrees. Report exact blockers rather than guessing.

## 7. Continuation behavior

A continuation request is based on intent, not one exact keyword. When the user asks to continue, resume, proceed, finish the next step, or uses similar wording:

1. inspect current `main`, open roadmap PRs, and the latest evidence;
2. select the earliest release that is not closed;
3. select the first `READY` roadmap item;
4. load only the relevant skills;
5. execute one narrow PR slice;
6. verify it with fresh evidence;
7. update roadmap evidence and identify the next item.

Ask the user only when a real product decision, environment approval, access boundary, or unresolved verification failure blocks safe progress.

## 8. Current CI verification gate

For runtime pull requests, GitHub Actions currently runs:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
```

Use targeted tests during implementation, then run the relevant full gate before handoff. For schema or RLS changes, also run the repository-approved Supabase validation flow when the required local or preview environment is available.

## 9. Current release and connector caution

The latest committed Wave 1 reconciliation documents record read-only connector evidence and unresolved rollout risk. Before any live Supabase or Vercel action, read:

```text
docs/wave1/1A_CONTRACT_INTEGRITY_RECONCILIATION.md
docs/wave1/1B_FINANCIAL_POSTING_DESIGN_RECONCILIATION.md
docs/wave1/1C_AUTH_AND_RLS_HARDENING_PLAN.md
```

The latest recorded Supabase boundary is:

```text
intended live project: RENTRIX EGY (live) / nnggcnpcuomwfuupupwg
prohibited project:    rentrix (V2) / ktmizdznbdwvalmmfvfc
```

The latest recorded default Supabase branch status is `MIGRATIONS_FAILED`. Reverify current connector state before rollout. Repository documentation is not authorization to mutate production.

## 10. Cleanup boundary

Read `docs/reconciliation/02-root-cleanup-candidates.md` before removing or moving files. Remove only items classified as `safe-delete-proven` in a narrow cleanup PR. Keep archive moves, recovery-source review, optional artifact decisions, and runtime changes separate.

## 11. Documentation maintenance rule

Update this file when an approved change alters:

- visible constrained-beta navigation;
- registered deferred routes;
- active runtime boundaries;
- authorization roles or role source;
- the CI verification gate;
- release-critical connector targeting or rollout cautions;
- roadmap sequencing or continuation behavior.

Keep `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/README.md`, and `docs/ai/README.md` as short entry points that link here instead of duplicating the full onboarding sequence.
