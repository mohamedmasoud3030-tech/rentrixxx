# Rentrix Product Scope

## Product definition

Rentrix is an Arabic-first, single-office property operations system for a real-estate office. English/LTR support must remain functional, but the primary operational experience is Arabic/RTL.

## Supported operational flow

The approved core business flow is:

```text
Properties → Units → People / Tenants / Owners → Contracts → Invoices → Payments → Receipts → Expenses → Arrears → Reports
```

The active application also exposes dashboard, owners hub, change-password, and settings surfaces where they support the verified workflow.

## Current constrained-beta visibility

The visible desktop navigation currently includes:

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

The mobile bottom navigation is intentionally narrower:

```text
Dashboard
Properties
Contracts
Financials
Arrears
```

The following routes remain registered for controlled recovery and verification, but are intentionally hidden from visible constrained-beta navigation:

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

Do not delete a deferred route merely because it is hidden. Do not re-expose a deferred route merely because it remains registered. Any visibility change requires a narrow reviewed PR with route, permission, UX, and regression-test evidence.

`/accounting` is registered only as a redirect to `/financials`. Do not expand it into a general ledger during stabilization.

## Hard boundaries

- Keep the product single-office. Do not reintroduce organizations, memberships, invitations, subscriptions, or per-organization scoping.
- Do not build or wire a general accounting-grade ledger during stabilization.
- Do not merge legacy branches or pages blindly. Reuse only stronger implementations that fit the active architecture.
- Do not add unrelated features before release blockers and unfinished active pages are resolved.
- Avoid placeholder pages and unfinished labels in active navigation.

## UX boundary

- Arabic-first RTL layout.
- English/LTR remains supported.
- Mobile layouts must be usable for operational work.
- PWA behavior must not regress.
- Tables, forms, and exports must remain readable in Arabic.

## Source of truth

Use `ONBOARDING.md` for the current application snapshot. When documentation and runtime disagree, inspect the active code and database migrations, identify the mismatch, and update documentation or code through an explicit reviewed change.
