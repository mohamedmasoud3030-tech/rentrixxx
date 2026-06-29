# Rentrix Quick Status

**Fast summary for new agents. Not authoritative — see `docs/FINAL_PRODUCT_BLUEPRINT.md`, `docs/RENTRIX_MASTER_PLAN.md`, and `docs/ai/CURRENT_EXECUTION_CONTEXT.md` for the real story.**

---

## What is Rentrix?

- **Arabic-first** property operations system for single real-estate offices
- **Core flow:** Property → Unit → Contract → Tenant → Invoice → Payment → Receipt
- **Single office only** — no SaaS, no multi-tenancy, no shared databases
- **Status:** Phase 4 complete (Tenant & Contract Lifecycle); Phase 5 next; production BLOCKED on live QA

---

## Current State (2026-06-29)

**For authoritative status, see `docs/ai/CURRENT_EXECUTION_CONTEXT.md`.**

| Item | Status |
|------|--------|
| **Phase 1 — Domain Foundation** | ✅ Complete (PR #1013) |
| **Phase 2 — Local Data Layer** | ✅ Complete (PR #1021) |
| **Phase 3 — Owner Hub** | ✅ Complete (PRs #1022–#1024) |
| **Phase 3.5 — EntityCard (ADR-008 Phase B)** | ✅ Complete (PR #1025) |
| **Phase 4 — Tenant & Contract Lifecycle** | ✅ Complete |
| **Phase 5 — Financial Workflows** | 🔜 Next |
| **Phases 6–7** | 📋 Planned |
| **Phase 8 — Supabase Integration** | ⏸️ Deferred — owner decision |
| **Production Ready?** | ❌ BLOCKED — live QA evidence (B-1/B-2/B-3/B-4) not collected |
| **Latest merged** | Phase 4 completion (Tenant & Contract Lifecycle) |
| **Repo baseline** | typecheck ✅ · 53 test files ✅ · build ✅ (2026-06-29) |
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
```

**Important:** Most existing features still use Supabase directly. `phase3-owner-hub.tsx`, `phase4-tenant-hub.tsx`, and `phase4-contract-hub.tsx` use the full mock path. Phase 5 should follow the mock pattern.

---

## What's Done

### Phase 4 (Tenant & Contract Lifecycle)
- ✅ Tenant Hub (`phase4-tenant-hub.tsx`) with CRUD & archival check
- ✅ Contract Hub (`phase4-contract-hub.tsx`) with creation wizard, unit vacancy reservation, agreement coverage check
- ✅ Contract renewal & termination workflows in `contract-repo.ts`

### Phase 3 (Owner Hub — PRs #1022–#1025)
- ✅ Arabic Owner Hub with tab layout
- ✅ Owner Agreement Form (add/edit)
- ✅ Property Onboarding Form
- ✅ Mock repos expanded (agreement, invoice, receipt, expense, tenant repos)
- ✅ EntityCard unified component (PR #1025)
- ✅ PersonCard + OwnerCard deleted and replaced by EntityCard

### Phase 2 (Local Data — PR #1021)
- ✅ `store/mock-db-store.ts` — Zustand + localStorage persist + seed data
- ✅ `services/mock-repos/` — base repo + owner/property/unit/tenant/contract repos
- ✅ `hooks/use-mock-repositories.ts` — useQuery-like hooks

### Phase 1 (Domain Foundation — PR #1013)
- ✅ `domain/types.ts` — Pure TS interfaces
- ✅ `domain/validators.ts` — Zod schemas
- ✅ `domain/i18n.ts` — Arabic keys

---

## Next Work

See `docs/ai/CURRENT_EXECUTION_CONTEXT.md` for current next PR order.

1. **Phase 5** — Financial Workflows (Invoices, Payments, Receipts mock repos)
2. **Live QA** — B-1/B-2/B-3/B-4 evidence (requires human operator)
3. **v0.5 hardening** — operator runbooks, QA scripts, onboarding docs

---

## Where to Find Things

| What | Where |
|------|-------|
| **Authoritative roadmap** | `docs/RENTRIX_MASTER_PLAN.md` |
| **Product blueprint** | `docs/FINAL_PRODUCT_BLUEPRINT.md` |
| **Current execution** | `docs/ai/CURRENT_EXECUTION_CONTEXT.md` |
| **Code structure** | `docs/ROOT_LAYOUT.md` |
| **Agent rules** | `AGENTS.md` |
| **Current snapshot** | `docs/ai/ONBOARDING.md` |
| **Codebase audit** | `docs/ai/CODEBASE_AUDIT_2026-06-29.md` |
| **UI component guide** | `docs/ai/UI_COMPONENT_GUIDE.md` |
| **Git policy** | `docs/ai/GIT_TOOLING_POLICY.md` |
| **Decisions** | `docs/decisions/README.md` |
| **Archived docs** | `docs/archive/` |

---

## Key Constraints

- ✅ **DO:** Use `domain/types.ts` for mock layer; use `types/domain.ts` for Supabase features
- ✅ **DO:** Follow mobile-first, RTL, Arabic-first
- ✅ **DO:** Use mock repos pattern for Phase 4+ features
- ✅ **DO:** Use `EntityCard` for people/owner/tenant cards (not custom cards)
- ✅ **DO:** Use `EntityTable` for data tables
- ❌ **DON'T:** Mix `domain/types.ts` (pure) with `types/domain.ts` (Supabase)
- ❌ **DON'T:** Add Supabase calls in Phases 1–7
- ❌ **DON'T:** Store real sensitive data in localStorage mock store
- ❌ **DON'T:** Add general ledger or multi-tenancy
- ❌ **DON'T:** Reference `artifacts/rentrix/` — path does not exist

---

## Getting Started

1. Read `AGENTS.md` (agent rules)
2. Read `docs/ai/CURRENT_EXECUTION_CONTEXT.md` (what phase + what to do)
3. Read `docs/RENTRIX_MASTER_PLAN.md` (roadmap)
4. Read `docs/ai/ONBOARDING.md` (app state snapshot)
5. Start work from `main` branch

---

## Quick Commands

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
pnpm --filter ./rentrix-app run dev
pnpm --filter ./rentrix-app test
pnpm --filter ./rentrix-app run test:financials
```

---

## Production Status

🔴 **BLOCKED** — Awaiting:
- B-1: Browser QA evidence (RTL, mobile, receipt print)
- B-2: Payment → receipt E2E live
- B-3: PWA install/offline/update
- B-4: Manual acceptance by ops team

See `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md` for details.

---

**Last updated:** 2026-06-29 | **Status:** Phase 4 complete; Phase 5 next; production BLOCKED
