# First Client Delivery Plan

**Status:** Active delivery plan
**Audience:** product owner, operators, and coding agents
**Updated:** 2026-06-16

This plan translates the active Rentrix roadmap into the shortest safe path to a
real first-client rollout. It follows the repository documentation convention and
is written in English. Product/user-facing UI remains Arabic-first.

This plan does not replace `docs/RENTRIX_MASTER_PLAN.md`. It reorders the current
work around one practical outcome: one real office can use Rentrix to manage real
properties, contracts, invoices, payments, receipts, arrears, expenses, and
reports without violating the single-office, no-SaaS, no-general-ledger boundary.

## Current Readiness Snapshot

| Area | Current state | Delivery implication |
| --- | --- | --- |
| Operational UI | Core visible workflows are implemented and polished enough for constrained-beta review. | UI work is no longer the first blocker. |
| Payment recording | Account resolution fixes are recorded as live-verified in `docs/ai/CURRENT_EXECUTION_CONTEXT.md`; authenticated browser E2E remains unverified. | Final delivery gate for first client. |
| Migration chain | Current execution context reports the repo and live DB migration chain were reconciled after PR #910 and PR #911. | Re-verify only with approved read-only evidence before GO. |
| Auth roles | Custom Access Token Hook registration is `DONE` by owner confirmation. | Not a current repo-stabilization blocker; ADMIN QA still must verify post-login behavior at final delivery. |
| Deployment | `rentrix-alpha.vercel.app` is reachable and current docs record correct live Supabase env values in the served bundle. | Deployment can be QA target during final delivery QA. |
| Planned modules | `/lands`, `/leads`, `/commissions`, and `/communication` are approved single-office modules. | Do not let planned-module work delay first payment and receipt QA. |

## Phase 1: Unblock the Financial Core

Goal: an ADMIN or MANAGER records a real tenant payment, generates a receipt, and
updates invoice status on the intended live project.

| Order | Task | Owner/access needed | Exit evidence |
| --- | --- | --- | --- |
| 1 | Run authenticated payment QA: contract -> invoice -> payment -> receipt -> invoice status. | Browser-driving capability and ADMIN credentials | Screenshots or written QA evidence. |
| 2 | Run reversal QA for posted payment correction behavior. | ADMIN/MANAGER session | Receipt void/reversal behavior recorded. |
| 3 | Record payment-to-receipt E2E evidence in the active execution context or roadmap. | Reviewable docs PR | Evidence and remaining blockers are current. |

Exit criterion: payment recording and receipt generation are verified end-to-end
against the target environment.

## Phase 2: Close v0.1 Constrained-Beta Risk

Goal: close the remaining final delivery gates without adding new product scope.

| Order | Task | Exit evidence |
| --- | --- | --- |
| 1 | Re-verify migration chain status only with approved read-only access. | Current execution context or roadmap evidence updated. |
| 2 | Verify authenticated ADMIN role behavior in-browser. | Protected routes, permissioned navigation, and role-dependent actions work after login. |
| 3 | Complete full browser/manual QA. | RTL desktop, RTL mobile, LTR sanity, protected-route refresh, forms, dialogs, receipt print, CSV export, PWA, and invalid-route evidence. |
| 4 | Record GO/NO-GO in `docs/RENTRIX_MASTER_PLAN.md`. | Final delivery status updated with evidence. |

Exit criterion: v0.1 can be closed with a documented GO decision or an explicit
remaining blocker.

## Phase 3: Decide First-Client Scope

Goal: keep the first client focused on the operational core unless they explicitly
need optional modules.

| Decision | Default recommendation | Reason |
| --- | --- | --- |
| Reuse current live project or provision a fresh client project | Prefer a fresh isolated Supabase/Vercel pair unless the owner approves reusing and cleaning current data. | Avoid demo/seed-data ambiguity. |
| Lands | Decide rollout timing from the client's actual portfolio. | Approved module, but not a blocker for first payment and receipt QA. |
| Leads, commissions, communication | Decide rollout timing from the client's actual workflow. | Approved modules, but not blockers for first payment and receipt QA. |
| Owner settlements | Defer unless owner payout management is a day-one requirement. | Prevents accidental accounting-ledger expansion. |
| Data import | Choose manual entry for small portfolios; use a one-time reviewed CSV/import script for larger portfolios. | No bulk-import UI should be rushed into v1. |

Exit criterion: every optional module has a written first-client decision.

## Phase 4: Harden the Client Environment

Goal: prepare the selected environment for real office operations.

| Order | Task | Exit evidence |
| --- | --- | --- |
| 1 | Set company settings: logo, legal name, VAT/default tax settings, contract prefix, timezone, currency, and notification preferences. | Settings screenshot or export. |
| 2 | Confirm backup, restore, and rollback process. | Operator checklist with responsible person. |
| 3 | Create the real ADMIN account and verify role injection. | Login evidence and JWT role evidence. |
| 4 | Enter/import real properties, units, people, tenants, owners, and initial contracts. | Sample records checked with the client. |
| 5 | Prepare a short Arabic operator guide for daily workflows. | Staff can add property/unit/tenant/contract, record payment, print receipt, and run reports. |

Exit criterion: the client environment contains real settings, real users, and
approved starter data.

## Phase 5: Go Live and Monitor

Goal: move from controlled readiness to real operation with a tight feedback loop.

| Order | Task | Exit evidence |
| --- | --- | --- |
| 1 | Run the full repository gate: install, typecheck, lint, build, test typecheck, app tests, and financial tests. | Passing command output recorded. |
| 2 | Perform the first real payment with the client present. | Receipt printed/exported and invoice status verified. |
| 3 | Monitor the first 1-2 weeks of usage. | Daily issue log and no silent financial failures. |
| 4 | Only then start optional v0.4 fast-follow modules. | Separate product decision and narrow PR per module. |

## Incomplete / Planned / Deferred Work

| Item | Status | Current note |
| --- | --- | --- |
| Authenticated ADMIN browser QA | `FINAL DELIVERY GATE` | Required before production GO; not a repo-stabilization blocker. |
| Production GO/NO-GO | `FINAL DELIVERY GATE` | Pending final handover QA. |
| Mobile/physical-device print QA | `FINAL DELIVERY GATE` | Must verify at least one supported mobile/device path. |
| Commercial hardening v0.5 | `PLANNED` | Starts after final delivery QA closes or records a NO-GO fix path. |
| v1.0 commercial release | `PLANNED` | Depends on final delivery QA and v0.5. |
| Dedicated generated receipt PDF file | `PLANNED` | Current receipt support is browser print only. |
| External communication sending | `OUT OF SCOPE` | Internal communication log only. |
| General accounting ledger | `OUT OF SCOPE` | Not part of first-client delivery. |
| Owner settlement/payout workflow | `NEEDS OWNER DECISION` | Defer unless owner payout management becomes a day-one requirement. |
| Tax finality/accounting-grade tax treatment | `OUT OF SCOPE` | Requires approved accounting requirements. |

## Immediate Final Delivery Gates for Mohamed

1. A browser-driving or manual QA session with real ADMIN credentials is required
   to prove the payment and receipt flow.
2. Production GO/NO-GO remains pending final handover QA.
3. Full production readiness must not be claimed before final delivery QA closes.
