# Rentrix Product Scope

## Product definition

Rentrix is an Arabic-first, single-office property operations system for a real-estate office. English/LTR support must remain functional, but the primary operational experience is Arabic/RTL.

## Release scope

The supported business flow is:

```text
Properties → Units → Tenants and Owners → Contracts → Invoices → Payments → Receipts → Arrears and Reports
```

Supporting operational areas may include expenses, maintenance, settings, owner agreements, notifications, and audit visibility when they serve the core flow.

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

When documentation and runtime disagree, inspect the active code and database migrations, identify the mismatch, and update documentation or code through an explicit reviewed change.