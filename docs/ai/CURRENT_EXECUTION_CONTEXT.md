# Current Execution Context

## Current base reference

- Remote base branch: `origin/main`
- Current remote `main` SHA for this Phase 1 branch base: `7a8a7dc157fbfcdb69c3d90ad482042e7ec9ea30`

## Current program state

- Phase 0 — Runtime truth audit and contradiction discovery: **complete**
- Phase 1 — Domain Foundation: **current** (reorganized for the Postponed Supabase plan)
- Phase 2 — Mock/Local Data Layer: **planned**
- Phase 3 — Owner, Agreement, Property, and Unit Workflows: **planned**
- Phase 4 — Tenant and Contract Lifecycle: **planned**
- Phase 5 — Financial Workflows: **planned**
- Phase 6 — Roles and Audit Behavior: **planned**
- Phase 7 — Reports, Print/Export, Tests, and CI: **planned**
- Phase 8 — Supabase Integration (Schema, Migrations, RPCs, RLS, Auth, Generated Types): **postponed**

## Postponed Supabase Strategy

By owner decision, Supabase and database-specific assets are completely postponed to Phase 8.
- Codebase development in Phases 1-7 will rely purely on a clean domain-driven model and local in-memory/localStorage mock repository layer.
- Components will interact with high-level services and hooks rather than direct client-side Supabase queries, facilitating an easy schema/live binding in Phase 8.

## Current authority set

Read together:

1. `docs/FINAL_PRODUCT_BLUEPRINT.md`
2. `docs/RENTRIX_MASTER_PLAN.md` (Updated: Supabase postponed to Phase 8)
3. `docs/PHASE_1_7_EXECUTION_PLAN.md` (Detailed Phase 1-7 Roadmap & TODO List)
4. `docs/RUNTIME_TRUTH_AND_GAPS.md`
5. `docs/ai/CURRENT_EXECUTION_CONTEXT.md`

Use the documented source-of-truth hierarchy:

1. Pure TypeScript Domain Contracts & Mock Models (for Phases 1-7);
2. Verified live Supabase metadata (for Phase 8 reference);
3. Current remote `main` code;
4. Generated TypeScript database contract;
5. Older product documents, previous audits, and agent reports.

## Phase 1 objective status

Phase 1 (Domain Foundation) is current. Its objective is to freeze typescript domain schemas, types, validation invariants, and Arabic dictionary keys, decoupling the core application logic from the underlying storage.

## Required next-phase reconciliation focus

Phase 2 will implement the complete mock/local data layer backend, providing in-memory and localStorage persistence to simulate full relational reads/writes and transaction lifecycles locally.

## Product decision baseline

Approved product decisions include:
- Single-office, Arabic-first, mobile-first scope;
- Owner settlement and office profitability as target product capabilities;
- One operational owner per property at a time;
- Time-bound owner agreements with history retention;
- Two operating models: `property_management` and `master_lease`;
- Manager approval for sensitive actions;
- Current live role enum remains `ADMIN`, `MANAGER`, `USER`.

These are approved target decisions, implemented locally in Phases 1-7 and synced live in Phase 8.

## Phase 1 constraint record

Phase 1 is a planning and documentation task. No application code, database schema, migrations, or local variables are edited. No direct Supabase resources are modified.

## Handoff rule

If future work uncovers a contradiction, record it in the runtime-truth path and assign it to the owning phase instead of guessing a silent resolution.

## Final delivery and production-readiness truth

Production readiness is established at the end of Phase 8 once live Supabase database sync is verified.

Final delivery evidence remains tracked in `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`.

Do not claim Production GO until the following evidence is verified:
- B-1: Authenticated ADMIN browser QA;
- B-2: Live invoice -> payment -> receipt -> invoice/report refresh;
- B-3: Mobile or physical-device print QA, or an explicit `UNVERIFIED` record;
- B-4: Allowed live writes and RLS/permission behavior.

## Still-relevant active guidance

Continue to use these active references alongside the source-of-truth set:
- `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`
- `docs/ai/ONBOARDING.md`
- `docs/ai/REPORTING_DEFINITIONS.md`
- `docs/ai/GIT_TOOLING_POLICY.md`
- `docs/ai/domain-rules.md`
- `docs/ai/engineering-policy.md`
- `docs/ai/security-policy.md`
- `docs/ai/release-policy.md`
- `docs/ai/testing-guide.md`
