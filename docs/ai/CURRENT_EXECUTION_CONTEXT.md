# Current Execution Context

## Current base reference

- Remote base branch: `origin/main`
- Current remote `main` SHA for this Phase 1 branch base: `96473287d7c89ffaf89aa95fed3a20a8fcef1ded`

## Current program state

- Phase 0 — Runtime truth audit and contradiction discovery: **complete**
- Phase 1 — Documentation, decisions, and sources of truth: **in progress**
- Phase 2 — Reconcile live schema, migrations, generated types, and code contract: **next major implementation phase**

## Pre-Phase-1 technical repair note

- PR #1009 was merged as a technical repair preceding Phase 1.

## Current authority set

Read together:

1. `docs/FINAL_PRODUCT_BLUEPRINT.md`
2. `docs/RENTRIX_MASTER_PLAN.md`
3. `docs/RUNTIME_TRUTH_AND_GAPS.md`
4. `docs/ai/CURRENT_EXECUTION_CONTEXT.md`

Use the documented source-of-truth hierarchy:

1. verified live Supabase metadata;
2. current remote `main` code and migration history;
3. generated TypeScript database contract;
4. older product documents, previous audits, and agent reports.

## Phase 1 objective

Make repository documentation internally coherent before schema and implementation work resumes.

This means:

- current product decisions must be documented clearly;
- conflicting historical statements must be corrected or marked superseded;
- runtime truth and known contradictions must be recorded without pretending they are already reconciled.

## Required next-phase reconciliation focus

Phase 2 must reconcile at minimum:

- `properties.owner_id`;
- RPC return typing;
- remaining live/repository/generated-type contract drift.

## Product decision baseline

Approved product decisions now include:

- single-office, Arabic-first, mobile-first scope;
- owner settlement and office profitability as target product capabilities;
- one operational owner per property at a time;
- time-bound owner agreements with history retention;
- two operating models: `property_management` and `master_lease`;
- manager approval for sensitive actions;
- current live role enum remains `ADMIN`, `MANAGER`, `USER`.

These are approved target decisions, not a claim of complete implementation.

## Constraint for this phase

Phase 1 is documentation-only.

Do not modify:

- application code,
- generated TypeScript types,
- migrations,
- Supabase SQL/functions/RLS/grants/live data,
- tests,
- CI workflows,
- dependencies,
- configuration,
- product behavior.

## Handoff rule

If future work uncovers a contradiction, record it in the runtime-truth path and assign it to the owning phase instead of guessing a silent resolution.
