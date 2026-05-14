# Rentrix Master Execution Plan

This document is the mandatory execution plan for Rentrix development.

Rentrix is not being rebuilt from scratch. The existing codebase remains the source of truth. All future work must stabilize, recover, refine, and commercialize the current application into a sellable property and rent management system.

## 1. Product Direction

Rentrix is a professional property and rent management platform for property owners, property managers, and small or medium real estate operators in Oman and the GCC.

The product must feel like an Arabic-first property finance dashboard:

- Clear and modern
- Fast for daily operations
- Financially strict
- RTL-ready and LTR-ready
- Suitable for Oman/GCC rental workflows
- Focused on properties, units, tenants, contracts, payments, receipts, expenses, and reports

Rentrix should use the existing large codebase and organize it into a commercial product. Do not shrink the product into a new MVP, and do not create a parallel application.

## 2. Deployment and Data Isolation Architecture

Rentrix v1 uses this architecture:

```text
Single Rentrix application codebase
Dedicated Supabase project/environment per company/customer
Dedicated deployment/environment variables per customer when needed
```

Each company/customer can receive an isolated backend:

```text
Customer A -> Rentrix app -> Supabase Project A
Customer B -> Rentrix app -> Supabase Project B
Customer C -> Rentrix app -> Supabase Project C
```

### Mandatory architecture rules

1. Rentrix v1 must not be treated as one shared Supabase multi-tenant database for all companies.
2. Do not require a mandatory `company_id` column on every business table as the primary v1 isolation mechanism.
3. Customer isolation is physical/project-level through a dedicated Supabase project or environment.
4. The app must read Supabase configuration from environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. The same schema and migrations must be applicable to each customer Supabase project.
6. Do not build cross-company dashboards or global shared datasets for v1.
7. Do not introduce a central tenant registry unless explicitly requested later.
8. For local development, use the current configured Supabase environment.
9. For production/customer delivery, use per-customer Vercel/Supabase environment variables.

## 3. Company Settings

Even though each company has its own Supabase project, the database should still contain local company settings for branding, localization, and document output.

A customer-local settings model should support:

- Company name
- Logo URL
- Default language
- Default currency
- Country
- Timezone
- Receipt prefix
- Invoice/receipt settings
- Contact details if needed

Recommended defaults:

```text
default_language: ar
default_currency: OMR
country: OM
timezone: Asia/Muscat
```

## 4. Language and Direction Requirements

Rentrix must support Arabic and English.

Required languages:

- Arabic (`ar`)
- English (`en`)

Required direction behavior:

- Arabic UI must support RTL.
- English UI must support LTR.
- Layout code should prefer logical positioning and spacing where practical.
- Avoid hardcoded `left` and `right` when `start` and `end` patterns can be used.
- Do not add large amounts of new Arabic-only labels in commercial screens if an i18n layer exists.
- If no i18n layer exists, add a lightweight translation structure before large UI expansion.

Arabic is the default language for the first commercial version, but new work must not make English support harder.

## 5. Currency Requirements

Rentrix must support multiple currencies.

Default currency:

- `OMR`

Supported currencies at minimum:

- `OMR` - Omani Rial
- `AED` - UAE Dirham
- `SAR` - Saudi Riyal
- `QAR` - Qatari Riyal
- `KWD` - Kuwaiti Dinar
- `BHD` - Bahraini Dinar
- `USD` - US Dollar
- `EGP` - Egyptian Pound

### Currency rules

1. Do not hardcode OMR directly inside UI components.
2. Do not display money as plain numbers without currency context.
3. Use a centralized money formatting helper.
4. Every displayed monetary value must use amount, currency, and locale.
5. CSV exports that include monetary values must include currency.
6. Do not implement exchange-rate conversion in v1 unless explicitly requested later.
7. Contract/payment currency should default from company settings unless a future schema supports per-contract currency.

## 6. Core Entity Integrity

These rules are non-negotiable.

### Properties and units

1. A unit must belong to one property.
2. A unit cannot have overlapping active contract periods.
3. At most one active contract may exist for a unit at any instant.

### Contracts

1. A contract must reference exactly one unit.
2. A contract must reference exactly one tenant/person.
3. A contract must not exist without a valid unit and tenant.
4. Contract lifecycle must be explicit: draft, active, expired, terminated/cancelled, or equivalent existing statuses.

### Payments

1. A payment must belong to exactly one contract.
2. No standalone payment records.
3. Posted payments are immutable.
4. No direct update/delete of posted payment amount, date, or contract linkage.
5. Corrections must use reversal/replacement style flows.
6. Outstanding balance is derived, not manually edited.

### Receipts

1. A receipt must be generated from a posted payment only.
2. A receipt cannot be created independently from a payment.
3. Receipt output may be printable, downloadable, or sent through WhatsApp later, but its source must remain the posted payment.

## 7. Financial Reporting Rules

1. There must be one canonical path for calculating balances and outstanding amounts.
2. Reports, dashboards, and details pages must not calculate balances using separate conflicting logic.
3. Do not silently mutate monetary values.
4. Any future correction workflow must leave an audit trail.
5. Reports should prioritize clarity over quantity.

