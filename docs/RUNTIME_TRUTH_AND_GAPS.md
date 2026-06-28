# Runtime Truth and Gaps (Revised)

This document is concise by design.

It records the current source-of-truth hierarchy under the postponed Supabase model, an observed runtime snapshot as of **2026-06-28**, known contradictions, current gaps, and which roadmap phase owns each unresolved area.

It is an observation record, not a permanent guarantee and not a migration plan.

---

## 1. Source-of-Truth Hierarchy

1. Verified live Supabase metadata, timestamped and treated as runtime truth for the database.
2. Pure TypeScript Domain Contracts & Mock Models (authoritative **only for frontend behavior** during Phases 1-7).
3. Current remote `main` code.
4. Generated TypeScript database contract.
5. Older product documents, previous audits, and agent reports.

When these sources conflict, do not invent a resolution. Record the contradiction and assign its resolution to the owning future phase.

---

## 2. Verified Runtime Snapshot Observed on 2026-06-28 (For Reference in Phase 8)

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
- Calculation basis, mixed terms, expense responsibility, target settlement engine, and profitability model remain gaps in code.
- Contract creation has stronger agreement validation than contract update and renewal.

---

## 3. Known Contradictions

| Contradiction | Current higher-authority reading | Owning phase |
| --- | --- | --- |
| `properties.owner_id` exists live while ownership is also modeled through agreements/history and older docs/repo assumptions may conflict | Treat live metadata as runtime truth for database; resolve UI and local flow via Owner → Property → Owner Agreement sequence, sync with DB in Phase 8 | Phase 3 (UI) & Phase 8 (DB) |
| Live RPC contract includes `create_property_with_agreement` returning `jsonb`, while repository/generated typing may drift | Reconcile repository/type contract when live Supabase integration is performed | Phase 8 |
| `contracts.agreement_id` is nullable live even though target product requires covering agreement logic | Enforce covering agreement validation strictly in frontend mock layer; reconcile nullable field in DB in Phase 8 | Phase 4 (UI) & Phase 8 (DB) |
| Contract create has stronger agreement validation than contract update/renewal | Enforce consistent contract lifecycle validations in the domain/mock layer | Phase 4 |
| Legacy `owner_settlements` exists live but is insufficient for approved settlement model | Implement full Arabic-first settlement calculations locally first, then sync DB schemas | Phase 5 (Mock) & Phase 8 (DB) |
| Older documentation says owner settlement/payout/profitability are out of scope or pending decision | Those statements are superseded by current product decisions | Phase 1 (completed); implementation is Phase 5 |

---

## 4. Current Gaps

| Gap | Note | Owning phase |
| --- | --- | --- |
| Live schema vs migrations vs generated types vs code contract drift | Postponed; full reconciliation and type mapping to live Supabase database | Phase 8 |
| `properties.owner_id` and related ownership modeling drift | Map database-level field to local sequence: Owner → Property → Owner Agreement | Phase 8 |
| RPC return typing drift | Reconcile live/repository custom database RPC types | Phase 8 |
| Safe contract lifecycle enforcement | Create/update/renew/terminate must enforce agreement/property/unit/date/overlap/permission rules consistently locally | Phase 4 |
| Rich agreement terms | Fixed + rate combinations, calculation basis, expense responsibility, cadence, amendments, audit history locally | Phase 5 |
| Owner settlement engine | Build core calculations and UI reporting locally without database dependency | Phase 5 |
| Office profitability model | Approved target capability, calculated locally | Phase 5 |
| Sensitive approvals, auditability, reversal/cancellation paths | Implement user-role gates and local state history audit log | Phase 6 |
| Statements/reports/print/export completeness | Includes owner and settlement statements plus profitability reporting on mock data | Phase 7 |
| Secondary module hardening | Maintenance, documents, alerts, lands, leads, commissions, communication | Phase 9 / Backlog |

---

## 5. Reading Rule

Use this document to understand what is true now, what is contradictory, and which future phase owns the resolution.

Do not use it as a substitute for schema design, migration planning, or implementation specs.
