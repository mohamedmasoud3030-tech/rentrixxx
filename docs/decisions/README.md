# Rentrix Decision Register

Use this directory for durable product and architecture decisions that future agents must not reopen casually.

## Active decisions

### ADR-001 — Single-office product only

Rentrix is a single-office property operations system. SaaS multi-tenancy is outside the active product scope. Do not add organizations, memberships, invitations, subscriptions, or organization-scoped runtime behavior.

### ADR-002 — Defer accounting-grade ledger

Do not wire a general accounting ledger during stabilization and release-readiness work. The approved operational flow is properties, units, people, tenants, owners, contracts, invoices, payments, receipts, expenses, arrears, and reports. `/accounting` remains a redirect to `/financials`.

### ADR-003 — Active app boundary

The active application lives under `artifacts/rentrix/`. Legacy or archived code is a review source only. Reuse requires deliberate adaptation to the current architecture.

### ADR-004 — Canonical financial calculations

Balances and arrears are derived through one canonical calculation path. Posted payment corrections use reversal and replacement rather than silent historical edits.

### ADR-005 — Constrained-beta navigation visibility

Visible navigation is limited to the verified operational flow. Deferred routes remain registered but hidden until separately verified and approved. See `ADR-005-constrained-beta-navigation.md`.

## Adding a decision

Add a short ADR file when changing a durable boundary. State the context, decision, consequences, and explicit exclusions. Link the new ADR from this index.
