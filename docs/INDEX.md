# Rentrix Documentation Index

**Navigation guide: which documents to read and when. Not authoritative for roadmap (see `docs/RENTRIX_MASTER_PLAN.md`), product (see `docs/FINAL_PRODUCT_BLUEPRINT.md`), or execution (see `docs/ai/CURRENT_EXECUTION_CONTEXT.md`).**

---

## Entry Points (Start Here)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **`QUICK_STATUS.md`** | 2-minute overview of current work and status | First if you're new; before anything else |
| **`AGENTS.md`** (repo root) | Agent working rules, constraints, boundaries | First time as an agent; before writing code |
| **`README.md`** (repo root) | Repository orientation and runtime structure | Second; overview of folder layout and tech choices |
| **`docs/ROADMAP.md`** | Current phase status, completed phases, next work | Third; understand what's done/current/next |

---

## Core Documents (Read in Order)

| Document | Contains | Audience | Page |
|----------|----------|----------|------|
| **`docs/ai/CURRENT_EXECUTION_CONTEXT.md`** | What's blocked, next PR, scope limits, contradictions, rules for future agents | Agents + stakeholders | Before implementation |
| **`docs/RENTRIX_MASTER_PLAN.md`** | Final product shape, baseline, release status, all decisions, verification checklist | Agents + product leads | Planning & design decisions |
| **`docs/FIRST_CLIENT_DELIVERY_PLAN.md`** | Client scope, acceptance criteria, rollout sequence | Agents + client managers | Before client work |
| **`docs/ai/ONBOARDING.md`** | Current app snapshot, navigation routes, module status (live/hidden/deferred), permissions model | Agents | After master plan |

---

## Policy & Domain Documents

| Document | Contains | When to Read |
|----------|----------|--------------|
| **`docs/ai/domain-rules.md`** | Property/unit/contract/tenant/payment invariants | Before data/finance work |
| **`docs/ai/engineering-policy.md`** | Code style, testing, architecture patterns | Before writing code |
| **`docs/ai/security-policy.md`** | Auth flow, RLS model, permission boundaries | Before auth/RLS work |
| **`docs/ai/release-policy.md`** | Git workflow, PR gates, merge strategy | Before git operations |
| **`docs/ai/testing-guide.md`** | Unit tests, integration tests, what to test | Before writing tests |
| **`docs/decisions/README.md`** | Architecture decisions (ADRs), approved constraints | When making design choices |

---

## Technical Reference Documents

| Document | Contains | When to Consult |
|----------|----------|-----------------|
| **`docs/ROOT_LAYOUT.md`** | Folder structure, ownership, dependency rules | Before moving files or creating new folders |
| **`docs/ai/AGENT_CAPABILITIES.md`** | What agents can do, task-to-skill mapping | When unsure about task scope |
| **`docs/ai/GIT_TOOLING_POLICY.md`** | Branch naming, PR conventions, merge rules | Before git operations |
| **`docs/ai/UI_COMPONENT_GUIDE.md`** | Unified table/card component system, dual-view pattern, adoption status | Before any UI/list page work |
| **`docs/ai/PRINT_AND_EXPORT_READINESS.md`** | Print/PDF state, export formats, known limitations | Before receipt/export work |
| **`docs/ai/REPORTING_DEFINITIONS.md`** | Report definitions, metrics, calculations | Before reports work |
| **`docs/ai/SECURE_OPERATOR_RUNBOOK.md`** | Deployment, environment, backup, runbook | Before production tasks |

---

## Blockers & Evidence Documents

| Document | Contains | Purpose |
|----------|----------|---------|
| **`docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`** | Why production is BLOCKED, what QA evidence is needed | Understand production blockers |
| **`docs/ai/V05_COMMERCIAL_HARDENING_PREP.md`** | v0.5 repo prep (not production claims) | Commercial planning only |

---

## Document Relationships

```
QUICK_STATUS.md
    ↓
README.md + AGENTS.md
    ↓
ROADMAP.md (phase clarity)
    ↓
CURRENT_EXECUTION_CONTEXT.md (scope + blockers)
    ↓
RENTRIX_MASTER_PLAN.md (full product shape + decisions)
    ↓
FIRST_CLIENT_DELIVERY_PLAN.md (client scope)
    ↓
ONBOARDING.md (route snapshot + permissions)
    ↓
[Policy & Reference docs as needed]
```

---

## What NOT to Do

❌ **Don't read** if you don't need it:
- Old audit reports (use git history if needed)
- Recovery notes (already integrated, not needed)
- Superseded roadmaps (trust the active roadmap)
- Release threads (old status, check CURRENT_EXECUTION_CONTEXT instead)

❌ **Don't copy forward** stale status:
- Always verify against active code in `artifacts/rentrix/`
- Always check `CURRENT_EXECUTION_CONTEXT.md` for updates
- Always read git commit messages for latest changes

---

## Maintenance & Updates

- **After each major phase:** Update `ROADMAP.md` completed/next sections
- **After each PR merge:** Check if `CURRENT_EXECUTION_CONTEXT.md` needs scope/blocker updates
- **When doc conflicts arise:** Inspect active code; update docs to match reality
- **When removing docs:** Keep git history; don't copy old status forward

---

## Quick Answer Guide

| Question | Where to Look |
|----------|-----------------|
| "What's the current phase?" | `ROADMAP.md` or `QUICK_STATUS.md` |
| "What's blocked?" | `CURRENT_EXECUTION_CONTEXT.md` |
| "What's in scope for my task?" | `ROADMAP.md` + `AGENT_CAPABILITIES.md` |
| "How do I structure code?" | `ROOT_LAYOUT.md` + `engineering-policy.md` |
| "How do I git?" | `GIT_TOOLING_POLICY.md` |
| "What's a payment?" | `domain-rules.md` + `RENTRIX_MASTER_PLAN.md` section 1 |
| "Is X approved?" | `decisions/README.md` |
| "Why is production blocked?" | `FINAL_DELIVERY_GATE_QA_EVIDENCE.md` |
| "How do I test?" | `testing-guide.md` |
| "How do I deploy?" | `SECURE_OPERATOR_RUNBOOK.md` |

---

**Last maintained:** June 18, 2026  
**Purpose:** Single source of truth for documentation; avoid stale or conflicting docs