Core reports to build or refine:

- Rent collection report
- Outstanding balances report
- Profit and expense report
- Occupancy report
- Expiring contracts report
- Tenant statement
- Property statement

## 8. Current Architecture Rules

Preserve the current accepted architecture.

Do not reintroduce removed or legacy patterns unless explicitly approved.

Forbidden unless explicitly requested:

- Legacy `useApp`
- Legacy `dataService`
- `react-router-dom` if the current app uses TanStack Router
- Parallel global state architecture
- New app shell that bypasses the current codebase
- Mock financial flows when real Supabase services exist

Expected current direction:

- TanStack Router for routing where already established
- React Query for async data flow where already established
- Supabase service modules for data access where already established
- Existing UI components before creating duplicates

## 9. UI/UX Direction

Rentrix should visually behave like a modern SaaS dashboard for property finance operations.

Global UI direction:

- Clean sidebar/topbar layout
- Clear cards and tables
- Status badges for important states
- Quick actions on operational screens
- Strong empty/loading/error states
- Details pages built with summary cards and tabs
- Responsive enough for desktop and mobile usage
- Arabic-first without blocking English LTR support

Important dashboard questions:

- How much rent is due this month?
- How much has been collected?
- Who is overdue?
- Which units are vacant?
- Which contracts are expiring soon?
- What are this month expenses?
- What is the net position?

## 10. Screen Priorities

Follow this order unless a blocking bug requires a stabilization PR first.

### Phase 0 - Rules and stabilization

- Contract overlap guard
- Payment immutability
- Legacy recovery mapping
- Master plan documentation
- CI/build/lint/typecheck discipline

### Phase 1 - Contracts

- Contract list search/export/expanded rows
- Contract detail page
- Contract financial timeline
- Contract payments tab
- Contract documents tab
- Renewal/termination UX
- Consistent statuses and badges

### Phase 2 - Money and currency foundation

- Central `formatMoney` helper
- Supported currency list
- Default OMR behavior
- Currency-aware CSV exports
- Replace plain money numbers in commercial screens

### Phase 3 - i18n and direction foundation

- Determine existing i18n state
- Add lightweight translation structure if missing
- Prepare Arabic and English resources
- Add locale/direction handling
- Avoid hardcoded strings in newly refactored commercial screens

### Phase 4 - Company settings

- Customer-local settings storage
- Company branding
- Default language
- Default currency
- Country and timezone
- Receipt/invoice settings foundation

### Phase 5 - Dashboard

- Rent due
- Collected rent
- Outstanding rent
- Expenses
- Net profit/loss
- Occupancy
- Expiring contracts
- Recent payments
- Overdue tenants

### Phase 6 - Properties and Units

- Property cards and table views
- Unit status badges
- Occupancy indicators
- Current tenant and contract information
- Rent amount with currency
- Quick actions

### Phase 7 - Tenants / People

- Tenant profile
- Tenant contracts
- Tenant payments
- Tenant outstanding balance
- Documents and notes
- WhatsApp action points

### Phase 8 - Payments and Receipts

- Contract-scoped payment creation
- Posted payment immutability UX
- Reversal/replacement workflow
- Receipt generation from posted payment
- Receipt print/download/send actions

### Phase 9 - Reports

- Collection report
- Outstanding report
- Profit/expense report
- Occupancy report
- Expiring contracts report
- Tenant statement
- Property statement

## 11. Pull Request Rules

Every PR must be small enough to review and must map to the plan.

Every PR description must include:

- Summary
- Changed files
- Testing results
- Risks/notes
- Next step according to this plan

Every code PR must run and report:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

If dependencies changed, also run:

```bash
pnpm install --frozen-lockfile
```

Do not merge PRs with failing required checks.

If Vercel is pending, wait for the deployment result before merging.

If SonarQube or Codacy report blocking issues, fix them before merge unless there is an explicit documented reason.

## 12. Codex Task Discipline

Codex tasks must be constrained.

A good Codex task should include:

1. The exact phase from this plan.
2. The exact files or module area to inspect first.
3. Forbidden legacy patterns.
4. Required testing commands.
5. Required PR response format.

Codex must not randomly improve unrelated screens in the same PR.

Codex must not add a new architecture when the existing architecture supports the requested work.

Codex must not remove large-codebase capabilities simply because they are not part of the immediate visible workflow. If a feature is not ready, hide it from navigation rather than deleting it, unless deletion is explicitly requested.

## 13. Immediate Next Tasks

After this master plan is merged:

1. Finish and merge the Contracts list recovery PR after all checks pass.
2. Add a centralized money/currency formatting foundation.
3. Add or inspect i18n foundations and document the current state.
4. Fix dashboard PR duplication before merging dashboard changes.
5. Continue contracts detail/timeline work before expanding payments and reports.

## 14. Product Definition of Done

A screen is not considered commercially ready until it has:

- Loading state
- Empty state
- Error state
- Null relation handling
- RTL-ready layout
- LTR-safe layout where applicable
- Currency-aware money display
- Status badges where state matters
- Clear primary action
- Clear secondary actions
- No orphan financial flows
- No legacy architecture regression
- Passing typecheck, lint, and build
