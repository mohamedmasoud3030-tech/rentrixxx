# Rentrix Master Execution Plan

This is the single authoritative roadmap for Rentrix development. It defines the current repository baseline, final delivery gate, next repo-only phase, planned/deferred work, out-of-scope boundaries, and continuation protocol for coding agents.

Use together with:

```text
AGENTS.md
README.md
docs/ai/CURRENT_EXECUTION_CONTEXT.md
docs/ai/ONBOARDING.md
docs/FIRST_CLIENT_DELIVERY_PLAN.md
docs/ai/AGENT_CAPABILITIES.md
docs/ai/GIT_TOOLING_POLICY.md
docs/ROOT_LAYOUT.md
```

The active codebase remains the source of truth. If docs conflict with code, inspect the active app under `artifacts/rentrix/`, shared libraries under `lib/`, and canonical migrations under `supabase/migrations/`, then update docs to match current repo reality.

## 1. Final Product Shape

Rentrix is an Arabic-first, single-office property operations system for a real-estate office. English/LTR support remains functional. The product is not a shared-database SaaS platform and does not use organization-scoped multi-tenancy.

The commercial target is a focused operational system with one canonical business chain:

```text
Property -> Unit -> Contract -> Invoice -> Posted Payment -> Receipt
             \-> Tenant
Owner -> Property or Owner Agreement
Property -> Expense
Property -> Maintenance Record
```

The current approved product includes:

```text
Dashboard
Properties
Units
People
Tenants
Owners
Owners Hub
Lands
Leads
Contracts
Financials / Payments
Invoices
Receipts
Expenses
Arrears
Commissions
Reports
Maintenance
Communication
Authorized Audit Visibility
Authorized Data-Integrity Visibility
Authorized System Governance
Settings
Change Password
```

`/accounting` remains a redirect to `/financials`. It is not authorization to build a general ledger.

## 2. Current Repository Baseline

Current baseline at this reconciliation:

| Area | Current state |
| --- | --- |
| Active app | `artifacts/rentrix/` |
| Workspace | `pnpm-workspace.yaml` and root `package.json` define a pnpm workspace |
| Canonical migrations | `supabase/migrations/` |
| Root-level SQL files | None found in the repository root |
| Removed historical paths | `archive/recovery-reference/` and `understand-anything/` are not present in this checkout |
| Custom Access Token Hook | `DONE` by owner confirmation |
| Authenticated ADMIN browser QA | `FINAL DELIVERY GATE` |
| Production GO/NO-GO | `FINAL DELIVERY GATE`, pending final handover QA |
| Repo/docs stabilization | Ready after this PR's local checks pass |

The latest local audit used current code, route registration, navigation, docs, and repository inventory. It did not use Supabase Cloud, Supabase MCP/API, Dashboard, live SQL, linked CLI, Preview branches, or Vercel.

## 3. Navigation and Module Status

Current route/navigation truth comes from `artifacts/rentrix/src/layouts/app-nav-items.ts`, `artifacts/rentrix/src/routeTree.ts`, and route files under `artifacts/rentrix/src/routes/`.

Desktop navigation currently exposes:

```text
Dashboard
Properties
Units
People
Tenants
Owners
Lands
Leads
Contracts
Financials
Invoices
Receipts
Expenses
Arrears
Commissions
Reports
Maintenance
Communication
Audit Log
Data Integrity
System
Change Password
Settings
```

Mobile bottom navigation remains intentionally narrower:

```text
Dashboard
Properties
Contracts
Financials
Arrears
```

The active app registers `/lands`, `/leads`, `/commissions`, and `/communication` as protected TanStack routes with `requirePermission(...)` guards and visible desktop navigation entries. Document them as live visible approved modules, not pending/deferred/hidden routes. `/communication` is an internal log only and does not authorize WhatsApp/SMS/email sending.

## 4. Incomplete / Planned / Deferred Work

Classify every non-complete item with exactly one of these statuses:

| Item | Status | Current note |
| --- | --- | --- |
| Authenticated ADMIN browser QA | `FINAL DELIVERY GATE` | Final handover must verify login, protected routes, invoice -> payment -> receipt behavior, reports refresh, RTL/LTR, mobile, print, and operator-critical workflows. |
| Production GO/NO-GO | `FINAL DELIVERY GATE` | Pending final handover QA; full production readiness must not be claimed before this closes. |
| Mobile/physical-device print QA | `FINAL DELIVERY GATE` | Repository supports print styles/browser print, but device evidence is still required. |
| Commercial hardening v0.5 | `PLANNED` | Starts after final delivery QA closes or records a NO-GO fix path. |
| v1.0 commercial release | `PLANNED` | Depends on final delivery QA and commercial hardening. |
| Dedicated generated receipt PDF file | `PLANNED` | Current receipt output is browser print from the payment-backed receipt detail page. |
| Reports PDF export | `DEFERRED` | Current reports export CSV. |
| Owner statements/settlement documents | `DEFERRED` | Depends on owner settlement/payout decision. |
| External communication sending | `OUT OF SCOPE` | `/communication` is an internal log only unless a provider boundary is approved later. |
| General accounting ledger | `OUT OF SCOPE` | No balance sheet, accounting-grade P&L, broad ledger UI, or journal-entry UI expansion during stabilization. |
| Tax finality/accounting-grade tax treatment | `OUT OF SCOPE` | Requires approved accounting requirements before product claims. |
| SaaS multi-tenancy | `OUT OF SCOPE` | No organizations, memberships, invitations, subscriptions, or organization-scoped runtime behavior. |
| Owner settlement/payout workflow | `NEEDS OWNER DECISION` | Future owner decision; do not infer payout workflows from owner or commission modules. |

