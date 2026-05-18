# Phase 7 PR 7.1 — Owner Model Audit and Implementation Plan

Date: 2026-05-18  
Phase: Phase 7 — Owners / Property Ownership  
Scope: docs-only audit of the current owner/property ownership model and a safe implementation path for the next small UI PR.  
Mode: no runtime app changes, no Supabase migrations, no RLS changes, no owner accounting, no statements, no ledger, and no financial posting.

## 1. Prerequisite confirmation

Phase 6 is complete in the current baseline. The repository history shows PR #540 merged as `Phase 6 PR 6.3 — Contract unit safety and completion report (#540)`, and the Phase 6 completion report recommends starting Phase 7 after PR 6.3 is merged.

Phase 6 intentionally deferred owner relationship modeling and owner reporting/accounting. This Phase 7 PR 7.1 keeps that boundary by auditing the existing owner data model first and avoiding implementation changes.

## 2. Current owner model inventory

### 2.1 `properties.owner_name`

The existing `properties` table still has `owner_name text` as a nullable display/legacy field. The current handwritten database types expose it as `owner_name: string | null`, and the property form schema accepts it as optional text transformed to `null` when blank.

Current behavior:

- Property create/edit stores `owner_name` directly on the property payload.
- Property list searches `owner_name` alongside title and address.
- Property list displays `property.owner_name ?? '—'`.
- Property detail displays `property.owner_name ?? '—'` in the main information card.

Audit conclusion: `owner_name` is actively used by the property UI/service and must remain backward-compatible. It should not be removed, migrated away, or made secondary until a safe user-visible transition exists.

### 2.2 `owners`

A normalized `owners` table already exists in the database type layer and in migration `20260515130000_owner_relationship_foundation.sql`.

Observed columns:

- `id`
- `full_name`
- `display_name`
- `phone`
- `email`
- `national_id`
- `tax_number`
- `address`
- `notes`
- `is_active`
- `created_at`
- `updated_at`

Observed database protections:

- `full_name` is required and guarded by a non-blank check constraint.
- RLS is enabled and forced.
- Authenticated users can manage rows via the existing owner policy.
- `owners_set_updated_at` uses the existing `public.set_updated_at()` pattern.

Audit conclusion: the normalized owner table is present and usable for non-accounting owner identity data.

### 2.3 `property_owners`

A normalized join table already exists between `properties` and `owners`.

Observed columns:

- `id`
- `property_id`
- `owner_id`
- `ownership_percentage`
- `is_primary`
- `starts_on`
- `ends_on`
- `created_at`
- `updated_at`

Observed database protections:

- `property_id` references `properties(id)` with `on delete cascade`.
- `owner_id` references `owners(id)` with `on delete restrict`.
- `ownership_percentage` defaults to `100` and is constrained to greater than `0` and less than or equal to `100`.
- Active duplicate owner/property rows are prevented by a partial unique index on `(property_id, owner_id)` where `ends_on is null`.
- Active primary owner uniqueness is attempted with a guarded partial unique index on `property_id` where `ends_on is null and is_primary`.
- A trigger validates that active ownership percentages do not exceed `100` and that only one active primary owner exists per property.
- RLS is enabled and forced.
- Authenticated users can manage rows via the existing property-owner policy.
- `property_owners_set_updated_at` uses `public.set_updated_at()`.

Audit conclusion: the schema already supports multiple owners per property safely enough for identity/relationship tracking, but product UI should still avoid complex percentage workflows unless they are already present and validated. This PR should not add more ownership math or financial meaning to percentages.

### 2.4 `people` records that may represent owners

The `people` table includes `type: 'tenant' | 'owner' | 'contact'`. The People list and form are active and allow users to create records with type `owner`.

Important distinction:

- `people.type = 'owner'` is a generic contact/person classification.
- `owners` is a separate normalized owner identity table.
- No observed foreign key links `people` owner records to `owners` rows.
- Property ownership relationships use `owners` and `property_owners`, not `people`.

Audit conclusion: there are currently two owner-adjacent identity concepts: people classified as owner, and normalized owners. Phase 7 should not merge or migrate them in a small PR. The safest approach is to keep People unchanged and document that it remains a general contact registry until a later identity unification decision.

## 3. Current UI/service usage

### 3.1 Properties UI/service

Properties currently use the text owner field as the primary owner display in the main property screens:

- `property-service.ts` selects `properties` only and does not join `property_owners` or `owners`.
- `listProperties()` includes `owner_name` in its search OR expression.
- `createProperty()` and `updateProperty()` persist the property schema payload, including `owner_name`.
- `PropertiesListPage` shows an owner column from `property.owner_name`.
- `PropertyDetailPage` shows an owner info item from `property.owner_name`.
- `PropertyFormPage` has an `owner_name` input labelled `اسم المالك`.

Audit conclusion: the core property workflow is still text-owner based. Any next implementation should preserve this and make copy/display clearer rather than replacing it.

### 3.2 Owners UI/service

A dedicated Owners route and feature already exist:

