# First Client Delivery Plan

**Status:** Draft -- proposed sequencing for the path from the current repository
state to a real, paying first-client rollout of Rentrix.

**Relationship to other docs:** this plan does not replace
`docs/RENTRIX_MASTER_PLAN.md`; it re-sequences the existing v0.1, v0.4, and v0.5
scope around the goal of one real office using Rentrix for real money. Product
boundaries from `README.md`, `AGENTS.md`, and `docs/RENTRIX_MASTER_PLAN.md` still
apply: single office, no SaaS multi-tenancy, and no general ledger expansion during
this plan.

**Primary evidence sources:**

- `docs/RENTRIX_MASTER_PLAN.md`
- `docs/ai/ONBOARDING.md`
- `docs/v01/migration-reconciliation-status.md`
- `docs/v01/idempotency-rollout-review.md`
- `docs/v01/security-reconciliation-final.md`

---

## 0. Current Readiness Snapshot (2026-06-15)

| Area | State |
| --- | --- |
| Operational UI | UI complete for properties, units, people, tenants, owners, contracts, invoices, receipts, expenses, arrears, and reports. |
| Governance UI | Maintenance, audit-log, data-integrity, and system governance routes are re-exposed in constrained-beta navigation. |
| Payment recording (`record_invoice_payment_atomic`) | Broken on live until the pending account-resolution fix is deployed and re-verified. |
| Migration chain | Live and local chain state still require reconciliation before v0.1 can close. |
| Auth (`custom_access_token_hook`) | Function exists, but Dashboard/Auth Hook registration still requires owner or management-API verification. |
| Deployment (`rentrix-alpha.vercel.app`) | Reachable, with the correct live Supabase environment embedded in the served bundle per current roadmap evidence. |
| Live data | Existing live data appears seed/demo-like and has no recorded financial ledger activity in the current evidence snapshot. |
| Deferred CRM | `/lands`, `/leads`, `/commissions`, and `/communication` remain registered but hidden pending v0.4 product decisions. |

**Bottom line:** the application is UI-complete and visually production-grade, but
the most important transaction in the product -- recording a tenant payment -- must
work end-to-end on the live database before any client rollout begins.

---

## Phase 1 -- Unblock the Financial Core (P0, Days Not Weeks)

Goal: an ADMIN or MANAGER can record a real payment on the live database, generate a
receipt, and transition the invoice to paid or partially paid.

| # | Task | Source | Depends on |
| --- | --- | --- | --- |
| 1.1 | Fix `find_payment_account_id` / `record_invoice_payment_atomic` using the current account-resolution repair strategy. | `docs/v01/migration-reconciliation-status.md` | none |
| 1.2 | Apply the fix as a new forward migration after `20260614140200_schema_cleanup_triggers_fks_indexes.sql`, then run Supabase advisor checks when access is available. | 1.1 | 1.1 |
| 1.3 | Live read-only re-verification: rerun `find_payment_account_id('cash')` and `find_payment_account_id('receivable')`, and confirm both return without error. | 1.1, 1.2 | 1.2 |
| 1.4 | End-to-end payment test: create one contract, generate or create an invoice, record payment via UI, confirm receipt and invoice status transition, void the receipt, and confirm reversal behavior. | 1.3 | 1.3 |
| 1.5 | Confirm `custom_access_token_hook` is registered as the project's Auth Hook. This is an owner-performed Dashboard or Management API step. | `docs/v01/security-reconciliation-final.md` | none |
| 1.6 | Fix remaining local-date defaults that still use `toISOString().slice(0, 10)` by switching to `getTodayLocalDateString` from `financials-date-utils.ts`. | prior local-date audit evidence | none |

**Exit criteria:** Phase 1 exits only when task 1.4 passes against live with a real
ADMIN session. This closes the payment-recording portion of v0.1 item 5 and most of
the v0.1 item 4 financial RPC acceptance evidence.

---

## Phase 2 -- Close v0.1 (Constrained-Beta Closure)

This reorders the remaining v0.1 work so migration-chain risk and authenticated QA
are explicit and not bundled into the payment fix.

| # | Task | Notes |
| --- | --- | --- |
| 2.1 | Migration-chain reconciliation | Use `docs/v01/migration-reconciliation-status.md` as the active local status source. Keep this in a separate PR from Phase 1 because migration-history repair is high risk. |
| 2.2 | Preview-branch replay of the reconciled chain | Depends on 2.1 and required preview access. |
| 2.3 | Full authenticated browser/manual QA pass | Depends on Phase 1 payment flow and Auth Hook registration. Cover RTL desktop, RTL mobile, LTR sanity, protected-route refresh, receipt print, CSV export, PWA install/offline/update, and invalid-route fallback. |
| 2.4 | Record final constrained-beta GO/NO-GO decision in `docs/RENTRIX_MASTER_PLAN.md` | Depends on 2.1 through 2.3. |