Completed items that should not be reopened as missing: Custom Access Token Hook registration, Reports CSV date filenames/BOM, invoice PDF export, contract PDF export, expense PDF export, receipt browser print, active lands/leads/commissions/communication routes, and current pnpm workspace/migration layout.

## 5. Final Delivery Gate

The final delivery gate is not a repo-stabilization blocker, but it is required before production GO:

1. Run authenticated ADMIN browser QA with real credentials.
2. Verify protected routes and role-based navigation after login.
3. Verify invoice -> payment -> receipt -> invoice status -> reports refresh.
4. Verify receipt browser print and at least one mobile/physical-device print path.
5. Verify Arabic RTL, English/LTR sanity, mobile drawer/bottom navigation, forms, dialogs, empty/error states, PWA behavior, and invalid-route fallback.
6. Record explicit GO/NO-GO in current source-of-truth docs.

If QA passes, close the final handover with GO evidence. If QA reveals bugs, open narrow fix PRs per bug and do not bundle unrelated roadmap work.

## 6. Next Repo-Only Phase

After this docs-only reconciliation PR:

1. Keep the repo/docs stabilization state current after local checks and PR review.
2. Do not change migrations, schema, Supabase Cloud, Vercel, live SQL, or app code as part of docs reconciliation.
3. Wait for final delivery QA evidence before claiming production readiness.
4. Start v0.5 commercial hardening only after final delivery QA closes or records a clear NO-GO fix path.

## 7. Release Status Model

Each roadmap item uses one status:

| Status | Meaning |
| --- | --- |
| `DONE` | Merged, verified, or owner-confirmed where applicable. |
| `READY` | Can be executed now without a new product decision or live-mutation approval. |
| `BLOCKED` | Requires access, approval, environment capability, or a product decision. |
| `DEFERRED` | Intentionally belongs to a later release. |
| `PLANNED` | Expected future work after its prerequisite gate. |
| `OUT OF SCOPE` | Not part of the current roadmap unless a later reviewed decision changes the boundary. |
| `NEEDS OWNER DECISION` | Requires explicit owner/product direction before implementation. |
| `FINAL DELIVERY GATE` | Required for final handover/production GO, not a current repo-stabilization blocker. |

Agents must update evidence when a roadmap item changes status through a reviewed PR or completed verification task.

## 8. Continuation Protocol

When the user asks to continue, resume, proceed, finish the next step, or similar:

1. read `AGENTS.md`, `docs/ai/CURRENT_EXECUTION_CONTEXT.md`, `docs/ai/ONBOARDING.md`, this master plan, `docs/ai/AGENT_CAPABILITIES.md`, and `.ai/workflows/README.md`;
2. inspect current `main`, branch state, current docs, active route/nav code, and latest verification evidence;
3. find the earliest current item that is not `DONE`;
4. select the first `READY` repo-only item, or report the exact `FINAL DELIVERY GATE`, `BLOCKED`, `OUT OF SCOPE`, or `NEEDS OWNER DECISION` status;
5. load only the task-relevant skills;
6. implement one narrow, reviewable PR slice;
7. run fresh verification appropriate to the slice;
8. review the final diff for unrelated changes;
9. update source-of-truth docs if the work changes status.

Do not ask the user to restate the roadmap. Ask only when a real stop condition exists.

## 9. Stop Conditions

Stop and report the exact blocker when any of these apply:

- a product decision is required;
- a production or live-environment mutation requires explicit approval;
- authentication, permission, connector safety, or network access blocks the documented operation;
- verification fails and the cause is not safely isolated;
- a migration, RLS, RPC, or data repair would exceed the approved narrow slice;
- a requested action would violate the single-office or non-ledger boundary.

## 10. Verification Gate

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

For docs-only reconciliation, run local repository checks that are available and relevant, including whitespace validation, current package scripts, and consistency searches. Do not use live Supabase, Vercel, preview branches, linked CLI, Dashboard, MCP/API, or live SQL for this docs-only work.

## 11. Pull Request Discipline

Every roadmap PR must:

- map to exactly one roadmap item or one tightly coupled safe slice;
- remain narrow and reversible;
- state exact files changed;
- state behavior changed;
- state what was intentionally not changed;
- state migration, RLS, RPC, Supabase, and Vercel impact;
- run fresh verification appropriate to scope;
- report blockers honestly;
- update roadmap evidence when merged.
