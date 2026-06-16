# First Client Delivery Plan

**Status:** Active delivery plan
**Audience:** product owner, operators, and coding agents
**Updated:** 2026-06-15

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
| Payment recording | Account resolution fixes are recorded as live-verified in `docs/ai/CURRENT_EXECUTION_CONTEXT.md`; authenticated browser E2E remains unverified. | P0 evidence blocker for first client. |
| Migration chain | Current execution context reports the repo and live DB migration chain were reconciled after PR #910 and PR #911. | Re-verify only with approved read-only evidence before GO. |
| Auth roles | `custom_access_token_hook` exists, but Dashboard/Auth Hook registration still needs owner-side verification. | Blocks real ADMIN QA. |
| Deployment | `rentrix-alpha.vercel.app` is reachable and current docs record correct live Supabase env values in the served bundle. | Deployment can be QA target after auth/payment blockers clear. |
| Planned modules | `/lands`, `/leads`, `/commissions`, and `/communication` are approved single-office modules. | Do not let planned-module work delay first payment and receipt QA. |

## Phase 1: Unblock the Financial Core

Goal: an ADMIN or MANAGER records a real tenant payment, generates a receipt, and
updates invoice status on the intended live project.

| Order | Task | Owner/access needed | Exit evidence |
| --- | --- | --- | --- |
| 1 | Verify Custom Access Token Auth Hook registration. | Supabase owner/operator access | ADMIN JWT includes `app_metadata.user_role = "ADMIN"`. |
| 2 | Run authenticated payment QA: contract -> invoice -> payment -> receipt -> invoice status. | Browser-driving capability and ADMIN credentials | Screenshots or written QA evidence. |
| 3 | Run reversal QA for posted payment correction behavior. | ADMIN/MANAGER session | Receipt void/reversal behavior recorded. |
| 4 | Record payment-to-receipt E2E evidence in the active execution context or roadmap. | Reviewable docs PR | Evidence and remaining blockers are current. |

Exit criterion: payment recording and receipt generation are verified end-to-end
against the target environment.

## Phase 2: Close v0.1 Constrained-Beta Risk

Goal: close the remaining release blockers without adding new product scope.

| Order | Task | Exit evidence |
| --- | --- | --- |
| 1 | Re-verify migration chain status only with approved read-only access. | Current execution context or roadmap evidence updated. |
| 2 | Verify Custom Access Token Auth Hook registration. | ADMIN JWT includes `app_metadata.user_role = "ADMIN"`. |
| 3 | Complete full browser/manual QA. | RTL desktop, RTL mobile, LTR sanity, protected-route refresh, forms, dialogs, receipt print, CSV export, PWA, and invalid-route evidence. |
| 4 | Record GO/NO-GO in `docs/RENTRIX_MASTER_PLAN.md`. | v0.1 status updated with evidence. |

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

## Immediate Blockers for Mohamed

1. Supabase owner/operator access is required to confirm the 50 live migration
   entries and apply/replay the account-resolution fix.
2. Supabase Dashboard or Management API access is required to verify Custom Access
   Token Auth Hook registration.
3. A browser-driving or manual QA session with real ADMIN credentials is required
   to prove the payment and receipt flow.
4. GitHub push credentials are not available in this session, so this branch can
   be committed locally but cannot be pushed or opened as a real remote PR from
   here.
