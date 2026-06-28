# Rentrix Master Execution Plan

This is the official execution roadmap for Rentrix.

It defines the approved phase order, release gates, and contradiction-handling rules. It must stay aligned with the canonical product blueprint in `docs/FINAL_PRODUCT_BLUEPRINT.md` and the runtime snapshot in `docs/RUNTIME_TRUTH_AND_GAPS.md`.

---

## 1. Source-of-Truth Discipline

Use this hierarchy explicitly:

1. Verified live Supabase metadata, timestamped and treated as runtime truth.
2. Current remote `main` code and migration history.
3. Generated TypeScript database contract.
4. Older product documents, previous audits, and agent reports.

When sources conflict, do not invent a resolution. Record the contradiction and assign its resolution to the owning future phase.

---

## 2. Official Roadmap

Phase 0 — Runtime truth audit and contradiction discovery: **completed**.

Phase 1 — Documentation, decisions, and sources of truth: **completed** through merged PR #1010.

Phase 2 — Reconcile live schema, migrations, generated types, and code contract: **current**.

Phase 3 — Restore and verify a fully green `main`.

Phase 4 — Complete safe owner -> agreement -> property -> unit -> tenant -> contract lifecycle.

Phase 5 — Financial engine: agreement terms, expense responsibility, settlements, profitability.

Phase 6 — Governance: sensitive permissions, audit, reversal/cancellation controls.

Phase 7 — Reports, statements, print, export.

Phase 8 — Harden secondary modules: maintenance, documents, alerts, lands, leads, commissions, communication.

---

## 3. Gates

- **Gate 0:** source-of-truth and contradictions documented.
- **Gate 1:** `main` green.
- **Gate 2:** owner-to-contract lifecycle safe.
- **Gate 3:** financial model verifiable.
- **Gate 4:** permissions and audit controls.
- **Gate 5:** reports and statements.
- **Gate 6:** documentation and QA readiness.

A later phase must not claim completion if its predecessor gate is still unresolved.

---

## 4. Phase Ownership Summary

### Phase 0 — completed

Delivered outcome:

- runtime truth was inspected and contradictions were surfaced.

Evidence now belongs in:

- `docs/RUNTIME_TRUTH_AND_GAPS.md`
- `docs/ai/CURRENT_EXECUTION_CONTEXT.md`

### Phase 1 — completed

Completed outcome:

- repository documentation was made internally coherent for the approved Phase 1 scope;
- current product decisions were documented;
- the source-of-truth hierarchy was documented;
- conflicting historical statements were marked as superseded rather than silently erased.

Completed through merged PR #1010.

Artifacts:

- `README.md`
- `docs/FINAL_PRODUCT_BLUEPRINT.md`
- `docs/RENTRIX_MASTER_PLAN.md`
- `docs/RUNTIME_TRUTH_AND_GAPS.md`
- `docs/ai/CURRENT_EXECUTION_CONTEXT.md`

### Phase 2 — current

Objective:

- reconcile live schema, migrations, generated TypeScript types, and code contract.

Known examples owned by Phase 2:

- `properties.owner_id` drift and ownership modeling contradictions;
- RPC return typing drift, including live RPC contract mismatches;
- remaining live/repository/generated-type contract contradictions.

### Phase 3 — future

Objective:

- restore and verify a fully green `main` after contract reconciliation.

### Phase 4 — future

Objective:

- complete the safe owner -> agreement -> property -> unit -> tenant -> contract lifecycle.

Includes:

- agreement coverage enforcement;
- date and overlap safety;
- create/update/renew/terminate lifecycle consistency;
- permission enforcement for lifecycle-sensitive actions.

### Phase 5 — future

Objective:

- implement the financial engine for agreement terms, expense responsibility, owner settlements, and office profitability.

Includes:

- support for richer agreement terms;
- settlement cadence and statement logic;
- verifiable owner-versus-office calculations.

### Phase 6 — future

Objective:

- implement governance controls.

Includes:

