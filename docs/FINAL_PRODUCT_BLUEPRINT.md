# Rentrix Final Product Blueprint

This is the canonical product and business blueprint for Rentrix.

It defines the approved target product shape, business boundaries, lifecycle, financial intent, reporting intent, and implementation boundaries. It does **not** claim that every approved capability is already implemented.

If this file conflicts with:

- verified live Supabase metadata,
- current remote `main` code and migration history,
- generated TypeScript database contract, or
- older reports and prior product notes,

follow the source-of-truth hierarchy documented in `docs/RUNTIME_TRUTH_AND_GAPS.md`.

Execution roadmap authority remains `docs/RENTRIX_MASTER_PLAN.md`.
Current execution state remains `docs/ai/CURRENT_EXECUTION_CONTEXT.md`.

---

## 1. Product North Star

Rentrix is a **single-office, Arabic-first, mobile-first property operations system**.

It is designed for a real-estate office that needs one coherent operational system for managing owners, operating agreements, properties, units, tenants, lease contracts, invoices, receipts, expenses, owner settlements, and office-level reporting.

Rentrix is **not**:

- a legal-title registry;
- a property marketplace;
- a multi-tenant SaaS platform;
- a sale/purchase valuation system; or
- a general ledger.

English/LTR support remains important, but Arabic/RTL is the lead product experience.

---

## 2. Canonical Business Lifecycle

The approved target lifecycle is:

```text
Office + Owner + Property Operating Agreement -> Property -> Unit -> Tenant -> Lease Contract -> Invoice -> Payment/Receipt -> Expense -> Owner Settlement -> Reports / Office Profitability
```

This is the target business lifecycle.

### 2.1 Target product decision vs currently implemented

- **Target product decision:** owner settlement and office profitability are part of the Rentrix product scope.
- **Currently implemented reality:** the repository and live runtime still have gaps, contradictions, and partial financial modeling. Phase 2 and later phases must reconcile and implement those gaps safely.

Older documentation that described owner settlement, owner payout, or profitability as permanently out of scope or awaiting a decision is **superseded** by this approved Phase 1 product decision. Historical references should be kept as historical, not treated as current authority.

---

## 3. Core Product Model

### 3.1 Office model

- Rentrix is for **one operating office**.
- The office is the operating actor across agreements, contracts, invoicing, collections, expenses, settlements, and reporting.
- Multi-office or organization-scoped SaaS behavior is outside the product boundary.

### 3.2 Owner and property operating model

Approved product rules:

- A property has **one operational owner at a time**.
- The office-owner relationship is **time-bound** and must be historically retained through **owner agreements**.
- Operational ownership history matters even when the legal-title history is outside Rentrix scope.

### 3.3 Two operating models

Rentrix must support two operating models:

1. `property_management`
   - Rent belongs to the owner in principle.
   - The office earns an agreed fee, commission, or combined compensation according to the agreement.

2. `master_lease`
   - The office pays the owner an agreed obligation.
   - The office earns sublease or operating revenue under that agreement model.

### 3.4 Agreement terms as a target product requirement

Agreement terms must eventually support:

- fixed fee terms;
- rate-based terms;
- combined fixed + rate terms;
- invoiced-versus-collected calculation basis;
- expense responsibility allocation;
- settlement cadence;
- amendments;
- renewal;
- audit history.

These are approved product decisions.

They are **not yet fully implemented** and must not be documented as complete runtime behavior until later phases deliver and verify them.

---

## 4. Operational Lifecycle Rules

### 4.1 Contract linkage rules

Lease contracts must be tied to:

- a tenant,
- a unit,
- a property, and
- a covering owner agreement.

### 4.2 Lifecycle safety rules

Contract create, update, renewal, and termination must eventually enforce:

- agreement coverage;
- property consistency;
- unit consistency;
- date validity;
- overlap prevention; and
- permission rules.

### 4.3 Financial safety rules

Money and obligation changes must be auditable.

Sensitive changes require reversal, cancellation, or equivalent explicit corrective paths rather than silent overwrite.

### 4.4 Sensitive approvals

Manager approval is required for sensitive actions such as:

- agreement-term changes,
- contract cancellation,
- payment reversal,
- settlement approval, and
- sensitive expense approval.

