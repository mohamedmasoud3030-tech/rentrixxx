## Objective

Describe the exact problem or approved objective.

## Scope

List the files and behaviors changed. Confirm that the PR does not introduce unrelated features, SaaS multi-tenancy, or general-ledger wiring.

## Domain impact

State whether the PR affects properties, units, people, contracts, invoices, payments, receipts, arrears, expenses, maintenance, reports, or owner agreements. Confirm the relevant invariants in `docs/ai/domain-rules.md` remain valid.

## Data and security impact

State whether migrations, RLS, auth, roles, environment variables, storage policies, exports, or external integrations changed.

## Verification

List every command executed and its result. For runtime changes, run the relevant gate from `docs/ai/release-policy.md`.

## UI checks

State whether Arabic RTL, English LTR, mobile layout, and PWA behavior were checked for affected pages.

## Handoff

List blockers, migration notes, deferred items, and final diff review notes.