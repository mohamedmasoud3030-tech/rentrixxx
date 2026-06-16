# ADR-005 — Constrained-Beta Navigation Visibility

## Context

Rentrix contains recovered and governance routes that remain useful for controlled verification, but not every registered route is approved for visible constrained-beta navigation.

After the Wave 1D navigation cut, the active sidebar and mobile navigation expose only the verified operational flow. Deferred routes remain registered in TanStack Router so they can be reviewed, tested, and recovered deliberately without deleting code prematurely.

## Decision

Keep visible constrained-beta navigation limited to the verified operational flow.

Visible desktop navigation:

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

Visible mobile bottom navigation:

```text
Dashboard
Properties
Contracts
Financials
Arrears
```

Keep these routes registered but hidden until separately verified and approved:

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

Keep `/accounting` as a redirect to `/financials`. Do not expand it into a general ledger during stabilization.

## Consequences

- Hidden deferred routes must not be deleted merely because they are absent from navigation.
- Hidden deferred routes must not be re-exposed merely because their route modules still exist.
- Any visibility change requires a narrow reviewed PR with route, permission, UX, and regression-test evidence.
- Route parity tests must prove that deferred routes remain registered while visible navigation remains bounded.

## Explicit exclusions

- No feature implementation is authorized by this ADR.
- No schema, migration, RLS, Supabase, or Vercel change is authorized by this ADR.
- No general accounting-ledger work is authorized by this ADR.
