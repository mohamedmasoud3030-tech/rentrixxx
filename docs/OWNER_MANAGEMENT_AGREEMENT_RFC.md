# Owner Management Agreement RFC (Audit + Design Only)

- Status: Draft (Audit complete, implementation deferred)
- Date: 2026-05-23
- Scope: Data model + phased plan only (no migrations, no runtime features)

## 1) Problem statement

Rentrix currently supports owners, properties, units, contracts, invoices, receipts, payments, expenses, and operational reports. However, it does **not** model the commercial agreement between the office and owner (how money is split or guaranteed).

Without an explicit owner-office agreement model, the system cannot safely or consistently compute:
- owner entitlement,
- office commission/fee,
- guaranteed owner payout,
- expense deduction behavior,
- tax treatment,
- deposit treatment,
- payout cycle and cut-off rules.

## 2) Why owner statements cannot be correct today

Current reports intentionally stay operational/read-only and explicitly defer accounting-grade reporting and owner statements. Existing financial services aggregate invoices/payments/expenses but do not include agreement semantics or owner distribution rules.

As a result, any owner statement produced now would require hidden assumptions and would be non-auditable.

## 3) Current schema and code findings (audit)

### 3.1 Owner-property relationship model today

- `owners` stores identity/contact metadata (name, tax number, notes, active flag).
- `properties` still has legacy `owner_name` text and is not agreement-aware.
- `property_owners` is the normalized relationship table with:
  - `property_id`, `owner_id`,
  - `ownership_percentage`,
  - `is_primary`,
  - effective dates `starts_on`, `ends_on`.
- A unique partial index prevents duplicate active links for the same owner/property pair (`ends_on is null`).

Conclusion: the model supports **ownership linkage and percentages**, but not **management agreement economics**.

### 3.2 Owner-office agreement concept today

No table/field currently represents agreement type, commission basis, fixed payout, guaranteed minimum, tax allocation, or payout schedule.

### 3.3 Contracts/financial model today

- Contracts connect tenant/property/unit and rent terms.
- Invoices/receipts/payments capture operational collections.
- Expenses are tracked by property/category/date/amount.
- Reports intentionally avoid advanced accounting distribution logic.

Conclusion: financial primitives exist, but agreement policy layer is missing.

## 4) Missing fields needed for entitlement correctness

To compute owner and office shares safely, these are missing today:

1. **Agreement classification** per owner-property link (or version):
   - percentage of gross collections,
   - percentage of net collections,
   - fixed owner payout,
   - fixed management fee,
   - guaranteed minimum + percentage,
   - fixed + profit share.
2. **Effective date versioning** with no overlaps.
3. **Calculation basis config**:
   - cash vs accrual,
   - period cut-off policy,
   - invoice/receipt inclusion rules.
4. **Expense deduction policy**:
   - deductible categories,
   - shared vs owner-only vs office-only,
   - pre/post commission deduction sequence.
5. **Tax handling**:
   - tax-inclusive vs tax-exclusive basis,
   - commission VAT/GST flags and rates,
   - withholding/tax retention party.
6. **Deposit handling**:
   - security deposit excluded/included,
   - retained escrow behavior.
7. **Payout cadence**:
   - monthly/quarterly/on-demand,
   - lock day / grace period / minimum disbursement threshold,
   - carry-forward behavior.
8. **Rounding + residual policy**:
   - rounding precision,
   - residual cent handling.
9. **Approvals/immutability**:
   - draft/active/superseded,
   - who approved and when,
   - post-close edit restrictions.

## 5) Agreement type definitions (proposed)

Canonical enum (exact names requested):

1. `percentage_of_gross_collections`
   - Office takes % of gross eligible collections; owner receives remainder.
2. `percentage_of_net_collections`
   - Eligible expenses deducted first (per policy), then office % applied on net.
3. `fixed_owner_payout`
   - Owner receives fixed amount per payout cycle; office keeps residual (or carries deficit rule).
4. `fixed_management_fee`
   - Office takes fixed fee per cycle; owner receives remaining eligible net.
5. `guaranteed_minimum_plus_percentage`
   - Owner guaranteed floor + percentage share of qualifying upside.
6. `fixed_plus_profit_share`
   - Office takes fixed base + additional percentage from defined profit pool.

## 6) Calculation examples (spec-level only)

> These are policy examples for RFC clarity only; no runtime calculation is introduced.

