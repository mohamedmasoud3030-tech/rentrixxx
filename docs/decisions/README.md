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

Visible navigation follows the active snapshot in `docs/ai/ONBOARDING.md`. Routes must not be exposed as placeholders or dead navigation. The historical constrained-beta navigation ADR is archived at `docs/archive/decisions/ADR-005-constrained-beta-navigation.md`.

### ADR-006 — Approved planned modules stay single-office

Lands, leads, commissions, and internal communication are approved Rentrix modules inside the single-office product boundary. They must not introduce SaaS multi-tenancy, organizations, subscriptions, a broad accounting ledger, or external-provider sends.

### ADR-007 — First-client v0.4 module scope

Use `docs/FIRST_CLIENT_DELIVERY_PLAN.md` for current first-client sequencing. The historical v0.4 scope ADR is archived at `docs/archive/decisions/ADR-007-first-client-v04-module-scope.md`.

## Open product decisions required

The following decisions still require explicit approval before implementation:

| Decision | Needed for |
| --- | --- |
| External communication or notification sends | Provider integration and outbound messaging |
| Owner payout or settlement workflows | Advanced owner settlement modules |
| General accounting-grade ledger | Balance sheet, accounting-grade P&L, journal-entry UI expansion |
| SaaS or shared-database multi-tenancy | Organizations, memberships, invitations, subscriptions |

## Adding a decision

Add a short ADR file when changing a durable boundary. State the context, decision, consequences, and explicit exclusions. Link the new ADR from this index.
