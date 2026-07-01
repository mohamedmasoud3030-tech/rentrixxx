# Rentrix Quick Status

**Fast summary for new agents. Not authoritative — see `docs/FINAL_PRODUCT_BLUEPRINT.md`, `docs/RENTRIX_MASTER_PLAN.md`, and `docs/ai/CURRENT_EXECUTION_CONTEXT.md` for the real story.**

---

## What is Rentrix?

- **Arabic-first** property operations system for single real-estate offices
- **Core flow:** Property → Unit → Contract → Tenant → Invoice → Payment → Receipt
- **Single office only** — no SaaS, no multi-tenancy, no shared databases
- **Status:** Phases 1–7 are complete in the local-first model. Five protected routes currently use existing Supabase-backed pages under a documented transition. Phase 8 remains deferred and production is BLOCKED on live QA.

---

## Current State (2026-07-01)

**For authoritative status, see `docs/ai/CURRENT_EXECUTION_CONTEXT.md`.**

| Item | Status |
|------|--------|
| **Phase 1 — Domain Foundation** | ✅ Complete (PR #1013) |
| **Phase 2 — Local Data Layer** | ✅ Complete (PR #1021) |
| **Phase 3 — Owner Hub** | ✅ Complete (PRs #1022–#1024) |
| **Phase 3.5 — EntityCard (ADR-008 Phase B)** | ✅ Complete (PR #1025) |
| **Phase 4 — Tenant & Contract Lifecycle** | ✅ Complete (PR #1027) |
| **Phase 5 — Financial Workflows** | ✅ Complete (PR #1028) |
| **Phase 6 — Roles and Audit Behavior** | ✅ Complete (PR #1029) |
| **Phase 7 — Reports, Tests, CI** | ✅ Complete (PR #1030) |
| **PR #1031 route transition** | ⚠️ Contracts, Financials, Invoices, Receipts, and Expenses now resolve to existing Supabase-backed pages; no Phase 8 authorization is implied |
| **Phase 8 — Supabase Integration** | ⏸️ Deferred — owner decision required before any scoped transition can be claimed |
| **Production Ready?** | ❌ BLOCKED — live QA evidence (B-1/B-2/B-3/B-4) not collected |
| **Latest merged** | PR #1031 — protected-route wiring and document HTML escaping |
| **Repo baseline** | Historical repo-only evidence is recorded in `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`; it is not live QA evidence |
| **Database** | Supabase `nnggcnpcuomwfuupupwg` — no production readiness claim |
| **Active branch** | `main` |

---

## Architecture: Current Transition State

```
[Mock Layer — Phases 1–7]            [Existing Supabase-backed pages]
domain/types.ts                       types/domain.ts (Supabase-mapped)
store/mock-db-store.ts (Zustand)      hooks/use-auth.tsx
services/mock-repos/                  features/*/xxxService.ts
hooks/use-mock-repositories.ts        selected active protected routes: contracts,
features/owners/phase3-owner-hub.tsx  financials, invoices, receipts, expenses
features/tenants/phase4-tenant-hub.tsx
features/contracts/phase4-contract-hub.tsx
features/financials/phase5-invoices-hub.tsx
features/financials/phase5-receipts-hub.tsx
features/financials/phase5-expenses-hub.tsx
features/financials/phase5-financials-hub.tsx
features/audit/phase6-audit-hub.tsx
features/reports/phase7-reports-hub.tsx
```

The mixed route state is documented in `docs/ai/PR_1031_ROUTE_TRANSITION_RECORD.md`. It is neither a completed Phase 8 implementation nor a Production GO signal.

---

## What's Done

### PR #1031 (route wiring and document security)
- ✅ Five protected route entry points now resolve to their existing Supabase-backed pages.
- ✅ User-controlled HTML embedded in print/preview documents is escaped.
- ✅ Deterministic database-connection error-state tests were added.

### Phase 7 (Operational Reports, Universal Exporters, Statements Engine & CI)
- ✅ Advanced Operational Reports Dashboard (`phase7-reports-hub.tsx`) with occupancy, collection rates, arrears aging
- ✅ Universal CSV Exporter (`buildCsv` & `withUtf8Bom`) for arrears and settlements
- ✅ Statements Print Engine (RTL print-preview for owner & tenant account statements)
- ✅ CI Pipeline verified running 56 Vitest suites (280+ tests) with zero failures at Phase 7 completion

### Phase 6 (Roles, simulated RBAC, Approvals & Audit Log — PR #1029)
- ✅ Role Simulator embedded in Settings & Governance
- ✅ Pending Approvals Queue & Frontend Audit Logger

### Phases 1–5
- ✅ Domain Types, Zustand Store, Mock Repos, Owner Hub, Tenant/Contract Lifecycle, Financial Workflows

---

## Next Work

1. **Owner data-layer decision** — choose whether to restore mock hubs as active routes or authorize a defined Phase 8 transition for the five routes in PR #1031.
2. **Live QA Acceptance** — B-1/B-2/B-3/B-4 E2E verification after the data-layer decision.
3. **Phase 8 Milestone** — only after explicit owner approval and scoped security/data-parity work.

---

**Last updated:** 2026-07-01 | **Status:** Phases 1–7 complete locally; mixed route transition documented; production BLOCKED on live QA