- sensitive permission rules;
- auditability of money and obligation changes;
- reversal/cancellation paths instead of silent overwrite;
- manager approvals for sensitive actions.

### Phase 7 — future

Objective:

- complete reports, statements, print, and export surfaces.

Includes target outputs such as:

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
- maintenance/vendor follow-up;
- employee operational follow-up.

### Phase 8 — future

Objective:

- harden secondary modules after the core lifecycle and financial model are safe.

Includes:

- maintenance;
- documents;
- alerts;
- lands;
- leads;
- commissions;
- communication.

---

## 5. Product Boundaries for Execution

The roadmap assumes these product decisions are already approved:

- Rentrix remains single-office, Arabic-first, mobile-first.
- Owner settlement and office profitability are in target product scope.
- Rentrix is not a legal-title registry, marketplace, multi-tenant SaaS platform, valuation system, or general ledger.
- The current live role enum remains `ADMIN`, `MANAGER`, `USER` until an implemented change says otherwise.

What remains out of scope unless separately approved:

- legal-title registry behavior;
- marketplace behavior;
- sale/purchase valuation systems;
- shared-database SaaS multi-tenancy;
- broad general-ledger accounting;
- tax-finality or statutory-accounting claims;
- external communication sending.

### Historical supersession note

Older roadmap statements that described owner settlement, owner payout, or profitability as `OUT OF SCOPE`, `DEFERRED` due to permanent exclusion, or `NEEDS OWNER DECISION` are superseded by the current approved product decision. The correct current framing is: **in scope as target capability, not yet fully implemented**.

---

## 6. Working Rule When Contradictions Appear

When a document, code path, generated type, migration, or live metadata conflicts with another source:

1. identify the higher-authority source;
2. record the contradiction clearly;
3. do not pretend the conflict is already resolved;
4. assign the fix to the owning phase.

Typical ownership:

- schema/type/code drift -> Phase 2;
- lifecycle safety gaps -> Phase 4;
- settlement/profitability engine gaps -> Phase 5;
- sensitive permissions/audit/reversal gaps -> Phase 6;
- statements/reports/print/export gaps -> Phase 7.

---

## 7. Execution Rule for Future PRs

Future implementation PRs should follow the roadmap order unless a narrow technical repair is required to unblock the current phase.

Documentation-only work must not modify:

- application code,
- generated TypeScript types,
- migrations,
- Supabase SQL/functions/RLS/grants/live data,
- tests,
- CI workflows,
- dependencies,
- configuration,
- product behavior.

---

## 8. Final Delivery and Production-Readiness Truth

Production readiness is not established by Phase 1 documentation work.

Final delivery evidence remains tracked in `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`.

Do not claim Production GO until the following evidence is verified:

- B-1: authenticated ADMIN browser QA;
- B-2: live invoice -> payment -> receipt -> invoice/report refresh;
- B-3: mobile or physical-device print QA, or an explicit `UNVERIFIED` record;
- B-4: allowed live writes and RLS/permission behavior.

Phase 1 does not close, replace, or infer completion of these gates.

---

## 9. Relationship to Other Documents

- `docs/FINAL_PRODUCT_BLUEPRINT.md` defines the target product.
- `docs/RUNTIME_TRUTH_AND_GAPS.md` defines observed runtime truth and known gaps.
- `docs/ai/CURRENT_EXECUTION_CONTEXT.md` tracks the exact current branch/base/phase state.
- `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md` tracks final delivery evidence and current production-readiness status.
- `docs/ai/ONBOARDING.md` remains the active application snapshot and reading sequence.
- `docs/ai/REPORTING_DEFINITIONS.md` remains the reporting-definition reference.
- `docs/ai/GIT_TOOLING_POLICY.md` remains the git/branch/PR workflow reference.
- `docs/ai/domain-rules.md`, `docs/ai/engineering-policy.md`, `docs/ai/security-policy.md`, `docs/ai/release-policy.md`, and `docs/ai/testing-guide.md` remain active policy references.

If uncertainty remains after reading those documents, report the contradiction rather than guessing.
