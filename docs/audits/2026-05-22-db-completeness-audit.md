# Rentrix DB Completeness Audit (2026-05-22)

## Executive summary
- **Merge/deploy readiness: PAUSED / NOT READY**.
- **Blockers found:** schema ↔ frontend contract drift is substantial in core modules (owners, tenants, contracts, invoices/payments, maintenance, settings). Frontend expects columns/tables not present in migrations; migrations define tables/relationships not represented in frontend types.
- **Highest risks:**
  1) identity model mismatch (`people` vs `tenants`/`owners` tables) breaking contract/tenant flows,
  2) owner/property linkage mismatch (`property_owners` used by app but absent in SQL baseline),
  3) financial write/read mismatch (`payments`, invoices generation RPC shape/status fields),
  4) maintenance status/priority schema mismatch,
  5) settings columns missing in baseline while required by UI.

## Full completeness matrix (condensed)
| Module | Route | Service/hook | Tables used in app | Key app columns | DB present? | Risk | Recommended action |
|---|---|---|---|---|---|---|---|
| Dashboard | `/` | `dashboardService` | multiple + `rpt_financial_summary` | KPI counts, overdue, totals | partial | High | Align KPI source tables/status values and verify RPC assumptions.
| Properties | `/properties*` | `property-service` | `properties` | `type, owner_name, purchase_value, current_value, notes, latitude, longitude` | partial | High | Add/align missing property columns in SQL baseline + type file.
| Units | embedded under properties/contracts | `unit-service` | `units` | `floor, notes, status` | partial | Medium | Ensure unit optional fields exist and typed consistently.
| Owners | `/owners` | `ownerService`/`useOwners` | `owners`, `property_owners`, `properties`, `contracts` | owner contact + relation fields | no (critical table mismatch) | **Blocker** | Create/align canonical owners schema + relation table + FKs.
| Tenants | `/tenants` | `tenantWorkspaceService` | `people`, `contracts`, `invoices` | expects person-centric tenant fields | mismatch | **Blocker** | Decide canonical tenant model (`tenants` join vs direct `people`) and align everywhere.
| People | `/people*` | `people-service` | `people` | `national_id,type,address,notes` | no/partial | High | Add missing columns or reduce frontend assumptions.
| Contracts | `/contracts*` | `contractService` | `contracts` (+ joins) | `property_id, rent_amount, payment_cycle, renewed_from_id, cancellation_reason` | partial | **Blocker** | Reconcile contracts column names/types (`monthly_rent` vs `rent_amount`, required `unit_id`).
| Financials/Invoices/Arrears | `/financials,/invoices,/arrears` | invoice/payment/receipt services | `invoices,payments,contracts,receipts` + RPCs | invoice notes/status, payment refs/status, atomic posting | partial | **Blocker** | Align `payments`/`invoices` columns + ensure all called RPCs exist.
| Reports | `/reports` | reports services | invoices/payments/contracts/expenses | occupancy/aging/report rows | partial | High | Verify every report query field exists; document derived occupancy assumptions.
| Maintenance | `/maintenance` | `maintenance-service` | `maintenance_requests` | `priority, assigned_to, resolved_at, status` | no/partial | High | Align status enum (`done/cancelled` vs `resolved/closed`) and missing columns.
| Leads | `/leads` | leads service/hook/schema | `leads` | `full_name, phone, email, source, status, notes, assigned_to` | yes (phase 2) | Low | Keep; verify policies grant intended read/write roles.
| Property Map | `/property-map` | properties hooks/page | `properties` | `latitude, longitude` | yes in phase2 | Low | Keep null-safe rendering and backfill optional.
| Settings + Change Password | `/settings` | `companySettingsService` | `company_settings` + Supabase auth | many company profile fields | no/partial | High | Expand table to match form or reduce form contract; change-password is auth-only.
| Audit Log | `/audit-log` | audit page + `useCurrentUserRole` | `audit_log`, `users` | role-gated read + action metadata | mostly | Medium | Confirm `public.users` row bootstrap always present.
| Communication | `/communication` | shell page | none runtime | placeholder only | n/a | Low | No DB needed now; list future tables separately.
| Assistant | `/assistant` | shell page | none runtime | placeholder only | n/a | Low | No DB needed now; future edge function only.

