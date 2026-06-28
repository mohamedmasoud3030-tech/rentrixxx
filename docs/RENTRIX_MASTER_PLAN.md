# Rentrix Master Execution Plan

This is the official execution roadmap for Rentrix.

It defines the approved phase order, release gates, and contradiction-handling rules. It must stay aligned with the canonical product blueprint in `docs/FINAL_PRODUCT_BLUEPRINT.md` and the runtime snapshot in `docs/RUNTIME_TRUTH_AND_GAPS.md`.

---

## 1. Source-of-Truth Discipline

Use this hierarchy explicitly:

1. Local Domain Contract & Mock State (for Phases 1 to 7).
2. Verified live Supabase metadata, timestamped and treated as runtime truth (postponed for live integration until Phase 8).
3. Current remote `main` code.
4. Generated TypeScript database contract.
5. Older product documents, previous audits, and agent reports.

When sources conflict, do not invent a resolution. Record the contradiction and assign its resolution to the owning future phase.

---

## 2. Official Roadmap (Revised for Postponed Supabase Integration)

The owner has decided to postpone all Supabase database integration, migrations, schema updates, RPCs, RLS, auth, and generated types to **Phase 8**. This allows rapid and pure frontend domain prototyping, calculation verification, and complete RTL/mobile UX polish in Phases 1-7 using a robust local/mock data layer.

### Revised Phase Order:

- **Phase 0** — Runtime truth audit and contradiction discovery: **completed**.
- **Phase 1** — Domain Foundation: **current**.
- **Phase 2** — Mock/Local Data Layer.
- **Phase 3** — Owner, Agreement, Property, and Unit Workflows.
- **Phase 4** — Tenant and Contract Lifecycle.
- **Phase 5** — Financial Workflows (Invoices, Receipts, Expenses, Settlements, Profitability).
- **Phase 6** — Roles and Audit Behavior.
- **Phase 7** — Reports, Print/Export, Tests, and CI.
- **Phase 8** — Supabase Integration (Schema, Migrations, RPCs, RLS, Auth, Generated Types, Live Data).

---

## 3. Gates

- **Gate 1:** Domain contracts and schemas frozen locally (Phase 1).
- **Gate 2:** Mock data layer with local storage/in-memory state complete and reactive (Phase 2).
- **Gate 3:** Owner to unit onboarding workflows functional (Phase 3).
- **Gate 4:** Tenant and contract lifecycle with validation and overlap-prevention complete (Phase 4).
- **Gate 5:** Financial calculations, invoicing, expensing, and owner settlements verified (Phase 5).
- **Gate 6:** Role-based access control and local audit logging active (Phase 6).
- **Gate 7:** Complete list/detail export, physical/mobile printing, and unit/integration test coverage green (Phase 7).
- **Gate 8:** Production-ready live data sync with Supabase and secure RLS policies (Phase 8).

A later phase must not claim completion if its predecessor gate is still unresolved.

---

## 4. Phase Ownership Summary

### Phase 0 — completed

Delivered outcome:
- Runtime truth was inspected and contradictions were surfaced.

Evidence now belongs in:
- `docs/RUNTIME_TRUTH_AND_GAPS.md`
- `docs/ai/CURRENT_EXECUTION_CONTEXT.md`

### Phase 1 — Domain Foundation (Current)

Objective:
- Establish clean, strict TypeScript types, validation rules, and domain entities representing the core operational flow.
- Ensure proper Arabic-first semantics are embedded into domain model dictionaries and metadata.
- Prevent dependancy on database schemas by modeling the pure business rules (contracts, agreements, properties, invoices).

Details in `docs/PHASE_1_7_EXECUTION_PLAN.md`.

### Phase 2 — Mock/Local Data Layer (Future)

Objective:
- Build a robust, in-memory/localStorage-backed mock repository and services layer.
- Ensure realistic state management, cascade delete simulation, relational integrity checks, and network latency/error simulation.
- Expose React hooks and context-based services that abstract database operations, making the future transition to Supabase seamless.

Details in `docs/PHASE_1_7_EXECUTION_PLAN.md`.

### Phase 3 — Owner, Agreement, Property, and Unit Workflows (Future)

Objective:
- Build the full Arabized, mobile-first user interfaces and workflows for registration of owners and active agreements.
- Support both operating models: `property_management` and `master_lease`.
- Build property and unit onboarding, linking units and properties dynamically to active covering agreements.

Details in `docs/PHASE_1_7_EXECUTION_PLAN.md`.

### Phase 4 — Tenant and Contract Lifecycle (Future)

Objective:
- Create tenant onboarding workflows and the full lease contract lifecycle (create, update, renew, terminate).
- Enforce business invariants locally: dates within agreement boundaries, zero-overlap on units, unit vacancy checks, and role approvals.

