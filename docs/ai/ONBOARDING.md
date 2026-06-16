# Rentrix Agent Onboarding

This is the canonical onboarding sequence and current application snapshot for coding agents. Read `AGENTS.md` first, then read `docs/ai/CURRENT_EXECUTION_CONTEXT.md` before this file, roadmap notes, payment reports, migration reports, or any older audit.

When documentation and code disagree, `docs/ai/CURRENT_EXECUTION_CONTEXT.md` is the current execution source of truth. Inspect the active code and migrations, report the mismatch, and update stale documentation through a reviewed change. Do not guess from historical reports, recovery folders, or old pull requests.

For reporting or document-output work, also read `docs/ai/REPORTING_DEFINITIONS.md` and `docs/ai/PRINT_AND_EXPORT_READINESS.md` after `CURRENT_EXECUTION_CONTEXT.md`. These files describe current repository evidence and known limitations; they do not replace live Supabase/payment QA evidence.

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

**Removed in PR #805:** `.migration-backup/`, `artifacts/rentrix/legacy-src/`, `artifacts/mockup-sandbox/`. These no longer exist. Do not reference them as if they are available.

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
Maintenance
System
Audit Log
Data Integrity
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

The following optional and product-decision routes remain registered in `artifacts/rentrix/src/routeTree.ts`, but they are intentionally hidden from visible constrained-beta navigation until they are separately verified and approved:

```text
/lands
/leads
/commissions
/communication
```

Do not delete these routes merely because they are hidden. Do not re-expose them in navigation merely because they remain registered.

Current deferred page status (verified June 2026):

| Route | Backend support | Page ready | Service status |
| --- | --- | --- | --- |
| `/maintenance` | Schema in migrations | Yes — full service + tests | Re-exposed in v0.3 with permissioned navigation |
| `/audit-log` | `public.audit_log` queried with generated `database.ts` type | Yes — read-only view | Re-exposed in v0.3 with hardened RLS evidence |
| `/data-integrity` | Minimal read model | Yes — page exists | Re-exposed in v0.3 with permissioned navigation |
| `/system` | Minimal governance source support | Yes — page + components | Re-exposed in v0.3 with permissioned navigation |
| `/lands` | Not verified for active product use | Yes — page returns unavailable | Needs v0.4 product decision |
| `/leads` | No confirmed schema table | Yes — page returns unavailable | Needs v0.4 product decision |
| `/commissions` | No confirmed schema table | Yes — page returns unavailable | Needs v0.4 product decision |
| `/communication` | No confirmed schema table | Yes — page returns unavailable | Needs v0.4 product decision |

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

## 5. Closed tech debt and known blockers

- **Duplicate hook pairs closed:** `useProperties.ts` / `use-properties.ts` and `useUnits.ts` / `use-units.ts` were consolidated in v0.2. Current canonical hooks are `use-properties.ts` and `use-units.ts`.
- **`database.ts` audit type gap closed:** `public.audit_log` and other previously untracked tables are now represented in the generated database types, and the audit service uses `Database['public']['Tables']['audit_log']['Row']` directly.
- **Supabase migration and browser QA blockers remain:** live migration-state reconciliation, Custom Access Token hook registration verification, and authenticated browser/manual QA are blocked by dashboard/management API access and browser-driving capability. See v0.1 items 2, 5, and `docs/v01/migration-reconciliation-status.md`.

## 6. Required reading order

After `AGENTS.md`, read in this order before non-trivial edits:

1. `docs/ai/CURRENT_EXECUTION_CONTEXT.md`
2. `README.md`
3. `docs/RENTRIX_MASTER_PLAN.md`
4. `docs/ai/AGENT_CAPABILITIES.md`
5. `docs/ai/GIT_TOOLING_POLICY.md`
6. `docs/ROOT_LAYOUT.md`
7. `docs/README.md`
8. `docs/ai/product-scope.md`
9. `docs/ai/domain-rules.md`
10. `docs/ai/engineering-policy.md`
11. `docs/ai/security-policy.md`
12. `docs/ai/testing-guide.md`
13. `docs/ai/release-policy.md`
14. `docs/decisions/README.md`
15. `.ai/workflows/README.md`

Then load only the task-specific references needed for the requested change.

## 7. Source-first execution rules

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

## 8. Continuation behavior

A continuation request is based on intent, not one exact keyword. When the user asks to continue, resume, proceed, finish the next step, or uses similar wording:

1. inspect current `main`, open roadmap PRs, and the latest evidence;
2. select the earliest release that is not closed;
3. select the first `READY` roadmap item;
4. load only the relevant skills;
5. execute one narrow PR slice;
6. verify it with fresh evidence;
7. update roadmap evidence and identify the next item.

Ask the user only when a real product decision, environment approval, access boundary, or unresolved verification failure blocks safe progress.

## 9. Current CI verification gate

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

## 10. Current release and connector caution

Before any live Supabase or Vercel action, read:

```text
docs/wave1/1A_CONTRACT_INTEGRITY_RECONCILIATION.md
docs/wave1/1B_FINANCIAL_POSTING_DESIGN_RECONCILIATION.md
docs/wave1/1C_AUTH_AND_RLS_HARDENING_PLAN.md
docs/CONSTRAINED_BETA_LAUNCH_AUDIT_2026_06_06.md
docs/v01/migration-reconciliation-status.md  [LATEST — updated 2026-06-07]
```

The latest recorded Supabase boundary is:

```text
intended live project: RENTRIX EGY (live) / nnggcnpcuomwfuupupwg
prohibited project:    rentrix (V2) / ktmizdznbdwvalmmfvfc
```

**Latest connector evidence (2026-06-07):**
- Live project status: `ACTIVE_HEALTHY`
- Branch default status: `MIGRATIONS_FAILED` (on branch, not main runtime)
- Main runtime: healthy, no schema corruption detected
- Critical auth function `custom_access_token_hook` applied ✅
- Critical payment RPC `record_invoice_payment_atomic` still needed ⏸️
- See `docs/v01/migration-reconciliation-status.md` for full findings and next steps

## 11. Cleanup boundary

Read `docs/reconciliation/02-root-cleanup-candidates.md` before removing or moving files. Remove only items classified as `safe-delete-proven` in a narrow cleanup PR. Keep archive moves, recovery-source review, optional artifact decisions, and runtime changes separate.

## 12. Documentation maintenance rule

Update this file when an approved change alters:

- visible constrained-beta navigation;
- registered deferred routes;
- active runtime boundaries;
- authorization roles or role source;
- the CI verification gate;
- release-critical connector targeting or rollout cautions;
- roadmap sequencing or continuation behavior;
- known tech debt items.

Keep `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/README.md`, and `docs/ai/README.md` as short entry points that link here instead of duplicating the full onboarding sequence.
