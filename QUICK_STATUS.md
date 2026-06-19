# Rentrix Quick Status

**Fast summary for new agents. Not authoritative — see `docs/FINAL_PRODUCT_BLUEPRINT.md`, `docs/RENTRIX_MASTER_PLAN.md`, and `docs/ai/CURRENT_EXECUTION_CONTEXT.md` for the real story.**

---

## What is Rentrix?

- **Arabic-first** property operations system for single real-estate offices
- **Core flow:** Property → Unit → Contract → Tenant → Invoice → Payment → Receipt
- **Single office only** — no SaaS, no multi-tenancy, no shared databases
- **Status:** Mobile UX Phase 2 complete; v0.5 commercial hardening in prep; production BLOCKED on live QA

---

## Current State (2026-06-18)

**For authoritative status, see `docs/ai/CURRENT_EXECUTION_CONTEXT.md`.**

| Item | Status |
|------|--------|
| **Mobile UX Phase 2** | ✅ Complete (PRs #852–#856, #927) |
| **Documentation authority** | ✅ Unified (PR #932) |
| **Production Ready?** | ❌ BLOCKED — live QA evidence (B-1/B-2/B-3/B-4) not yet collected |
| **Latest merged** | PR #932 (docs: final product blueprint + roadmap authority) |
| **Repo baseline** | typecheck ✅ · 152 tests ✅ · build ✅ (2026-06-18) |
| **Database** | Supabase `nnggcnpcuomwfuupupwg` (ap-southeast-1) — stable |
| **Active branch** | `main` |

---

## What's Done (Mobile UX Phase 2)

- ✅ ContractsListPage (PR #852)
- ✅ PeopleListPage (PR #853)
- ✅ UnitsList (PR #854)
- ✅ ReceiptsPage (PR #855)
- ✅ OwnersPage (PR #856)
- ✅ Mobile auth drawer polish (PR #927)
- ✅ ReportsPage deferred (complex — 4 financial tables)

---

## Next Work

See `docs/ai/CURRENT_EXECUTION_CONTEXT.md` for current next PR order.

1. **Live QA** — B-1/B-2/B-3/B-4 evidence (requires human operator)
2. **v0.5 hardening** — operator runbooks, QA scripts, onboarding docs (repo-only)
3. **ReportsPage mobile** — 4 financial tables responsive (when prioritised)

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

1. Read `AGENTS.md` (agent rules)
2. Read `docs/FINAL_PRODUCT_BLUEPRINT.md` (what Rentrix is)
3. Read `docs/RENTRIX_MASTER_PLAN.md` (execution roadmap)
4. Read `docs/ai/CURRENT_EXECUTION_CONTEXT.md` (what to work on)
5. Read `docs/ai/ONBOARDING.md` (current app state)
6. Start work from `main` branch

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

**Last updated:** June 18, 2026 | **Status:** Mobile UX Phase 2 complete; v0.5 hardening in prep; production BLOCKED
