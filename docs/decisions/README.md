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

## Open product decisions required

The following decisions are required before work in v0.4 can proceed:

| Decision | Needed for |
| --- | --- |
| Lands lifecycle, ownership, and reporting scope | `/lands` v0.4 |
| Lead stages, sources, and conversion rules | `/leads` v0.4 |
| Commissions read-only visibility and settlement model | `/commissions` v0.4 |
| Communication provider, templates, consent, audit | `/communication` v0.4 |
| Owner-settlement workflow scope | v0.5 optional |

## Adding a decision

Add a short ADR file when changing a durable boundary. State the context, decision, consequences, and explicit exclusions. Link the new ADR from this index.