## Missing / mismatched DB objects
- Missing tables: `property_owners` (used heavily by owners module).
- Missing/renamed columns (examples):
  - `properties`: `type, owner_name, purchase_value, current_value, notes` missing in baseline.
  - `people`: `national_id,type,address,notes` missing in baseline.
  - `owners`: app expects person-like fields (`full_name`, phone, email, etc.) but baseline has `person_id` + notes only.
  - `contracts`: app expects `rent_amount,payment_cycle,renewed_from_id,cancellation_reason,property_id` while baseline has `monthly_rent` and no cycle/renewal metadata.
  - `invoices`: app expects `notes`.
  - `payments`: app expects `reference_number,updated_at`; baseline uses `status/voided_at/created_by` and no `updated_at` trigger.
  - `maintenance_requests`: app expects `priority,assigned_to,resolved_at` and statuses `resolved/closed` while DB enum is `open/in_progress/done/cancelled`.
  - `company_settings`: app expects legal/tax/contact/localization/prefix fields absent in baseline.
- Missing indexes likely needed for active filters/search:
  - `contracts(property_id,status)` only partially present (property index added phase 3 migration but coverage should be reviewed).
  - `payments(invoice_id,payment_date)` and `invoices(due_date,status)` for arrears/reporting.
- Missing FK coverage (frontend assumption mismatches): owner/property linking cannot be validated without `property_owners` table.
- Missing RPC/function referenced by frontend: `generate_invoices_from_active_contracts` is called by invoice service but not present in migrations.

## database.ts drift audit
- Types exist but SQL table absent: `property_owners`.
- SQL tables absent in types: `tenants`, `receipts`, `receipt_allocations`.
- Column drift: extensive in `company_settings`, `owners`, `people`, `contracts`, `payments`, `maintenance_requests`, `properties`.
- Enum/status drift:
  - maintenance status (`done/cancelled` in DB vs `resolved/closed` in app types/UI).
  - potential contract amount naming drift (`monthly_rent` DB vs `rent_amount` app).
- Nullable/relationship drift:
  - `contracts.unit_id` non-null in SQL baseline, nullable in `database.ts`.
  - tenant relation represented differently across SQL (`tenants`) and app queries (`people`).

## Flow-specific readiness
- A Properties→Units: partial support; coordinates now present; property metadata columns still mismatched.
- B Owners: not ready (relation-table + owner model mismatch).
- C Tenants: not ready (people/tenants dual model conflict).
- D Contracts: not ready (field naming + relationship expectation drift).
- E Invoices/Payments/Receipts: not ready (missing RPC + payment column drift).
- F Reports: medium-high risk; queries run but rely on drifted financial schema.
- G Maintenance: not ready until status/priority/assignment model aligned.
- H Leads: ready for MVP with current RLS/grants.
- I Property Map: ready for MVP (nullable coordinates handled).
- J Settings/ChangePassword: settings not fully ready; change-password is auth-only and okay.
- K Audit Log: mostly ready; depends on synchronized `public.users` rows and admin/manager role policy.
- L Communication: shell-only intentionally.
- M Smart Assistant: shell-only intentionally.

## RLS/security audit summary
- Baseline includes RLS+force on core tables and role helper functions.
- `leads` RLS/policies/grants present in phase2 and aligned with admin/manager mutations.
- Risk: where frontend queries a table/column model different from SQL, security intent may be bypassed by fallback logic or fail-closed errors; fix schema contract first.

## Recommended migration plan (do not execute yet)
- **P0 (pre-merge blockers):** owners/property_owners model alignment; tenants/people/contracts canonical linkage; contracts column alignment; payments/invoices/RPC (`generate_invoices_from_active_contracts`) alignment; maintenance status/fields alignment; company_settings required fields.
- **P1 (post-merge important):** index tuning for arrears/reports/search; strengthen FK constraints + partial indexes for soft-delete patterns; database.ts regeneration/normalization.
- **P2 (future enhancements):** reporting materialization/aggregation functions, communication tables for outbound channels, assistant action logs.

## Explicit no-go list (confirmed)
Do **not** build now: GeneralLedger, full Accounting, Commissions, Lands, OwnersHub, OwnerView, advanced assistant actions, real WhatsApp/SMS/email sending.