**Exit criteria:** v0.1 is marked `CLOSED` with a recorded GO decision in
`docs/RENTRIX_MASTER_PLAN.md`.

---

## Phase 3 -- Decide the First Client's Module Scope (v0.4 Product Decisions)

The first client does not need every deferred module on day one. Ship the Phase 1 and
Phase 2 operational core first, then treat v0.4 modules as fast-follow work scoped to
the first client's actual workflow.

| # | Task | Decision needed |
| --- | --- | --- |
| 3.1 | `/lands` | Decision recorded in `docs/decisions/ADR-007-first-client-v04-module-scope.md`: leave hidden for day one unless the first client confirms active land-plot management. If confirmed, verify schema/RLS, add focused tests, and re-expose navigation through a narrow PR. |
| 3.2 | `/leads`, `/commissions`, `/communication` | Decision recorded in `docs/decisions/ADR-007-first-client-v04-module-scope.md`: do not build these for v1 unless the first client explicitly requires lead tracking, commission tracking, or templated communication. They currently remain unavailable by design. |
| 3.3 | Owner settlements | Decision recorded in `docs/decisions/ADR-007-first-client-v04-module-scope.md`: treat as v1.1+ unless paying owners through Rentrix is a hard first-client requirement. |

**Exit criteria:** complete. ADR-007 records a short first-client decision for each row
without re-exposing deferred routes or adding unconfirmed module scope.

---

## Phase 4 -- Commercial Delivery Hardening for One Real Office (v0.5)

| # | Task | Notes |
| --- | --- | --- |
| 4.1 | Decide whether the current live project (`nnggcnpcuomwfuupupwg` / `rentrix-alpha.vercel.app`) becomes the client environment or whether the client gets a fresh isolated Supabase and Vercel project. | If reused, existing seed-like data must be reviewed with the client and purged or accepted before go-live. If fresh, the reconciled migration chain from Phase 2 seeds the new project, and Phase 1 must be re-verified there. |
| 4.2 | Fill real office company settings. | Confirm logo, VAT rate, contract serial prefix, and notification preferences are not left as defaults. |
| 4.3 | Branding and locale pass. | Confirm Arabic RTL is the default for client users, and English/LTR remains safe as a toggle. Spot-check long Arabic names and larger numbers. |
| 4.4 | Backup, restore, and monitoring checklist. | Follow the v0.5 release hardening boundary in `docs/RENTRIX_MASTER_PLAN.md`. |
| 4.5 | Operator onboarding runbook. | Add a short non-agent staff guide for adding property, unit, tenant, contract, recording payment, printing receipt, and running reports. |
| 4.6 | Data import decision. | Choose manual entry or a one-time CSV import script based on client data volume. No bulk-import UI exists today. |

**Exit criteria:** the chosen environment has correct company settings, branding has
been sanity-checked, backup/restore is documented, and an operator runbook exists.

---

## Phase 5 -- Go Live for the First Client

| # | Task |
| --- | --- |
| 5.1 | Run the full release-candidate CI gate: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm --filter ./artifacts/rentrix run typecheck:test`, `pnpm --filter ./artifacts/rentrix test`, and `pnpm --filter ./artifacts/rentrix run test:financials`. |
| 5.2 | Create the office's real ADMIN account, set `public.profiles.role = 'ADMIN'`, and confirm a real login receives `app_metadata.user_role = 'ADMIN'`. |
| 5.3 | Enter or import the client's real properties, units, people, tenants, and owners. |
| 5.4 | Enter the client's first real contract, create an invoice, record a real payment, and confirm receipt printing. |
| 5.5 | Monitor 1-2 weeks of real usage before starting any v0.4 fast-follow work. |

---

## Sequencing Summary

```text
Phase 1 (P0, days)         -> unblock payment recording + local-date fixes
Phase 2 (v0.1 closure)     -> migration reconciliation + full browser QA + GO/NO-GO
Phase 3 (scoping)          -> first-client v0.4 module decisions
Phase 4 (v0.5 hardening)   -> environment, settings, branding, runbook, import plan
Phase 5 (go-live)          -> CI gate, real ADMIN account, real data, first real payment
```

Phases 3 and 4 can run in parallel with the tail of Phase 2 once Phase 1 is merged.
Phase 5 cannot start until Phases 1, 2, and the environment/settings parts of Phase 4
are complete.

---

## Open Product Decisions Blocking This Plan

1. **Environment choice:** reuse `nnggcnpcuomwfuupupwg` with reviewed/purged data, or
   provision a fresh isolated project for the first client.
2. **Lands module:** confirm whether the first client needs land-plot management.
3. **Data import:** decide manual entry vs. CSV import based on the client's existing
   data volume.

These decisions should be made by the product owner before Phase 4 starts. They do
not block Phase 1 or Phase 2.