### 4.5 Current role reality

The current live role enum remains:

```text
ADMIN
MANAGER
USER
```

Documentation must not rename those roles as if a role redesign has already shipped.

---

## 5. Financial Scope

### 5.1 Included product finance scope

Rentrix includes operational finance around:

- invoices;
- payments and receipts;
- arrears;
- expenses;
- owner statements;
- owner settlement statements; and
- office profitability reporting.

### 5.2 What this means

This means the target product must eventually be able to explain:

- what was invoiced;
- what was collected;
- what expenses apply;
- what belongs to the owner under the active agreement model;
- what belongs to the office; and
- how those numbers are presented in statements and profitability views.

### 5.3 What this does not mean

This does **not** make Rentrix:

- a general ledger,
- an accounting-standards reporting suite,
- a balance sheet system,
- a tax finality system, or
- a legal or statutory financial reporting platform.

### 5.4 Current implementation boundary

Current live/runtime notes from the verified 2026-06-28 snapshot:

- legacy `owner_settlements` exists live but is not sufficient for the target settlement model;
- current agreement terms support `FIXED_MONTHLY` and `RATE`;
- calculation basis, mixed terms, expense responsibility, target settlement engine, and profitability model remain gaps.

Those gaps are implementation and schema-reconciliation work, not product indecision.

---

## 6. Reporting Scope

Required future reporting includes:

- collections;
- arrears;
- invoices;
- expenses;
- occupancy;
- contract lifecycle;
- property statement;
- owner statement;
- owner settlement statement;
- office profitability;
- cash flow;
- maintenance/vendor follow-up; and
- employee operational follow-up.

These reports belong to the target product scope even where current implementation is partial.

---

## 7. Page and Workflow Intent

The office should be able to move through the lifecycle with minimal ambiguity:

1. register an owner relationship through an operating agreement;
2. register the property and its units;
3. register the tenant;
4. create and manage the lease contract with agreement coverage;
5. invoice correctly;
6. record payments and generate receipts;
7. record expenses with accountability;
8. prepare owner settlement outputs;
9. review profitability and operational reports.

The product should feel like an office operating system, not a generic dashboard.

---

## 8. Non-goals and Exclusions

Rentrix remains out of scope for:

- legal-title registration;
- public marketplace behavior;
- sale/purchase valuation workflows;
- shared-database SaaS multi-tenancy;
- organization/membership/subscription product architecture;
- broad general-ledger accounting;
- accounting-grade P&L, balance-sheet, GAAP, IFRS, or tax-finality claims;
- external communication sending unless separately approved.

### Historical supersession note

Previous wording such as "owner settlement/payout is out of scope" or "owner profitability awaits a product decision" is obsolete. The current product decision includes settlement and profitability in scope as target capabilities, while implementation remains phased.

---

## 9. Runtime Truth and Implementation Boundaries

This blueprint is a product-definition document, not a runtime-schema guarantee.

For runtime truth as observed on 2026-06-28, see `docs/RUNTIME_TRUTH_AND_GAPS.md`.

Important implementation-boundary examples:

- live schema, repository migrations, generated types, and code contract are known to contain contradictions;
- contract creation has stronger agreement validation than contract update and renewal;
- the current live settlement model is incomplete relative to the approved target product.

Those contradictions belong to future execution phases; they should not be hidden by product-language simplification.

---

## 10. Product Success Standard

Rentrix v1.0 is successful when a single office can safely run the operational lifecycle, produce trustworthy statements and reports, and understand owner-versus-office obligations without Rentrix pretending to be a legal-title system or a general ledger.

---

## 11. Relationship to Other Documents

- `docs/FINAL_PRODUCT_BLUEPRINT.md` — canonical product/business blueprint.
- `docs/RENTRIX_MASTER_PLAN.md` — official execution roadmap and gates.
- `docs/RUNTIME_TRUTH_AND_GAPS.md` — source-of-truth hierarchy, observed runtime snapshot, contradictions, and gap ownership.
- `docs/ai/CURRENT_EXECUTION_CONTEXT.md` — current branch/base/phase execution state.

If product shape and runtime reality appear to disagree, record the contradiction instead of inventing alignment.
