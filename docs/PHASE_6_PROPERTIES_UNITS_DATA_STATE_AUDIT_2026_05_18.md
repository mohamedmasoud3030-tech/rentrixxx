# Phase 6 PR 1 — Properties and Units Data/State Audit

Date: 2026-05-18  
Phase: Phase 6 — Properties and Units  
Scope: docs-only audit of current `artifacts/rentrix/src/features/properties`, `artifacts/rentrix/src/features/units`, related routes, and contract references.  
Mode: no runtime code changes, no schema changes, no Supabase migrations, no UI rewrites, no legacy imports.

## 1. Executive summary

Phase 6 can start from an already-routed and mostly functional Properties/Units foundation. The current app has:

- A paginated, searchable, status-filtered Properties list.
- Create/edit forms for Properties.
- A Property detail page.
- Property-scoped Units management embedded in the Property detail page.
- React Query hooks for Property and Unit list/detail/mutations.
- Supabase-backed services for Properties and Units.
- Contract list/detail rows that join property, unit, and tenant display data.

The main Phase 6 risk is not missing screens. The risk is data/state correctness around unit occupancy, safe deletion/archive behavior, owner modeling, and contract coupling.

## 2. Current routing and screens

| Area | Current status | Evidence | Audit note |
|---|---|---|---|
| Properties list | Routed and active | `routes/_protected.properties.tsx` exports `PropertiesListPage`. | Keep as Phase 6 entry point. |
| Property detail | Routed and active | `routes/_protected.properties.$propertyId.tsx` exports `PropertyDetailPage`. | Detail page is the current container for units. |
| Property create | Routed and active | `routes/_protected.properties.new.tsx` exports `PropertyFormPage`. | Uses same form component as edit. |
| Property edit | Routed and active | `routes/_protected.properties.$propertyId.edit.tsx` exports `PropertyFormPage`. | Good route reuse. |
| Units | Embedded under property detail | `PropertyDetailPage` renders `UnitsList` with `property.id`. | No standalone units route currently. |

## 3. Current Properties implementation

### 3.1 List page

`PropertiesListPage` supports:

- Search by title/address/owner.
- Status filter using `PropertyStatusFilter`.
- Pagination with `pageSize = 10`.
- Read actions to detail/edit routes.
- Archive action through `useSoftDeleteProperty()`.
- Money display through company formatters.

Current implementation observations:

- The page uses `defaultCompanyLocalSettings` directly for money formatting. This matches existing patterns but Phase 6 should eventually decide whether Properties should consume saved company settings consistently with later app-wide formatting.
- Archive action asks browser `window.confirm`; this is acceptable for the current small app but not ideal for commercial UX.
- Archive action has no visible preflight check for linked active units/contracts in the UI layer.

### 3.2 Service layer

`property-service.ts` provides:

- `listProperties(params)` with Supabase `.from('properties')`, `deleted_at is null`, pagination, search, and status filtering.
- `getProperty(propertyId)`.
- `createProperty(payload)`.
- `updateProperty(propertyId, payload)`.
- `softDeleteProperty(propertyId)` by setting `deleted_at`.

Audit notes:

- The service is clean and Supabase-backed.
- Soft delete is implemented consistently through `deleted_at`.
- No explicit service-level guard was observed for archiving a property that still has active units, active contracts, unpaid invoices, or open maintenance. This may be handled by database constraints/policies, but Phase 6 should verify and surface clear user feedback.

### 3.3 Form schema

`property-schema.ts` currently models:

- `title`
- `type`
- `address`
- `owner_name`
- `purchase_value`
- `current_value`
- `status`
- `notes`

Property status values:

- `active`
- `inactive`
- `maintenance`
- `sold`

Audit notes:

- The form is appropriate for a small single-office product.
- `owner_name` is denormalized text, while `types/domain.ts` also contains `Owner` and `PropertyOwner` table types. Phase 6 must decide whether this phase keeps `owner_name` only or introduces owner relationship UI. Do not mix both casually.

## 4. Current Units implementation

### 4.1 Unit location in UI

Units are managed through `UnitsList` rendered from `PropertyDetailPage` only. This is a good constraint for Phase 6 because units should remain scoped under exactly one property.

### 4.2 Unit service layer

`unit-service.ts` provides:

- `listUnits()` across all units.
- `listUnitsByProperty(propertyId)` scoped to one property.
- `createUnit(propertyId, payload)` with `property_id` injected by service.
- `updateUnit(unitId, payload)`.
- `softDeleteUnit(unitId)` by setting `deleted_at`.

Audit notes:

- The service correctly prevents standalone unit creation in UI/service by requiring `propertyId` for `createUnit`.
- `listUnits()` exists globally and is used by other flows such as contract forms. It should stay, but Phase 6 should avoid turning it into a standalone unit management page unless the product explicitly needs that.
- No explicit preflight was observed for archiving a unit that has an active contract or financial history. This must be clarified before polishing destructive actions.