- `/owners` is in the protected route set and sidebar navigation.
- `OwnersPage` loads owners, properties with owners, and active contracts.
- `ownerService.ts` provides owner CRUD, property-owner linking, link updates, unlink-by-ending, and a display helper that prefers active normalized owner names then falls back to `owner_name`.
- `ownerUiHelpers.ts` summarizes owners, linked properties, unlinked properties, and owner workspace rows.
- Existing tests cover owner service/helper behavior.

Audit conclusion: owners are reachable from UI and normalized owner relationships are already partly implemented. However, the main property list/detail screens do not consume the normalized display helper or joined owner data today.

### 3.3 People UI/service

People are reachable from `/people` and support tenant/owner/contact classification. Contracts use `listPeople({ type: 'tenant' })` for tenant selection. No property owner workflow appears to depend on `people.type = 'owner'`.

Audit conclusion: People should remain unchanged in Phase 7 PR 7.2. Owner identity reconciliation between `people` and `owners` is a larger product decision.

### 3.4 Routes

The current protected routes include:

- `/properties`
- `/properties/new`
- `/properties/$propertyId`
- `/properties/$propertyId/edit`
- `/people`
- `/people/new`
- `/people/$personId/edit`
- `/owners`

Audit conclusion: the Owners module is directly reachable, so Phase 7 does not need to create a new route. The smallest useful follow-up is to improve owner display consistency where property users already look.

## 4. Current schema/type observations

1. `artifacts/rentrix/src/types/domain.ts` already exports `Owner` and `PropertyOwner` from the handwritten database types.
2. `artifacts/rentrix/src/types/database.ts` includes `owners`, `property_owners`, `properties.owner_name`, and `people.type = 'owner'`.
3. `property-schema.ts` still includes `owner_name` and does not include `owner_id`, `owner_ids`, or ownership percentage fields.
4. `property-service.ts` does not join owner relationship rows.
5. `ownerService.ts` already has `getPropertyOwnerDisplayName()` to prefer active normalized owner relationships while falling back to `properties.owner_name`.
6. The owner relationship migration explicitly keeps `properties.owner_name` intact and performs no backfill.
7. No new migration is necessary for PR 7.1 or the recommended PR 7.2 display change.

## 5. Answers to the main audit questions

### 5.1 What owner-related tables/types already exist?

Existing owner-related model pieces:

- `owners` table and database/domain types.
- `property_owners` table and database/domain types.
- `properties.owner_name` legacy/display field.
- `people` table with `type = 'owner'` as a generic person classification.
- Owner service/helper/test files under `artifacts/rentrix/src/features/owners`.

### 5.2 Is the current app using normalized owner relationships or only text `owner_name`?

Both exist, but usage is split:

- Core Properties list/detail/form/service use only `properties.owner_name`.
- The Owners workspace uses normalized `owners` and `property_owners`.
- Property screens do not currently join or display normalized owner relationships.

### 5.3 Are owners currently reachable from UI?

Yes. `/owners` exists as a protected route and is included in sidebar navigation. `/people` also allows people records of type owner, but that is a separate generic contact path rather than the normalized owner relationship workspace.

### 5.4 Should Phase 7 keep the product small by using one owner per property, or prepare for multi-owner percentages later?

The schema already permits multiple owner relationships with guarded percentages, but Phase 7 should keep the product small in the property UI:

- Keep `properties.owner_name` working.
- Treat normalized `property_owners` as a relationship display source where already available.
- Avoid adding a new complex ownership percentage workflow in property create/edit.
- Do not attach financial meaning to percentages.
- Prefer showing the active primary/linked owner names read-only in property screens before expanding edit flows.

This path preserves current behavior and leaves the normalized multi-owner foundation available for a later owner relationship refinement PR.

### 5.5 What is the safest next implementation step without breaking properties/contracts/financials?

The safest PR 7.2 step is a small owner display consistency change, not a schema or accounting change:

1. Keep `properties.owner_name` in the property form and payload.
2. Improve the property form label/help copy to clarify that this is a text/display owner name kept for compatibility.
3. If the implementation can reuse existing owner helpers without broad service rewrites, improve property list/detail owner display by using normalized active owner names where a relationship query is already safely available, with `owner_name` as fallback.
4. If adding normalized joins to property list/detail would make PR 7.2 too broad, keep the code change to labels/copy only and defer joined display.
5. Add a Phase 7 completion report after PR 7.2.

### 5.6 What must remain deferred to owner accounting / statements / ledger phases?

Deferred until explicit accounting/ledger phases:

- Owner statements.
- Owner balances.
- Owner ledger entries or journal posting.
- Owner payable/receivable calculations.
- Profit/loss distribution by ownership percentage.
- Automatic rent/expense allocation to owners.
- Owner payment runs or settlement workflows.
- Financial dashboards and accounting reports based on owner relationships.
- Backfilling historical financial records to owners.

## 6. Risks

### 6.1 Split owner identity concepts

The app has `people.type = 'owner'` and separate `owners` rows. Users may expect them to be the same concept, but there is no FK or sync path today.

Mitigation: do not merge them in Phase 7. Label/copy should avoid implying that a People owner automatically owns properties.

