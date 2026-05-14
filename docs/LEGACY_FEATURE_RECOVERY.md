# Rentrix Legacy Feature Recovery Map

## Goal

Use the existing repository code instead of rebuilding a small replacement app. The deployed app currently boots from `artifacts/rentrix/src`, while the larger historical product code lives mostly in `artifacts/rentrix/legacy-src`, `.migration-backup`, `lib/db`, and `lib/api-client-react`.

This document is the recovery contract: every valuable legacy feature should either be restored into the current Supabase/TanStack app, intentionally replaced, or explicitly archived with a reason.

## Current boot path

The production app is loaded through:

- `artifacts/rentrix/index.html`
- `artifacts/rentrix/src/index.tsx`
- `artifacts/rentrix/src/App.tsx`
- `artifacts/rentrix/src/app/router.tsx`
- `artifacts/rentrix/src/routeTree.ts`

`artifacts/rentrix/tsconfig.json` includes only `src/**/*.ts`, `src/**/*.tsx`, and `src/**/*.d.ts`, and explicitly excludes `legacy-src/**`. Therefore, legacy code is present in the repository but not compiled, typechecked, routed, or deployed.

## Do not bulk-import legacy code

The legacy app and current app use different architecture.

Legacy uses:

- `react-router-dom`
- `useApp` / `AppContext`
- `dataService`
- client-side `db` object
- camelCase domain fields such as `contract.unitId`, `tenant.name`, `unit.name`, `contract.rent`
- receipt/allocation style flows

Current app uses:

- `@tanstack/react-router`
- Supabase direct services
- React Query
- snake_case Supabase rows such as `unit_id`, `tenant_id`, `rent_amount`, `start_date`, `end_date`
- invoice/payment tables

Bulk importing legacy files would reintroduce incompatible state, routing, and data models. Recovery must be done feature-by-feature.

## Recovery priorities

### P0: Operational dashboard

Legacy value to recover:

- Active contract count
- Expiring contract count
- Total overdue balance
- Total monthly rent
- Collections and arrears trend

Current gap:

- Current dashboard is mostly high-level cards and project copy.

Recovery approach:

- Replace project copy with operational KPIs.
- Build Supabase queries/RPCs that return counts and sums from `properties`, `units`, `contracts`, `invoices`, `payments`, and `expenses`.
- Keep the UI in `src/app/dashboard-page.tsx`.

### P0: Contracts module

Legacy source:

- `artifacts/rentrix/legacy-src/ui/Contracts.tsx`

Legacy value to recover:

- Contract stats cards
- Search and filters
- CSV export
- Expandable contract rows
- Last payments per contract
- Print preview
- Contract PDF export
- Attachments manager
- Renewal action
- Maintenance block before contract creation
- Contract financial balance

Current gap:

- Current contract list/form/detail is much simpler.

Recovery approach:

- Port behavior, not file structure.
- Map old fields:
  - `contract.unitId` -> `contracts.unit_id`
  - `contract.tenantId` -> `contracts.tenant_id`
  - `contract.rent` -> `contracts.rent_amount`
  - `contract.start` -> `contracts.start_date`
  - `contract.end` -> `contracts.end_date`
  - `tenant.name` -> `people.full_name`
  - `unit.name` -> `units.unit_number`
  - `property.name` -> `properties.title`
- Implement missing pieces as `src/features/contracts/*` services/components.

### P0: Invoices and payment workflow

Legacy source:

- `artifacts/rentrix/legacy-src/ui/Invoices.tsx`

Legacy value to recover:

- Invoice stats
- Advanced filters
- QuickPay modal
- Bulk WhatsApp reminders
- Manual invoice form
- Invoice table with actions
- Delete confirmation policy
- Receipt posting flow

Current gap:

- Current financials page combines invoices, payments, and expenses in a basic page.

Recovery approach:

- Split `financials-page.tsx` into feature components.
- Recover invoice filtering and quick payment UX.
- Wire quick payment to current `post_receipt_atomic` RPC.
- Do not restore direct invoice delete unless DB policy allows void/reversal safely.

