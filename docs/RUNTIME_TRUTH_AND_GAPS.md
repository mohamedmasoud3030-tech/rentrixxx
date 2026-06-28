# Runtime Truth and Gaps

This document is concise by design.

It records the current source-of-truth hierarchy, an observed runtime snapshot as of **2026-06-28**, known contradictions, current gaps, and which roadmap phase owns each unresolved area.

It is an observation record, not a permanent guarantee and not a migration plan.

---

## 1. Source-of-Truth Hierarchy

1. Verified live Supabase metadata, timestamped and treated as runtime truth.
2. Current remote `main` code and migration history.
3. Generated TypeScript database contract.
4. Older product documents, previous audits, and agent reports.

When these sources conflict, do not invent a resolution. Record the contradiction and assign it to the owning future phase.

---

## 2. Verified Runtime Snapshot Observed on 2026-06-28

Observed snapshot only:

- `properties.id` is `text`.
- `properties.owner_id` exists and is nullable `uuid`.
- `property_owners.property_id` is `text`.
- `owner_agreements.id` is `uuid`; `owner_agreements.property_id` is `text`.
- `contracts.agreement_id` is nullable `uuid`.
- `create_property_with_agreement` exists live and returns `jsonb`.
- `create_contract_atomic`, `renew_contract_atomic`, and `record_invoice_payment_atomic` exist live.
- Legacy `owner_settlements` exists live but is not sufficient for the target settlement model.
- Current agreement terms support `FIXED_MONTHLY` and `RATE`.
- Calculation basis, mixed terms, expense responsibility, target settlement engine, and profitability model remain gaps.
- Contract creation has stronger agreement validation than contract update and renewal.
- Lifecycle safety remains a later implementation phase.
- Repository migrations, generated types, and live schema have known contradictions that Phase 2 must reconcile.

---

## 3. Known Contradictions

| Contradiction | Current higher-authority reading | Owning phase |
| --- | --- | --- |
| `properties.owner_id` exists live while ownership is also modeled through agreements/history and older docs/repo assumptions may conflict | Treat live metadata as runtime truth; final ownership contract must be reconciled explicitly, not inferred | Phase 2 |
| Live RPC contract includes `create_property_with_agreement` returning `jsonb`, while repository/generated typing may drift | Treat observed live RPC metadata as runtime truth for the snapshot; reconcile repository/type contract later | Phase 2 |
| `contracts.agreement_id` is nullable live even though target product requires covering agreement logic | Treat current runtime as partial implementation, not target-state compliance | Phase 2 then Phase 4 |
| Contract create has stronger agreement validation than contract update/renewal | Current lifecycle enforcement is inconsistent | Phase 4 |
| Legacy `owner_settlements` exists live but is insufficient for approved settlement model | Settlement scope is approved, implementation is incomplete | Phase 5 |
| Older documentation says owner settlement/payout/profitability are out of scope or pending decision | Those statements are superseded by current product decisions | Phase 1 documentation reconciliation is in progress until PR #1010 is merged; implementation remains Phase 5 |

---

## 4. Current Gaps

| Gap | Note | Owning phase |
| --- | --- | --- |
| Live schema vs migrations vs generated types vs code contract drift | Reconciliation required before confident feature work resumes | Phase 2 |
| `properties.owner_id` and related ownership modeling drift | Must be reconciled with agreements/history model | Phase 2 |
| RPC return typing drift | Includes live/repository typing mismatch such as `create_property_with_agreement` | Phase 2 |
| Safe contract lifecycle enforcement | Create/update/renew/terminate must enforce agreement/property/unit/date/overlap/permission rules consistently | Phase 4 |
| Rich agreement terms | Fixed + rate combinations, calculation basis, expense responsibility, cadence, amendments, audit history | Phase 5 |
| Owner settlement engine | Existing legacy structure is insufficient | Phase 5 |
| Office profitability model | Approved target capability, not yet fully implemented | Phase 5 |
| Sensitive approvals, auditability, reversal/cancellation paths | Must become explicit and enforceable | Phase 6 |
| Statements/reports/print/export completeness | Includes owner and settlement statements plus profitability reporting | Phase 7 |
| Secondary module hardening | Maintenance, documents, alerts, lands, leads, commissions, communication | Phase 8 |

---

## 5. Reading Rule

Use this document to understand what is true now, what is contradictory, and which future phase owns the resolution.

Do not use it as a substitute for schema design, migration planning, or implementation specs.