### 6.2 Backward compatibility with `owner_name`

Existing property records may only have `owner_name`. Removing or ignoring it would hide useful production data.

Mitigation: keep `owner_name` visible and searchable. Use it as a fallback even if normalized owner display is introduced later.

### 6.3 Multi-owner percentages can be mistaken for accounting rules

`property_owners.ownership_percentage` exists and is validated, but the app has not implemented owner accounting.

Mitigation: keep percentage display/workflows separate from financial calculations. Copy should explicitly say no balances, settlements, statements, or posting are created.

### 6.4 Property service joins could broaden review scope

Changing `listProperties()` to join relationships may affect pagination, search, types, and tests.

Mitigation: PR 7.2 should prefer the smallest possible property display/copy improvement. If joins are used, keep them read-only and fallback-safe.

### 6.5 Financial feature coupling

Contracts, invoices, payments, financials, accounting, and reports are active areas. Owner relationships must not change their behavior in Phase 7.

Mitigation: avoid all payment, receipt, invoice, contract mutation, dashboard, report, accounting, and ledger changes.

## 7. Recommended Phase 7 implementation path

### PR 7.1 — Owner model audit and implementation plan

This PR. Docs-only.

Deliverables:

- Inventory existing owner tables/types/UI.
- Confirm Phase 6 completion baseline.
- Recommend a small PR 7.2 display/UI scope.
- Explicitly defer owner accounting and financial posting.

### PR 7.2 — Owner display/UI implementation and completion report

Recommended scope:

- Keep `properties.owner_name` unchanged.
- Improve Arabic label/copy around the property `owner_name` field so it is clearly a display/legacy owner name, not a normalized ownership/accounting workflow.
- Optionally, if tiny and safe, reuse existing owner display helper/read data to show active normalized owner names in read-only property display with `owner_name` fallback.
- Add `docs/PHASE_7_OWNER_MODEL_COMPLETION_REPORT_2026_05_18.md`.
- Run typecheck/build/lint and the standard guardrail checks.

Recommended acceptance criteria:

- Existing property create/edit behavior remains compatible.
- Existing owner workspace remains reachable and unchanged unless PR 7.2 intentionally touches a small display helper.
- No schema migration.
- No RLS change.
- No financial/accounting side effects.

### Later owner relationship refinement, if needed

Only after PR 7.2 and product confirmation:

- Decide whether `people.type = 'owner'` should remain separate from `owners` or be linked by a new optional FK/reference.
- Consider a guided migration/backfill from `properties.owner_name` to `owners`, but only with reviewable UI and rollback-safe behavior.
- Consider property form normalized owner selection only after preserving `owner_name` as fallback.
- Consider multi-owner UX only if users need it and after tests cover percentage validation and primary-owner rules.

## 8. Explicit non-goals

Phase 7 PR 7.1 does not and PR 7.2 should not:

- Add owner accounting.
- Add owner statements.
- Add ledger entries.
- Add profit/loss distribution.
- Add owner balance calculations.
- Add rent/expense allocation to owners.
- Change payment, receipt, invoice, contract, dashboard, financials, reports, or accounting behavior.
- Add Supabase migrations.
- Change RLS.
- Remove or migrate `properties.owner_name`.
- Merge `people` owners with normalized `owners`.
- Import from `legacy-src`.
- Reintroduce `useApp`, `AppContext`, `dataService`, local DB, or `react-router-dom`.

## 9. Proposed PR 7.2 scope

Title: `Phase 7 PR 7.2 — Owner display implementation and completion report`

Smallest safe implementation:

1. Update property owner field copy/label in `PropertyFormPage` to clarify it is a display owner name kept for existing property records.
2. Update owner display copy in `PropertiesListPage` and/or `PropertyDetailPage` if needed so users understand the current field is a display owner name.
3. If still small and low-risk, introduce a read-only normalized-owner display fallback path that prefers active `property_owners.owner` names and falls back to `properties.owner_name`, without changing create/edit payloads.
4. Add the Phase 7 completion report.

PR 7.2 should stop at copy/display consistency if normalized relationship display requires broad query or type changes.

## 10. Validation checklist

PR 7.1 validation:

- `git diff --check`
- `rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true`
- `pnpm --filter ./artifacts/rentrix run typecheck`
- `pnpm --filter ./artifacts/rentrix run build`
- `pnpm --filter ./artifacts/rentrix run lint`

PR 7.2 validation should additionally run the broader standard project checks when available:

- `pnpm --filter ./artifacts/rentrix test`
- `pnpm --filter ./artifacts/rentrix run test:financials`

Hosted validation expectations:

- Vercel preview should build.
- SonarCloud should report no new issues.
- Codacy should report no high-risk AI Review blockers.
- Supabase should not require migration review for PR 7.1 or the recommended no-migration PR 7.2.

## 11. Final recommendation

Proceed to Phase 7 PR 7.2 after this docs-only audit is merged. Keep PR 7.2 commercial-safe and display-focused: preserve `properties.owner_name`, avoid accounting, and use normalized owner relationships only for gradual read-only display if the implementation remains tiny and fallback-safe.
