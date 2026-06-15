# Rentrix Decision Register

Use this directory for durable product and architecture decisions that future agents must not reopen casually.

## Active decisions

### ADR-001 — Single-office product only

Rentrix is a single-office property operations system. SaaS multi-tenancy is outside the active product scope. Do not add organizations, memberships, invitations, subscriptions, or organization-scoped runtime behavior.

### ADR-002 — Defer accounting-grade ledger

Do not wire a general accounting ledger during stabilization and release-readiness work. The approved operational flow is properties, units, people, tenants, owners, contracts, invoices, payments, receipts, expenses, arrears, and reports. `/accounting` remains a redirect to `/financials`.

### ADR-003 — Active app boundary

The active application lives under `artifacts/rentrix/`. Legacy or archived code is a review source only. Reuse requires deliberate adaptation to the current architecture. `.migration-backup/` and `artifacts/rentrix/legacy-src/` were removed in PR #805. Only `archive/recovery-reference/` remains for selective reference.

### ADR-004 — Canonical financial calculations

Balances and arrears are derived through one canonical calculation path. Posted payment corrections use reversal and replacement rather than silent historical edits.

### ADR-005 — Constrained-beta navigation visibility

Visible navigation is limited to the verified operational flow. Deferred routes remain registered but hidden until separately verified and approved. See `ADR-005-constrained-beta-navigation.md`.

### ADR-006 — Deferred CRM tables require product decisions

The `leads`, `commissions`, and `communication` tables do not exist in the confirmed live schema. Their services return `status: unavailable`. No schema migration for these tables should be written until an explicit product decision is made and documented here.

### ADR-007 — First-client v0.4 module scope

The first-client rollout does not expand day-one scope beyond the verified operational core unless client intake confirms a hard workflow requirement. `/lands` stays hidden unless land-plot management is confirmed; `/leads`, `/commissions`, `/communication`, and owner settlements are deferred for v1. See `ADR-007-first-client-v04-module-scope.md`.

## Open product decisions required

The following decisions are required before work in v0.4 can proceed:

| Decision | Needed for |
| --- | --- |
| Client confirmation that land plots are managed in Rentrix | `/lands` fast-follow |
| Explicit first-client requirement for lead tracking | `/leads` post-v1 |
| Explicit first-client requirement for commission tracking | `/commissions` post-v1 |
| Explicit first-client requirement for templated communication | `/communication` post-v1 |
| Explicit first-client requirement to pay owners through Rentrix | v1.1+ owner settlements |

## Adding a decision

Add a short ADR file when changing a durable boundary. State the context, decision, consequences, and explicit exclusions. Link the new ADR from this index.
