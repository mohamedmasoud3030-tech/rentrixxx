# Rentrix Quick Status

**Fast summary for new agents. Not authoritative — see `docs/FINAL_PRODUCT_BLUEPRINT.md`, `docs/RENTRIX_MASTER_PLAN.md`, and `docs/ai/CURRENT_EXECUTION_CONTEXT.md` for the real story.**

---

## What is Rentrix?

- **Arabic-first** property operations system for single real-estate offices
- **Core flow:** Property → Unit → Contract → Tenant → Invoice → Payment → Receipt
- **Single office only** — no SaaS, no multi-tenancy, no shared databases
- **Status:** Phases 1–7 Complete (Local Data Layer & Mock Architecture verified); Phase 8 deferred; production BLOCKED on live QA

---

## Current State (2026-06-29)

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
| **Phase 7 — Reports, Tests, CI** | ✅ Complete |
| **Phase 8 — Supabase Integration** | ⏸️ Deferred — owner decision |
| **Production Ready?** | ❌ BLOCKED — live QA evidence (B-1/B-2/B-3/B-4) not collected |
| **Latest merged** | Phase 7 completion (Reports, Exporters & CI) |
| **Repo baseline** | typecheck ✅ · 56 test files ✅ · build ✅ (2026-06-29) |
| **Database** | Supabase `nnggcnpcuomwfuupupwg` (ap-southeast-1) — stable |
| **Active branch** | `main` |

---

## Architecture: Two Data Layers

```
[Mock Layer — Phases 1–7]            [Supabase Layer — Phase 8+]
domain/types.ts                       types/domain.ts (Supabase-mapped)
store/mock-db-store.ts (Zustand)      hooks/use-auth.tsx
services/mock-repos/                  features/*/xxxService.ts
hooks/use-mock-repositories.ts        → Only in existing features
features/owners/phase3-owner-hub.tsx
features/tenants/phase4-tenant-hub.tsx
features/contracts/phase4-contract-hub.tsx
features/financials/phase5-invoices-hub.tsx
features/financials/phase5-receipts-hub.tsx
features/financials/phase5-expenses-hub.tsx
features/financials/phase5-financials-hub.tsx
features/audit/phase6-audit-hub.tsx
features/reports/phase7-reports-hub.tsx
```

---

## What's Done

### Phase 7 (Operational Reports, Universal Exporters, Statements Engine & CI)
- ✅ Advanced Operational Reports Dashboard (`phase7-reports-hub.tsx`) with occupancy, collection rates, arrears aging
- ✅ Universal CSV Exporter (`buildCsv` & `withUtf8Bom`) for arrears and settlements
- ✅ Statements Print Engine (RTL print-preview for owner & tenant account statements)
- ✅ CI Pipeline verified running 56 Vitest suites (280+ tests) with zero failures

### Phase 6 (Roles, simulated RBAC, Approvals & Audit Log — PR #1029)
- ✅ Role Simulator embedded in Settings & Governance
- ✅ Pending Approvals Queue & Frontend Audit Logger

### Phases 1–5
- ✅ Domain Types, Zustand Store, Mock Repos, Owner Hub, Tenant/Contract Lifecycle, Financial Workflows

---

## Next Work

1. **Live QA Acceptance** — B-1/B-2/B-3/B-4 E2E verification
2. **Phase 8 Milestone** — Live Supabase Integration (deferred)

---

**Last updated:** 2026-06-29 | **Status:** Phases 1–7 Complete; production BLOCKED on live QA
