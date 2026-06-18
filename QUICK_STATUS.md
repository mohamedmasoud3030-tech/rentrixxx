# Rentrix Quick Status

**Read this first if you're a new agent starting work.**

---

## What is Rentrix?

- **Arabic-first** property operations system for single real-estate offices
- **Core flow:** Property → Unit → Contract → Tenant → Invoice → Payment → Receipt
- **Single office only** — no SaaS, no multi-tenancy, no shared databases
- **Status:** v0.3 closed, Mobile UX Phase 2 in progress

---

## Current Work (June 18, 2026)

| Item | Status |
|------|--------|
| **Mobile UX Phase 2** | In progress — responsive list pages (cards on mobile, tables on desktop) |
| **Production Ready?** | ❌ NO — blocked on final QA evidence (B-1/B-2/B-3/B-4) |
| **Latest merged** | PR #927 (auth drawer polish) |
| **Database** | Supabase `nnggcnpcuomwfuupupwg` (ap-southeast-1) |
| **Active branch** | `main` |

---

## What's Done This Phase (Mobile UX Phase 2)

- ✅ ContractsListPage (PR #852)
- ✅ PeopleListPage (PR #853)
- ✅ UnitsList (PR #854)
- ✅ ReceiptsPage (PR #855)
- ✅ OwnersPage (PR #856)
- ✅ Mobile auth drawer polish (PR #927)

**Not yet:** ReportsPage (4 financial tables — complex, deferred)

---

## Next Work

1. **Phase 2.1** — Mobile nav & UX refinement (bottom tabs, touch targets)
2. **Phase 3** — Advanced modules (Leads, Communications, Commissions, AI) — **deferred**
3. **v0.4** — CRM modules — **way future**

---

## Where to Find Things

| What | Where |
|------|-------|
| **Read first** | `docs/ROADMAP.md` (this roadmap, updated) |
| **Full context** | `docs/RENTRIX_MASTER_PLAN.md` |
| **Code structure** | `docs/ROOT_LAYOUT.md` |
| **Agent rules** | `AGENTS.md` |
| **Current snapshot** | `docs/ai/ONBOARDING.md` |
| **Client delivery** | `docs/FIRST_CLIENT_DELIVERY_PLAN.md` |
| **Git policy** | `docs/ai/GIT_TOOLING_POLICY.md` |
| **Decisions** | `docs/decisions/README.md` |

---

## Key Constraints

- ✅ **DO:** Follow mobile-first design, use responsive classes (`md:hidden`, `hidden md:block`)
- ✅ **DO:** Keep RTL correct (Arabic text flows right)
- ✅ **DO:** Preserve single-office boundary (no orgs, no subscriptions)
- ❌ **DON'T:** Add general ledger (accounting-grade)
- ❌ **DON'T:** Add multi-tenancy or SaaS features
- ❌ **DON'T:** Change Supabase, migrations, or RLS without plan
- ❌ **DON'T:** Touch Vercel config or deployment settings

---

## Getting Started

1. Clone the repo (or `cd` to existing clone)
2. Read `AGENTS.md` + `docs/ROADMAP.md`
3. Read `docs/RENTRIX_MASTER_PLAN.md` for full context
4. Check `docs/ai/CURRENT_EXECUTION_CONTEXT.md` for current blockers/scope
5. Start work from `main` branch

---

## Quick Commands

```bash
# Install dependencies
pnpm install

# Typecheck
pnpm run typecheck

# Build
pnpm run build

# Run Rentrix app locally (from artifacts/rentrix/)
cd artifacts/rentrix
pnpm dev

# Run tests
pnpm test

# Git policy
# Branch: feat/..., fix/..., docs/...
# Commit: concise, reference PR/issue
# Push: always to feature branch, open PR
# Merge: squash-merge to main via GitHub UI
```

---

## Production Status

🔴 **BLOCKED** — Awaiting:
- B-1: Browser QA evidence (RTL, mobile, receipt print)
- B-2: Direct refresh behavior
- B-3: PWA install/offline/update
- B-4: Manual acceptance by ops team

See `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md` for details.

---

## Questions?

- **Architecture questions?** → `docs/RENTRIX_MASTER_PLAN.md` (sections 1–4)
- **Code questions?** → `docs/ROOT_LAYOUT.md`
- **What can I do?** → `docs/ai/AGENT_CAPABILITIES.md`
- **Git questions?** → `docs/ai/GIT_TOOLING_POLICY.md`
- **Not answered?** → Check git history or ask in context window

---

**Last updated:** June 18, 2026 | **Status:** Mobile UX Phase 2 in progress