### 4.3 Unit form/schema

`unit-schema.ts` currently models:

- `unit_number`
- `floor`
- `status`
- `rent_amount`
- `notes`

Unit status values:

- `available`
- `occupied`
- `maintenance`
- `reserved`

Audit notes:

- Unit `status` is manually editable.
- The app already has contracts tied to `unit_id`; therefore `occupied` should either be derived from active contracts or guarded so it cannot contradict active contract data.
- Rent amount exists on unit and rent amount also exists on contracts. Phase 6 should define the rule: unit rent is suggested/default rent, contract rent is the actual agreed rent.

## 5. Contract coupling and occupancy risk

`contractService.ts` joins contracts to:

- `properties:property_id(id,title,address)`
- `units:unit_id(id,unit_number,floor,status,rent_amount)`
- `people:tenant_id(id,full_name,phone,email,national_id)`

This means Properties and Units already feed active commercial flows.

Phase 6 must preserve these rules:

1. A unit belongs to exactly one property.
2. A contract should reference one tenant and one unit/property path.
3. A unit should not have overlapping active contract periods.
4. A unit should not be archived while active commercial records depend on it unless the archive is explicitly safe and audited.
5. Displayed occupancy should not be a user-editable fiction when active contract data says otherwise.

## 6. Confirmed gaps to address in later Phase 6 PRs

### P0 — Must clarify before feature polish

1. **Unit occupancy source of truth**
   - Current unit `status` includes `occupied`.
   - Contracts also reference `unit_id`.
   - Next PR should audit database constraints/migrations and decide whether occupancy is derived, synchronized, or guarded.

2. **Safe archive boundaries**
   - Property and Unit soft delete exist.
   - Need guard/UX for linked units, active contracts, invoices, payments, and maintenance.

3. **Owner model decision**
   - Current UI uses `owner_name` text.
   - Domain types include `Owner` and `PropertyOwner`.
   - Need explicit decision: keep lightweight owner_name for this small project, or introduce owner relationship in a later owner phase.

### P1 — Useful Phase 6 improvements

1. **Property detail KPIs**
   - Count total units.
   - Count available/occupied/maintenance/reserved units.
   - Sum expected unit rent.
   - Keep these read-only and derived from current property-scoped units.

2. **Unit list UX safety**
   - Replace direct delete button action with confirmation and clearer archive language.
   - Disable/archive-block units with active contracts if service/database detects them.

3. **Contract form alignment**
   - Ensure unit options in contract forms show property context, status, and active contract risk.
   - Do not allow selecting unavailable/occupied units unless intentionally editing the same active contract.

### P2 — Later scope only

1. Owner statement/accounting-grade owner distributions.
2. Multi-owner property percentages.
3. Standalone units route.
4. Bulk unit import/export.
5. Full occupancy calendar.

## 7. Recommended Phase 6 PR sequence

### PR 6.2 — Occupancy and archive rules audit

Docs/code audit only or minimal service helpers. Confirm:

- Existing Supabase constraints/triggers for unit active-contract overlap.
- Whether unit status should be user editable.
- Whether property/unit archive must be blocked when dependencies exist.

### PR 6.3 — Property detail read-only KPIs

Add read-only summary cards to `PropertyDetailPage` from existing `useUnits(propertyId)` data:

- total units
- available units
- occupied units
- maintenance/reserved units
- expected rent total

No schema changes.

### PR 6.4 — Safer unit archive UX

Add explicit archive confirmation and dependency-aware messaging. If no backend guard exists yet, add UI copy that archive may fail because of linked records and surface Supabase error cleanly.

### PR 6.5 — Contract/unit selection safety

Audit and improve contract form unit selection labels and filtering without changing financial logic.

## 8. Explicit non-goals for PR 6.1

This PR does not:

- Change app runtime code.
- Change Supabase schema or migrations.
- Change financial calculations.
- Change contracts/payments/receipts.
- Add owner accounting.
- Add standalone units route.
- Import or restore legacy code.

## 9. Validation expected

Docs-only PR. Required checks:

- `git diff --check`
- `rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true`

Hosted checks expected:

- Vercel preview should build as docs-only.
- SonarCloud should report 0 new issues.
- Codacy should report 0 issues.
- Supabase should ignore this PR because it does not change `supabase/`.

## 10. Final recommendation

Start Phase 6 implementation with read-only, low-risk improvements first. The safest next implementation PR is `PR 6.3 — Property detail read-only KPIs`, but only after `PR 6.2 — Occupancy and archive rules audit` confirms whether unit occupancy is derived from contracts or manually maintained.
