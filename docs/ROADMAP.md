# Rentrix Development Roadmap

**Navigation guide to phase status. For authoritative roadmap, see `docs/RENTRIX_MASTER_PLAN.md`.**

Use with: [`docs/FINAL_PRODUCT_BLUEPRINT.md`](./FINAL_PRODUCT_BLUEPRINT.md) (product definition), [`docs/RENTRIX_MASTER_PLAN.md`](./RENTRIX_MASTER_PLAN.md) (execution roadmap), [`docs/ai/CURRENT_EXECUTION_CONTEXT.md`](./ai/CURRENT_EXECUTION_CONTEXT.md) (next work).

---

## Current Status

| Aspect | Status |
|--------|--------|
| **Active Phase** | v0.3 closure + Phase 2 Mobile UX (mid-phase) |
| **Production Ready** | ❌ BLOCKED — awaiting final B-1/B-2/B-3/B-4 QA evidence |
| **Latest Merge** | PR #927 (auth drawer polish) |
| **App Location** | `artifacts/rentrix/` |
| **Canonical DB** | Supabase project `nnggcnpcuomwfuupupwg` |

---

## Completed Phases

### ✅ **v0.1 — Core Financial Flows**
- Invoice → Receipt workflow
- Payment recording (ATOMIC RPC)
- Void receipt handling
- Financial RLS security model

### ✅ **v0.2 — Financial Audit & Polish**
- Money formatting audit + fix
- Receipt output and print support
- Expense module (basic read)
- Financials page audit

### ✅ **v0.3 — Navigation & System Polish**
- Page governance (hidden routes)
- Permission-based role claims
- System pages (Audit Log, Settings)
- Dashboard + KPI cards (mobile-ready foundation)

---

## Current Phase: **v0.3 Closure + Mobile UX Phase 2**

### Now (Mobile UX Phase 2 — In Progress)

| Item | Description | Status |
|------|-------------|--------|
| **ContractsListPage** | Card grid (mobile) + table (desktop) | ✅ PR #852 merged |
| **PeopleListPage** | PersonCard + responsive layout | ✅ PR #853 merged |
| **UnitsList** | UnitCard + responsive layout | ✅ PR #854 merged |
| **ReceiptsPage** | ReceiptCard + responsive layout | ✅ PR #855 merged |
| **OwnersPage** | OwnerCard + responsive layout | ✅ PR #856 merged |
| **Mobile Auth Drawer** | Locked rows + auth warning polish | ✅ PR #927 merged |

**Remaining (Phase 2):**
- ReportsPage (4 financial tables — complex, deferred)
- Detail pages (owner-detail-view, etc. — low priority)

### Next (After Mobile UX Phase 2)

#### **Phase 2.1 — Mobile Navigation & UX Refinement**
- Bottom navigation tab polish
- Touch targets audit
- RTL spacing final review
- Empty state visual consistency

#### **Phase 3 — Advanced Module Restorations** *(Deferred)*
- **Leads** module (contact pipelines)
- **Communications** (SMS, email templates)
- **Commissions** (agent earnings tracking)
- **AI Assistant** (document generation, smart suggestions)

**Why deferred:** Requires new database schemas (leads, communications, commissions tables). Out of scope for v0.3 delivery validation.

---

## Not Yet Started: **v0.4 — CRM & Relationship Modules**

Reserved for future scope expansion:
- Advanced contact relationship management
- Multi-owner deal structures
- Commission tracking and payroll
- Automated communication workflows

**Dependency:** v0.3 production sign-off + client requirements freeze.

---

## How to Use This Roadmap

### For Development Agents

1. **Phase Status**: Check the tables above to find current/next work
2. **Detailed Plan**: Read [`RENTRIX_MASTER_PLAN.md`](./RENTRIX_MASTER_PLAN.md) for full context
3. **First Client**: See [`FIRST_CLIENT_DELIVERY_PLAN.md`](./FIRST_CLIENT_DELIVERY_PLAN.md) for delivery scope
4. **Execution**: Start from [`docs/ai/CURRENT_EXECUTION_CONTEXT.md`](./ai/CURRENT_EXECUTION_CONTEXT.md)
5. **When Blocked**: Check [`docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`](./ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md)

### For Product Stakeholders

- **What's done?** → Look at ✅ marks in tables above
- **What's next?** → See "Next" section
- **When is launch?** → Blocked on QA evidence (see "Current Status")
- **What's out of scope?** → See v0.4 section

---

## Key Constraints

- **Single office only** — no multi-tenancy
- **Arabic-first** — English/LTR functional but secondary
- **No general ledger** — `/accounting` → `/financials` redirect
- **Auth model** — role claims in JWT app_metadata (fail-closed)
- **Mobile-first** → responsive, not native apps

---

## Document Map

| Document | Purpose |
|----------|---------|
| [`RENTRIX_MASTER_PLAN.md`](./RENTRIX_MASTER_PLAN.md) | Full baseline, all decisions, verification checklist |
| [`FIRST_CLIENT_DELIVERY_PLAN.md`](./FIRST_CLIENT_DELIVERY_PLAN.md) | Client delivery scope + acceptance criteria |
| [`ROOT_LAYOUT.md`](./ROOT_LAYOUT.md) | Code organization and file structure |
| [`ai/CURRENT_EXECUTION_CONTEXT.md`](./ai/CURRENT_EXECUTION_CONTEXT.md) | Agent startup — memory, scope, constraints |
| [`ai/ONBOARDING.md`](./ai/ONBOARDING.md) | First-time agent guide |
| [`ai/AGENT_CAPABILITIES.md`](./ai/AGENT_CAPABILITIES.md) | What agents can/cannot do |
| [`ai/GIT_TOOLING_POLICY.md`](./ai/GIT_TOOLING_POLICY.md) | Branch naming, PR conventions, merge strategy |
| [`ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`](./ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md) | Production sign-off blockers |
| [`decisions/`](./decisions/) | Architecture & design decisions |

---

## Quick Links

- **Latest PRs**: [GitHub PR list](https://github.com/mohamedmasoud3030-tech/rentrixxx/pulls)
- **Active branch**: `main` (production-ready code)
- **Feature branches**: `feat/`, `fix/`, `docs/` prefixes
- **Supabase project**: `nnggcnpcuomwfuupupwg` (RENTRIX EGY, ap-southeast-1)

---

**Last Updated:** June 18, 2026  
**Maintained by:** Development team + AI agents  
**Sync point:** After each major phase closure
