# Phase 11 — Commercial Readiness Audit and Implementation Plan

Date: 2026-05-18  
Active phase: Phase 11 — Final Commercial Readiness / App-wide Polish  
PR: Phase 11 PR 11.1 — Commercial readiness audit and implementation plan  
Mode: docs-first audit and safe implementation plan only (no runtime code changes, no financial workflow changes, no schema/RLS/migration changes).

## Prerequisite confirmation

- Confirmed prerequisite completion artifact exists on current branch: `docs/PHASE_10_REPORTING_COMPLETION_REPORT_2026_05_18.md`.
- Phase 10 boundaries remain in effect for Phase 11 kickoff: reporting/read-only safety, no accounting/ledger expansion.

## Executive summary

Rentrix is **commercially usable for a small beta** in core operational areas (auth, dashboard overview, property/unit management, people directory, contracts lifecycle basics, maintenance operations, financial operations workspace, and read-only commercial reports), but it is **not yet accounting-grade** and should not be marketed as full bookkeeping software.

The safest and smallest Phase 11 implementation path is:

1. Keep PR 11.1 docs-only (this PR).
2. Execute PR 11.2 as a constrained UX polish pass only:
   - Empty states
   - Labels and helper copy
   - Loading/error copy consistency
   - Confirmation copy for existing actions
   - Minor readability/navigation improvements on already-routed pages
3. Defer all accounting/ledger, billing automation, owner/vendor statements, and schema/RLS changes.

This keeps risk low while improving perceived quality and operator confidence for beta usage.

---

## Current completed phase inventory

### Completed recovery phases (relevant to commercial readiness)

- **Phase 6 — Properties / Units**: core property + nested unit management stabilized.
- **Phase 7 — Owner model boundaries**: owner-related boundaries clarified; deeper owner finance remains deferred.
- **Phase 8 — Maintenance**: operational service-request workflows improved (filters, visibility, status/priority handling) without financial posting.
- **Phase 9 — Expenses**: operational expense tracking and filtering improved; no ledger/chargeback/billing coupling.
- **Phase 10 — Reporting**: read-only commercial reporting clarity improved; accounting statements explicitly deferred.

### Foundation artifacts reviewed

- Phase 6/7/8/9/10 completion and planning docs.
- Repository wiring inventory (`docs/RENTRIX_CODE_INVENTORY_AND_WIRING_AUDIT.md`).
- Feature folders, route definitions, domain/database types, and Supabase migration inventory.

---

## Commercial readiness matrix by feature area

Legend:
- **Beta-ready**: usable by small operator cohort with known limitations.
- **Operational-only**: intentionally non-accounting / non-posting behavior.
- **Deferred**: must wait for dedicated future phase.

| Area | Readiness | What is commercially usable now | Current boundary / limitation |
|---|---|---|---|
| Dashboard | Beta-ready (basic) | High-level operational KPIs and quick visibility surface are available. | Not final analytics command center; deeper reconciled accounting insights deferred. |
| Properties | Beta-ready | CRUD flows and list/detail navigation are in place. | Advanced owner financial modeling and broader portfolio intelligence deferred. |
| Units | Beta-ready (via property detail) | Unit CRUD and occupancy/rent context usable through property flows. | No standalone unit workspace route; advanced lifecycle/reporting polish remains. |
| Contracts | Beta-ready (core lifecycle) | Contract list/detail/form flows and status transitions are usable. | Deeper contract-finance coupling and advanced downstream automation deferred. |
| Invoices | Operational-only but usable | Invoice listing/generation and operational tracking exist in Financials workspace. | No accounting-ledger posting model in scope; avoid accounting-grade claims. |
| Payments | Operational-only but usable | Payment posting flow exists with receipt-oriented behavior and report invalidation wiring. | Must remain bounded to current operational behavior (no new financial mutation logic in Phase 11). |
| Receipts | Operational/read-only projections | Receipt listing/detail and report previews are available. | Remain projection/report artifacts, not accounting sub-ledger outputs. |
| Maintenance | Beta-ready (operations) | Service request intake, filters, summary, and status visibility are usable. | No vendor assignment/payment lifecycle and no automatic expense/accounting conversion. |
| Expenses | Operational-only but usable | Property/category/date filtering and operational summaries are available. | No chargebacks, vendor AP, or ledger posting workflows. |
| Reports | Beta-ready (commercial read-only) | Operational/commercial summaries and deferred-statement signaling are in place. | Accounting-grade statements (IS/BS/TB, owner/tenant statements) must stay deferred. |
| People | Beta-ready (directory) | Person list/form operations are usable for tenant/owner/contact records. | No advanced relationship portals/workflows. |
| Settings | Beta-ready (core company settings) | Company settings persistence/validation UX is usable. | Broader admin/governance/multi-role settings are limited and should remain constrained. |
| Accounting route | Deferred/placeholder | Route exists for future accounting phase signaling. | Intentionally not implemented as production accounting feature yet. |

---

## Areas still read-only, operational-only, or intentionally deferred

### Read-only / operational-only by design

- Reports are commercial read models and must stay non-mutating.
- Expenses remain operational cost records (not posted accounting entries).
- Maintenance cost fields remain operational context unless future explicit accounting design says otherwise.
- Receipt/report surfaces are safe projections over existing financial events.

### Intentionally deferred until dedicated accounting/ledger phase

- General ledger, journals, chart-of-accounts-level behavior.
- Accounting-grade financial statements and trustable reconciliation outputs.
- Owner statements and owner chargeback logic.
- Tenant billing beyond current bounded workflows.
- Vendor AP/payment lifecycle workflows.
- Broad financial recalculation engines or posting automation.