Details in `docs/PHASE_1_7_EXECUTION_PLAN.md`.

### Phase 5 — Financial Workflows (Future)

Objective:
- Build the core rent and service financial calculations engine.
- Generate contract invoices dynamically; record payments and generate detailed receipts.
- Track unit/property expenses and assign expense responsibility (office vs owner).
- Implement owner settlements engine (`property_management` vs `master_lease` models) and calculate office-level profitability.

Details in `docs/PHASE_1_7_EXECUTION_PLAN.md`.

### Phase 6 — Roles and Audit Behavior (Future)

Objective:
- Apply client role permissions (`ADMIN`, `MANAGER`, `USER`) dynamically on UI elements.
- Log local operational mutations to an in-memory/localStorage audit log database.
- Enforce MANAGER/ADMIN approval workflows for sensitive actions (reversals, contract terminations, settlement releases).

Details in `docs/PHASE_1_7_EXECUTION_PLAN.md`.

### Phase 7 — Reports, Print/Export, Tests, and CI (Future)

Objective:
- Implement comprehensive collections, arrears, occupancy, statements, and profitability reports.
- Create print-optimized templates for physical/mobile devices and file exporters (CSV, PDF).
- Deliver 100% green test coverage on calculations and workflows; establish CI pipeline validation.

Details in `docs/PHASE_1_7_EXECUTION_PLAN.md`.

### Phase 8 — Supabase Integration (Future)

Objective:
- Migrate the local/mock-backed repository to live Supabase backend.
- Set up real database schema, migrations, security RLS, RPCs, Auth, and automatic TypeScript type-generation.
- Verify production-readiness criteria.

---

## 5. Product Boundaries for Execution

The roadmap assumes these product decisions are already approved:
- Rentrix remains single-office, Arabic-first, mobile-first.
- Owner settlement and office profitability are in target product scope.
- Rentrix is not a legal-title registry, marketplace, multi-tenant SaaS platform, valuation system, or general ledger.
- The current live role enum remains `ADMIN`, `MANAGER`, `USER` until an implemented change says otherwise.

What remains out of scope unless separately approved:
- Legal-title registry behavior.
- Marketplace behavior.
- Sale/purchase valuation systems.
- Shared-database SaaS multi-tenancy.
- Broad general-ledger accounting.
- Tax-finality or statutory-accounting claims.
- External communication sending.

---

## 6. Working Rule When Contradictions Appear

When a document, code path, generated type, migration, or live metadata conflicts with another source:

1. Identify the higher-authority source (Domain/Mock layer takes precedence during Phases 1-7).
2. Record the contradiction clearly.
3. Do not pretend the conflict is already resolved.
4. Assign the fix to the owning phase (Phase 8 for database/Supabase-specific contradictions; Phase 1-7 for domain/UX contradictions).

---

## 7. Execution Rule for Future PRs

Future implementation PRs should follow the roadmap order unless a narrow technical repair is required to unblock the current phase.

Documentation-only work must not modify:
- Application code.
- Generated TypeScript types.
- Migrations.
- Supabase SQL/functions/RLS/grants/live data.
- Tests.
- CI workflows.
- Dependencies.
- Configuration.
- Product behavior.

---

## 8. Final Delivery and Production-Readiness Truth

Production readiness is established at the end of Phase 8 once the live Supabase database sync is verified.

Final delivery evidence remains tracked in `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`.

Do not claim Production GO until the following evidence is verified:
- B-1: Authenticated ADMIN browser QA.
- B-2: Live invoice -> payment -> receipt -> invoice/report refresh.
- B-3: Mobile or physical-device print QA, or an explicit `UNVERIFIED` record.
- B-4: Allowed live writes and RLS/permission behavior.

---

## 9. Relationship to Other Documents

- `docs/FINAL_PRODUCT_BLUEPRINT.md` defines the target product.
- `docs/RUNTIME_TRUTH_AND_GAPS.md` defines observed runtime truth and known gaps.
- `docs/PHASE_1_7_EXECUTION_PLAN.md` provides the detailed development specifications and TODO list for the local-first phases.
- `docs/ai/CURRENT_EXECUTION_CONTEXT.md` tracks the exact current branch/base/phase state.
- `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md` tracks final delivery evidence.
- `docs/ai/ONBOARDING.md` remains the active application snapshot and reading sequence.
- `docs/ai/REPORTING_DEFINITIONS.md` remains the reporting-definition reference.
- `docs/ai/GIT_TOOLING_POLICY.md` remains the git/branch/PR workflow reference.
- `docs/ai/domain-rules.md`, `docs/ai/engineering-policy.md`, `docs/ai/security-policy.md`, `docs/ai/release-policy.md`, and `docs/ai/testing-guide.md` remain active policy references.
