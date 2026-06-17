# v0.5 Commercial Hardening Preparation

**Status:** PLANNED / repo-only preparation  
**Last updated:** 2026-06-17

This document prepares Rentrix for the v0.5 commercial-hardening phase without claiming production GO. The live final delivery gate remains BLOCKED until operator evidence closes B-1 through B-4 in `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md`.

## Scope

v0.5 preparation may improve documentation, operator runbooks, support expectations, and readiness procedures. It must not expand the product boundary or bypass the blocked live handover evidence.

Allowed now:

- Operator onboarding checklist.
- Safe test data policy.
- Backup and export expectations.
- Support/debug runbook preparation.
- Payment and receipt incident handling notes.
- Permission/RLS failure handling notes.
- Browser/device support notes.
- Arabic RTL/mobile acceptance checklist.
- Release rollback expectations.

Not allowed in this phase without a separate approved product decision:

- Supabase schema, migration, RLS, RPC, grant, or production config changes.
- Vercel or deployment setting changes.
- General accounting ledger.
- Tax finality or accounting-grade statements.
- Owner payout or settlement workflow.
- SaaS multi-tenancy.
- External provider sends from communication workflows.

## Current Production Classification

**BLOCKED**

Blocked live gates:

| Gate | Status | Note |
|---|---|---|
| B-1 live operator browser session | BLOCKED | Awaiting real browser evidence |
| B-2 payment to receipt E2E live | BLOCKED | Awaiting live transaction evidence |
| B-3 mobile and physical-device print QA | BLOCKED | Awaiting device evidence; physical print may be recorded as UNVERIFIED if not testable |
| B-4 live write/RLS confirmation | BLOCKED | Awaiting allowed-write evidence |

## Operator Onboarding Checklist

Before first-client handover, an operator should know how to:

- Sign in and confirm the expected role behavior.
- Create and review properties, units, people, contracts, invoices, payments, receipts, expenses, reports, and maintenance records.
- Use lands, leads, commissions, and communication as approved single-office modules.
- Print receipts and export supported files.
- Capture exact UI, console, and network error details when a write or financial action fails.
- Avoid using production records for destructive experiments.

## Safe Test Data Policy

- Use clearly labeled safe records for final QA.
- Avoid changing real tenant, owner, contract, invoice, or receipt records unless the owner explicitly approves the test scenario.
- Record the test chain used for payment-to-receipt evidence.
- Do not store secret values, private account data, or operator-only access details in docs, issues, or PRs.

## Backup and Export Expectations

- Reports CSV export remains the supported reports export path.
- Reports PDF export is DEFERRED.
- Current receipt support is browser print; dedicated generated receipt PDF remains PLANNED.
- Backup and restore procedures must be operator-approved before production GO.
- Any future DB backup automation belongs in a separate approved operations task.

## Support and Debug Runbook

When an operator reports a defect, capture:

- Route/page.
- Role used.
- Exact action attempted.
- Expected result.
- Actual result.
- UI error text.
- Console error if available.
- Network/RPC error if available.
- Whether the issue is reproducible after refresh.
- Related invoice, receipt, contract, or property identifiers if safe to record.

## Payment and Receipt Incident Handling

- Posted payments are immutable.
- Corrections must use reversal and replacement behavior, not manual balance edits.
- A receipt should be generated only from a posted payment.
- Invoice outstanding balance must remain derived through the canonical calculation path.
- If payment posting fails, record the exact visible error and network/RPC evidence before any fix is attempted.

## Permission and RLS Failure Handling

If an allowed write appears blocked:

1. Capture the visible UI failure state.
2. Capture console/network details if available.
3. Confirm the signed-in role and route.
4. Do not change RLS, grants, RPCs, or migrations without a narrow approved bug scope.
5. Open a focused issue or PR only after evidence identifies the failing surface.

## Browser, Device, RTL, and Mobile Acceptance Notes

Before production GO, live QA should confirm:

- Arabic RTL desktop layout is usable.
- Arabic RTL mobile layout is usable.
- English/LTR sanity remains safe where supported.
- Protected route refresh does not cause blank pages or loops.
- Receipt print view is readable.
- Mobile print behavior is passed or explicitly recorded as UNVERIFIED.

## Rollback Expectations

- Documentation-only changes can be reverted by PR revert.
- Runtime fixes must remain narrow and evidence-driven.
- No DB rollback should be planned or executed without a reviewed migration/operations plan.
- If final delivery QA finds a production-blocking defect, classify the release as NO-GO and open a focused fix PR.

## Out of Scope

- Dedicated generated receipt PDF: PLANNED.
- Reports PDF export: DEFERRED.
- External communication sending: OUT OF SCOPE.
- General accounting ledger: OUT OF SCOPE.
- Owner settlement or payout workflow: NEEDS OWNER DECISION.
- SaaS multi-tenancy: OUT OF SCOPE.

## Next Step

Keep production status BLOCKED until `docs/ai/FINAL_DELIVERY_GATE_QA_EVIDENCE.md` is updated with real live evidence for B-1 through B-4.