---

## UX/polish gap list (cross-area)

### Global polish gaps still visible

1. Inconsistent microcopy for empty/loading/error states across pages.
2. Mixed label clarity across operational vs deferred financial contexts.
3. Confirmation/caution copy varies across destructive or financially sensitive actions.
4. Some pages are denser than needed for first-time operators (scan/readability polish opportunity).
5. Cross-page consistency for status badges and helper text can be tightened.

### Area-specific gap themes

- **Dashboard**: clearer context labels about what is operational preview vs accounting truth.
- **Properties/Units**: consistency of empty-state guidance and next best action prompts.
- **Contracts**: tighten user guidance for edge statuses and no-result states.
- **Financials (invoices/payments/receipts/expenses)**: stronger helper copy for boundaries and safe intent of actions.
- **Maintenance**: reinforce non-financial nature of request cost and improve zero-data guidance.
- **Reports**: continue explicit deferred statement messaging and improve “as-of/period” readability consistency.
- **Settings**: normalize validation/help text tone and load/save feedback copy consistency.

---

## Data/safety gap list

1. Need sustained guardrail discipline to prevent accidental crossover from operational finance into accounting logic.
2. Route-level placeholders (e.g., accounting) should stay explicit to avoid false feature assumptions in beta.
3. Shared report definitions and terminology should remain centralized to reduce interpretation drift.
4. Mutation entry points in financial modules should remain narrowly scoped and auditable.
5. Any future migration/RLS changes require separate, explicit, high-scrutiny phase—not polish PRs.

---

## Supabase / Auth / RLS / advisor notes

### Supabase and migrations

- Migration history includes financial and reporting primitives; Phase 11.1 should not modify them.
- No migration expansion is needed for this docs-first PR.
- Phase 11.2 should also avoid schema changes unless scope is explicitly re-opened in another PR.

### Auth and protected routing

- Protected route topology is in place and should remain unchanged for Phase 11.1/11.2 polish.
- No auth model changes are needed for current commercial readiness polish scope.

### RLS and policies

- No RLS policy changes in Phase 11.1.
- RLS hardening, if needed, should be done as dedicated security/data-governance work with explicit testing.

### Advisors / DB safety

- Any Supabase advisor/security warning remediation that implies schema or policy mutation is **out of scope** for 11.1 and likely 11.2 unless separately approved.

---

## Deferred accounting/ledger boundaries (must remain explicit)

The following are strict deferments and must not be introduced in Phase 11.1 or 11.2:

- Ledger/journal posting logic.
- Accounting statements with accounting-grade claims.
- Owner accounting statements and owner financial allocations.
- Tenant billing expansions beyond current bounded flows.
- Vendor payable/payment lifecycle systemization.
- Automatic propagation from maintenance or operational expense events into accounting books.

---

## Recommended Phase 11 implementation path

### PR 11.1 (this PR)

- Docs-only commercial readiness audit and implementation plan.
- Confirm completed-phase boundaries and realistic beta posture.
- Lock safe non-goals before touching runtime UX.

### PR 11.2 (small, low-risk polish)

- Copy and UX consistency pass only on existing routed pages.
- Normalize empty states, loading/error messages, label clarity, and confirmations.
- Improve readability/navigation affordances where routing already exists.
- No new core workflows, no data model changes, no financial behavior changes.

### Optional follow-up after 11.2

- Phase 11.3 (if needed): additional tiny UX consistency fixes discovered during QA, still non-financial and non-schema.

---

## Explicit non-goals

Phase 11.1 explicitly does **not** do any of the following:

- Runtime app code changes.
- Schema or migration changes.
- RLS changes.
- Financial workflow mutations.
- Accounting/ledger logic.
- New creation workflows for contracts/invoices/payments/receipts/expenses.
- Owner statement, tenant billing, or vendor workflow delivery.
- Legacy source import/wiring recovery.

---

## Proposed PR 11.2 scope (smallest safe scope)

1. **Empty-state pass**
   - Ensure each major routed area has clear zero-data and no-results copy.
2. **Loading/error pass**
   - Standardize readable, actionable error messages and loading hints.
3. **Label/helper-text pass**
   - Clarify operational vs deferred accounting context in financial/reporting UI.
4. **Confirmation copy pass**
   - Align destructive/sensitive action confirmations and caution language.
5. **Minor navigation/readability tweaks**
   - Improve section headings, spacing cues, and “next action” hints without adding features.

Out of PR 11.2 scope:
- Any new workflow, mutation behavior, schema/RLS/migration, or accounting functionality.

---

## What is out of scope for small commercial beta

- Full accounting backend and audited statements.
- Owner/tenant/vendor financial ecosystems.
- Broad automation across financial lifecycle events.
- Enterprise-grade role/approval orchestration beyond current bounded model.

Beta promise should be framed as: **operational property management + bounded financial operations visibility**, not full accounting ERP.

---

## Validation checklist

Use this checklist before merging Phase 11 PR 11.1 and as guardrails for PR 11.2:

- [x] Phase 10 completion report prerequisite confirmed present.
- [x] Phase 11.1 is docs-only.
- [x] No runtime code changes.
- [x] No financial behavior changes.
- [x] No schema, migration, or RLS changes.
- [x] No imports from `legacy-src`.
- [x] No `useApp`, `AppContext`, `dataService`, local DB patterns, or `react-router-dom` usage introduced.
- [x] Commercial readiness messaging remains honest (beta-usable operationally, accounting deferred).
- [x] PR 11.2 scope remains small, low-risk, and polish-only.