Assume period cash collections = 10,000; deductible expenses = 2,000; tax excluded for simplicity.

1. `percentage_of_gross_collections` (office 8%)
   - office = 10,000 × 8% = 800
   - owner = 9,200

2. `percentage_of_net_collections` (office 10% of net)
   - net = 10,000 − 2,000 = 8,000
   - office = 8,000 × 10% = 800
   - owner = 7,200

3. `fixed_owner_payout` (owner fixed 6,000)
   - owner = 6,000
   - office = 4,000 (before any separate policy adjustments)
   - if collections < 6,000 => deficit carry-forward rule required

4. `fixed_management_fee` (office fixed 500)
   - office = 500
   - owner = (10,000 − 2,000 − 500) = 7,500 (if fee is post-expense in policy)

5. `guaranteed_minimum_plus_percentage` (min 6,000 + 20% upside above 8,000 net)
   - net = 8,000 => no upside
   - owner = 6,000; office = 2,000
   - if net 10,000 => upside 2,000 => owner +400 (20%)

6. `fixed_plus_profit_share` (office fixed 300 + 15% of profit pool)
   - profit pool policy example: (collections − deductible expenses − fixed)
   - pool = 10,000 − 2,000 − 300 = 7,700
   - office variable = 1,155; office total = 1,455; owner = 6,545

## 7) Proposed schema (for later implementation, not executed)

### 7.1 New table: `owner_management_agreements`

Purpose: versioned agreement header for one owner-property relationship.

Proposed columns:
- `id uuid pk`
- `property_id uuid not null fk properties`
- `owner_id uuid not null fk owners`
- `property_owner_id uuid null fk property_owners` (optional explicit tie)
- `agreement_type text not null` (enum values above)
- `status text not null default 'draft'` (`draft|active|superseded|terminated`)
- `starts_on date not null`
- `ends_on date null`
- `currency text not null`
- `calculation_basis text not null` (`cash_collected|accrual_billed`)
- `payout_cycle text not null` (`monthly|quarterly|custom`)
- `payout_day smallint null`
- `min_payout_amount numeric(12,2) null`
- `carry_forward_deficit boolean not null default true`
- `tax_inclusive boolean not null default false`
- `deposit_treatment text not null default 'exclude'`
- `rounding_mode text not null default 'half_up_2dp'`
- `notes text null`
- audit columns `created_at/updated_at/created_by/approved_by/approved_at`

Constraints:
- check `ends_on is null or ends_on >= starts_on`
- one active agreement per `property_id + owner_id` per date window (no overlap)

### 7.2 New table: `owner_agreement_terms`

Purpose: parameterize math per agreement type.

Proposed columns:
- `id uuid pk`
- `agreement_id uuid fk owner_management_agreements on delete cascade`
- `office_commission_rate numeric(7,4) null`
- `owner_share_rate numeric(7,4) null`
- `fixed_owner_payout_amount numeric(12,2) null`
- `fixed_management_fee_amount numeric(12,2) null`
- `guaranteed_minimum_amount numeric(12,2) null`
- `profit_share_rate numeric(7,4) null`
- `upside_threshold_amount numeric(12,2) null`
- `apply_commission_before_expenses boolean null`
- `created_at/updated_at`

Validation should enforce required/forbidden fields by `agreement_type`.

### 7.3 New table: `owner_agreement_expense_rules`

Purpose: deduction policy.

Columns:
- `id uuid pk`
- `agreement_id uuid fk`
- `expense_category text not null`
- `treatment text not null` (`deductible|non_deductible|cap_only`)
- `cap_amount numeric(12,2) null`
- unique `(agreement_id, expense_category)`

### 7.4 New table: `owner_agreement_tax_rules`

Purpose: configurable tax behavior.

Columns:
- `id uuid pk`
- `agreement_id uuid fk`
- `rule_type text not null` (`commission_tax|withholding_tax|owner_tax`)
- `rate numeric(7,4) not null`
- `applies_to text not null`
- `is_inclusive boolean not null default false`

### 7.5 Optional snapshot table for future statements only

Not for this task, but future-safe:
- `owner_statement_runs` with locked calculation inputs, version tag, and checksum.

## 8) RLS and security considerations (required)

