# Rentrix Quick Status

**Fast summary for new agents. Not authoritative — see `docs/FINAL_PRODUCT_BLUEPRINT.md`, `docs/RENTRIX_MASTER_PLAN.md`, and `docs/ai/CURRENT_EXECUTION_CONTEXT.md` for the real story.**

---

## What is Rentrix?

- **Arabic-first** property operations system for single real-estate offices
- **Core flow:** Property → Unit → Contract → Tenant → Invoice → Payment → Receipt
- **Single office only** — no SaaS, no multi-tenancy, no shared databases
- **Status:** Phase 6 complete (Roles, simulated RBAC, Approvals & Audit Log); Phase 7 next; production BLOCKED on live QA

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
| **Phase 6 — Roles and Audit Behavior** | ✅ Complete |
| **Phase 7 — Reports, Tests, CI** | 🔜 Next |
| **Phase 8 — Supabase Integration** | ⏸️ Deferred — owner decision |
| **Production Ready?** | ❌ BLOCKED — live QA evidence (B-1/B-2/B-3/B-4) not collected |
| **Latest merged** | Phase 6 completion (Roles & Audit Behavior) |
| **Repo baseline** | typecheck ✅ · 55 test files ✅ · build ✅ (2026-06-29) |
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
```

**Important:** Most existing features still use Supabase directly. Phases 3, 4, 5, and 6 use the full mock path. Phase 7 should follow the mock pattern.

---

## What's Done

### Phase 6 (Roles, simulated RBAC, Approvals & Audit Log)
- ✅ Role Simulator (`mock-role-simulator.ts` & `role-simulator-section.tsx`) embedded in Settings & Governance
- ✅ Client-side RBAC restriction screen for `USER` role
- ✅ Pending Manager Approvals Queue (`mock-approvals.ts`) holding sensitive actions (contract termination)
- ✅ Frontend Audit Logger (`auditRepo`) recording immutable action history

### Phase 5 (Financial Workflows & Settlements Engine — PR #1028)
- ✅ Invoices Hub, Receipts Hub with printable mobile-first RTL receipt, Expenses Hub, Owner Settlement Engine

### Phase 4 (Tenant & Contract Lifecycle — PR #1027)
- ✅ Tenant Hub, Contract Hub

---

## Next Work

1. **Phase 7** — Operational Reports Dashboard, CSV/PDF Exporters, CI validation
2. **Live QA** — B-1/B-2/B-3/B-4 evidence

---

**Last updated:** 2026-06-29 | **Status:** Phase 6 complete; Phase 7 next; production BLOCKED
