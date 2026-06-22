# Rentrix Development Roadmap

**Navigation guide to phase status. For authoritative roadmap, see `docs/RENTRIX_MASTER_PLAN.md`.**

Use with: [`docs/FINAL_PRODUCT_BLUEPRINT.md`](./FINAL_PRODUCT_BLUEPRINT.md) (product definition), [`docs/RENTRIX_MASTER_PLAN.md`](./RENTRIX_MASTER_PLAN.md) (execution roadmap), [`docs/ai/CURRENT_EXECUTION_CONTEXT.md`](./ai/CURRENT_EXECUTION_CONTEXT.md) (next work).

---

## Current Status

| Aspect | Status |
|--------|--------|
| **Active Phase** | Phase 3 Mobile UX Polish (sidebar/dashboard/settings/reports) ✅ COMPLETE |
| **Next Phase** | Phase 2.1 Navigation & UX Refinement prep |
| **Production Ready** | ❌ BLOCKED — awaiting Vercel env vars + final QA evidence |
| **Latest Merge** | PR #936 (Phase 3: sidebar-dashboard-reports-settings restructure) |
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

## Current Phase: **Phase 3 Navigation & Dashboard Polish (COMPLETE)**

### ✅ Phase 3 Completion (PR #936)

| Item | Description | Status |
|------|-------------|--------|
| **Sidebar Restructure** | 7 navigation groups renamed for clarity | ✅ merged |
| **Dashboard Enhancements** | KPI cards with descriptive context | ✅ merged |
| **Settings Refactor** | Icon semantics + label improvements | ✅ merged |
| **Reports Expansion** | KPI metrics section foundation | ✅ merged |

**Key changes:**
- Sidebar: 'العقارات والوحدات' → 'المحفظة', 'الأطراف' → 'الأطراف والعلاقات', etc.
- Dashboard KPI: Added descriptions for each metric (occupancy, arrears, expiring contracts)
- Settings: Bell icon for notifications, Cog for system
- Reports: Ready for 'المؤشرات الرئيسية' expansion

### ✅ Mobile UX Phase 2 — Page Component Migration (COMPLETE)

| Item | Description | Status |
|------|-------------|--------|
| **ContractsListPage** | Card grid (mobile) + table (desktop) | ✅ PR #852 merged |
| **PeopleListPage** | PersonCard + responsive layout | ✅ PR #853 merged |
| **UnitsList** | UnitCard + responsive layout | ✅ PR #854 merged |
| **ReceiptsPage** | ReceiptCard + responsive layout | ✅ PR #855 merged |
| **OwnersPage** | OwnerCard + responsive layout | ✅ PR #856 merged |
| **Mobile Auth Drawer** | Locked rows + auth warning polish | ✅ PR #927 merged |
| **Navigation & UX Polish** | Sidebar/Dashboard/Settings/Reports | ✅ PR #936 merged |

**Remaining (deferred):**
- ReportsPage detailed tables (complex financial views — low priority)
- Detail page responsive polish (owner-detail-view, property-detail — future)

### Next (Production Readiness & Vercel Deployment)

#### **Immediate Blockers to Address**
1. **Vercel Environment Variables** (Manual — requires dashboard access)
   - Add `VITE_SUPABASE_URL` from Supabase project `nnggcnpcuomwfuupupwg`
   - Add `VITE_SUPABASE_ANON_KEY` — same project
   - These unblock login page errors and enable E2E testing

2. **Custom Access Token Hook** (Manual — Supabase Dashboard)
   - Register webhook in Supabase Auth extension
   - Routes: `/api/auth/jwt`
   - Trigger: `on_auth_user_created` and `on_auth_user_updated`
   - Adds `office_id` and role claims to JWT `app_metadata`

3. **Authenticated E2E QA** 
   - Run browser tests with injected Vercel vars
   - Verify all RBAC gates function correctly
   - Check dashboard snapshot and report rendering

#### **Phase 2.1 — Mobile Navigation & UX Final Polish** *(when Vercel ready)*
- Bottom navigation tab spacing and responsiveness
- Touch targets audit (min 44px)
- RTL margin/padding final review
- Empty state message consistency across all list pages
- Mobile detail page drawer responsiveness

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
