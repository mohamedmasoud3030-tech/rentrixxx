# Operational Logic Audit — March 30, 2026

## 1) Critical operational risks

1. **Non-atomic receipt posting can leave inconsistent finance state**
   - Receipt insert, allocation insert, invoice updates, and journal postings are executed as separate operations without database transaction wrapping.
   - Partial failure can create posted receipt without matching allocations/journal or mismatched invoice paid amounts.

2. **Contract renewal can temporarily produce two ACTIVE contracts for the same unit/tenant**
   - Renewal creates the new ACTIVE contract first, then marks old one ENDED.
   - If second update fails, overlap remains.

3. **Historical integrity can be broken by hard delete of contracts**
   - Contracts are deletable via generic delete flow.
   - Related financial history links can become orphaned from the operational perspective.

---

## 2) Important workflow inconsistencies

1. **Unit occupancy is treated as editable status in Properties while contracts are the real source of truth**
   - Dashboard and contract forms rely on active contracts, but properties screens and reporting still depend on `unit.status` counters.

2. **Maintenance does not enforce operational blocking of renting**
   - Maintenance requests generate financial records on completion, but there is no deterministic lock preventing rent onboarding while critical maintenance exists.

3. **Payment edits are blocked (good), but operator recovery path is indirect**
   - Users must void and recreate, yet this can be error-prone during busy month-end unless guided with stronger workflow prompts.

---

## 3) Data-integrity vulnerabilities

1. **Rollback safety gaps on core finance operations**
   - `addReceiptWithAllocations` and related loops do multi-step writes without transactional rollback.

2. **Potential orphan financial references in maintenance completion path**
   - `invoiceId`/`expenseId` linkage is conditional on successful downstream creation; failure handling relies on UI-level flow and subsequent refresh, not atomicity.

3. **Rounding drift possible across distributed calculations**
   - VAT and allocation computations use mixed rounding moments (`round3`, fixed threshold comparisons), which can accumulate small differences over many records.

---

## 4) UX risks affecting daily work

1. **Destructive delete is globally available for operational entities**
   - Confirmation exists, but there are no domain-specific guards for history-critical entities (e.g., contracts).

2. **Insufficient progress/partial-failure visibility in chained finance actions**
   - Users get generic toasts, but not a step-by-step status of what succeeded/failed in multi-write operations.

3. **Accountant confusion risk due to mixed derived-vs-stored totals across screens**
   - Some screens derive from ledger/accounting service, while others read snapshot balances directly; discrepancies are hard for operators to reconcile quickly.

---

## 5) Concrete fixes (minimal changes)

1. Add Supabase RPC for **atomic receipt posting** (`receipt + allocations + invoice paid updates + journal entries`) and call it from `addReceiptWithAllocations`.
2. Flip contract renewal sequence to **end old first in one guarded flow** or use atomic RPC to create+close in one unit.
3. Add **soft-delete policy** for contracts (status flag) and block hard delete when financial links exist.
4. Derive unit occupancy from active contracts at read time (or auto-sync unit status after contract mutations) to remove status drift.
5. Add maintenance “blocking” flag check before creating ACTIVE contracts on a unit.
6. Add finance operation result panel (counts of successful/failed sub-steps) for high-impact workflows.

---

## 6) Suggested automated validations to add

1. **Atomic finance posting test**: force failure in middle step and assert no partial writes remain.
2. **Contract renewal concurrency test**: ensure no overlap under retries/failures.
3. **Delete safety test**: contracts with linked invoices/receipts cannot be hard-deleted.
4. **Occupancy consistency test**: unit availability in UI equals active-contract-derived state.
5. **Maintenance gating test**: unit with blocking maintenance cannot receive new ACTIVE contract.
6. **Report parity test**: trial balance / income statement totals equal ledger-derived sources for same date range.

---

## Operational reliability score

**74 / 100**

- Core accounting model is solid and many guardrails exist.
- Score reduced by non-atomic multi-step finance writes, deletion/history hazards, and occupancy-state drift risks.