### P0: Receipts and printable artifacts

Legacy value to recover:

- Printed contract layout
- PDF export
- Receipt posting and printable receipt artifacts
- Document header/company branding

Current gap:

- Current payment flow records payments but does not expose a serious receipt/PDF workflow.

Recovery approach:

- Add receipt view after payment.
- Add printable/PDF artifact generation from posted payment.
- Keep payment immutability intact.

### P1: Owner hub and owner statement

Legacy source:

- `artifacts/rentrix/legacy-src/ui/OwnersHub.tsx`

Legacy value to recover:

- Owner-level property list
- Owner-level contracts
- Owner invoices/payments/expenses/arrears summary

Current gap:

- Current core schema stores `owner_name` on properties, but does not model owners as people/entities strongly enough.

Recovery approach:

- Decide owner model first:
  - Short-term: derive owner summaries from `properties.owner_name`.
  - Proper: add `owner_id` referencing `people(id)` where `people.type = owner`.
- Then restore owner hub/report.

### P1: Arrears and collections

Legacy value to recover:

- Arrears filtering
- Overdue balances
- WhatsApp reminders
- Collections workflow

Current gap:

- Current reports show overdue trend but not an actionable arrears collection screen.

Recovery approach:

- Build `src/features/arrears` or add a financials tab.
- Base it on unpaid/partial/overdue invoices.

### P1: Attachments

Legacy value to recover:

- `AttachmentsManager`
- Entity-based attachments for contracts/properties/tenants

Current gap:

- No visible attachment workflow in current app.

Recovery approach:

- Add a Supabase storage/table design.
- Restore UI only after storage model exists.

### P1: WhatsApp composer

Legacy value to recover:

- Reminder messages for overdue invoices
- Tenant phone normalization

Current gap:

- No current integrated communication workflow.

Recovery approach:

- Add WhatsApp actions for overdue invoices and tenant statements.
- Keep as browser `wa.me` links first; no external API needed initially.

### P2: Accounting

Current state:

- Current accounting page is a placeholder.

Recovery approach:

- Either hide it until real accounting exists, or restore a minimal ledger view from current payments/expenses/invoices.
- Do not imply full accounting until journal entries and reversal workflows exist.

## Field mapping table

| Legacy field | Current field / target |
|---|---|
| `tenant.name` | `people.full_name` |
| `tenant.phone` | `people.phone` |
| `unit.name` | `units.unit_number` |
| `unit.propertyId` | `units.property_id` |
| `property.name` | `properties.title` |
| `property.location` | `properties.address` |
| `contract.unitId` | `contracts.unit_id` |
| `contract.tenantId` | `contracts.tenant_id` |
| `contract.rent` | `contracts.rent_amount` |
| `contract.start` | `contracts.start_date` |
| `contract.end` | `contracts.end_date` |
| `invoice.contractId` | `invoices.contract_id` |
| `invoice.dueDate` | `invoices.due_date` |
| `receipt.contractId` | derive through `payments.invoice_id -> invoices.contract_id` |
| `receipt.amount` | `payments.amount` |
| `receipt.dateTime` | `payments.payment_date` |

## Immediate implementation sequence

1. Replace current dashboard copy with operational KPIs.
2. Extract legacy contract stats/search/export behavior into current contracts module.
3. Split financials page and restore invoice filtering plus QuickPay UX.
4. Add receipt view/PDF after successful payment.
5. Add owner statement once owner data model is settled.
6. Add arrears/WhatsApp reminder screen.
7. Add attachments after storage schema is defined.
8. Remove or clearly label placeholders.

## Rule for all recovery PRs

Each PR must:

- Restore one legacy feature or one tightly related feature group.
- Use current Supabase tables/services, not old `useApp` state.
- Avoid importing `legacy-src` directly into `src` unless dependencies are fully migrated.
- Include a before/after note in the PR body.
- Keep Vercel green.