1. Agreements are sensitive financial policy; limit write access to `ADMIN` and `MANAGER`.
2. Consider `draft` editable, but `active` only editable via controlled revision/supersede flow.
3. No hard delete for active agreements; prefer status transitions + audit log.
4. Add immutable audit trail for approval actions.
5. If owner portal is introduced later, owner reads must be constrained to own agreements only (separate policy path).
6. Ensure statement generation (future) reads a frozen agreement version tied to statement period.

## 9) Affected pages/services (current app impact map)

When implemented in later phases, the following areas are affected:

- Owners feature (`OwnersPage`, owner service/hooks):
  - add agreement tab/workspace per owner-property link.
- Properties feature:
  - show current agreement summary and effective dates.
- Contracts feature:
  - read-only notice of agreement basis impacting downstream owner distributions.
- Invoices/payments/receipts:
  - no direct contract change initially, but inclusion filters for owner statements depend on agreement basis.
- Expenses service/UI:
  - category mapping must support deductible/non-deductible agreement rules.
- Reports page/services:
  - owner-facing financial reports must depend on agreement versions.
- Future owner statements module:
  - primary consumer of the agreement model.

## 10) UI changes required (later task)

1. New “Owner Agreement” panel in owner-property relationship flow.
2. Agreement wizard:
   - type selection,
   - terms inputs validated by type,
   - expense/tax/deposit policy sections,
   - effective period + payout schedule.
3. Agreement timeline/history list with active badge.
4. Supersede action (creates new version; closes prior with `ends_on`).
5. Validation UX preventing overlap and missing required fields.

## 11) Test plan (later task)

### 11.1 Unit tests
- term validation by agreement type,
- overlap detection,
- payout cycle validation,
- expense/tax rule validation,
- rounding behavior at boundaries.

### 11.2 Service/integration tests
- CRUD authorization by role,
- activation/supersede workflow,
- policy lock behavior once active,
- cross-tenant isolation under RLS.

### 11.3 Report contract tests
- agreement resolution by date,
- deterministic result on frozen inputs,
- unchanged result after unrelated data edits.

## 12) Safe phased implementation plan

### Phase 0 (this task) — Audit + RFC
- Complete discovery and design document only.
- No schema migrations, no runtime behavior.

### Phase 1 — Schema foundation
- Add agreement tables + constraints + RLS + audit primitives.
- Backfill/mapping strategy for existing owner/property links with `draft` defaults.
- No statement engine yet.

### Phase 2 — Admin UI + services
- CRUD agreement management for admin/manager only.
- Validation and supersede flow.
- No payout execution yet.

### Phase 3 — Calculation engine (internal)
- Deterministic owner entitlement computation by period and agreement version.
- Snapshot/freeze strategy.

### Phase 4 — Owner statements
- Read-only statement generation and export based on frozen snapshots.
- Reconciliation/reporting QA.

## 13) Risks and open decisions

1. Should agreement attach to `property_owners` row or directly to (`property_id`,`owner_id`) pair?
2. Should one property support multiple simultaneous owners with independent agreement types? (likely yes)
3. Cash vs accrual policy default for legacy data.
4. Handling negative periods/deficits and cross-period carry-forward.
5. Tax regime flexibility by country and company settings.
6. Deposit/advance payment classification boundaries.
7. Whether future ledger integration becomes mandatory before production owner statements.

## 14) Explicit non-goals for this RFC task

- No Supabase migration changes.
- No generated client/type regeneration.
- No owner statement runtime implementation.
- No payout posting logic.
- No accounting ledger model implementation.

## 12) Phase implementation status update (2026-05-24)

### ✅ Phase 1 — Implemented in this branch
- Supabase schema foundation migration for owner management agreements and terms/rules tables.
- RLS + policies + grants for new agreement tables.
- TypeScript domain contracts for agreement data and future phase interfaces.
- Input validation helpers for draft agreement and terms.
- Minimal internal Owners UI section "اتفاقيات الإدارة" (foundation-only notice, no financial calculations).

### ⏭️ Phase 2 — Deferred (not implemented)
- حساب مستحق المالك.
- حساب عمولة المكتب.
- حساب ربح المكتب.
- Calculation engine only (no posting yet).

### ⏭️ Phase 3 — Deferred (not implemented)
- كشف حساب المالك النهائي.
- Statement review/freeze/export.

### ⏭️ Phase 4 — Deferred (not implemented)
- الترحيل المحاسبي.
- Journal entries, posting/reversal/reconciliation rules.
