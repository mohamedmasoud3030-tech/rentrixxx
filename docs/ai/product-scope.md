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
System
Audit Log
Data Integrity
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

The mobile drawer exposes the full active route inventory. The bottom navigation remains concise and intentionally contains only:

```text
Dashboard
Properties
Contracts
Financials
Arrears
```

Previously deferred planned modules are now approved active routes:

- `/lands` — land records with search, filters, create/edit/archive, and optional owner linking by owner id.
- `/leads` — lead intake with source/status/contact data, search, filters, create/edit/archive.
- `/commissions` — commission tracking with status lifecycle and basic amount calculation, without broad ledger expansion.
- `/communication` — internal communication log only, without external WhatsApp/SMS/email sends.

`/accounting` is registered only as a redirect to `/financials`. Do not expand it into a general ledger during stabilization.

## Conditional modules

External provider sends, owner settlements/payout workflows, and any broad CRM or accounting expansion still require a separate product/security decision.

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
