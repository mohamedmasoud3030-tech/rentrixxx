# Product Freeze Plan — Final Stabilization Mode

Date: 2026-04-27
Status: ACTIVE

## 1) Frozen Core (No Architectural Changes)

The following modules are **frozen** and must only receive bug fixes or safety patches:

- `src/services/accountingDocuments/AccountingDocumentEngine.ts`
- `src/services/accountingDocuments/DocumentLifecycle.ts`
- `src/services/ledger/LedgerEngine.ts`
- `src/services/audit/AuditTrail.ts`
- `src/services/reports/ReportEngine.ts`
- `src/services/reports/ReportSnapshotManager.ts`
- `src/services/documents/DocumentController.ts`
- `src/services/documents/DocumentRenderer.ts`
- `src/services/documents/DocumentEngine.ts`
- `src/services/documents/TableGenerator.ts`

Frozen financial/reporting invariants:

- FSM: `draft -> posted -> void` only.
- Ledger posting remains atomic and balanced.
- Reporting remains snapshot-first via `reportEngine.generate`.
- Document PDF generation remains centralized via `DocumentController`.

## 2) Maintenance-Only Scope

The following areas are maintenance-only (stability/bug fix):

- Supabase client and API service wrappers
- `receiptService`, `operationsService`, `attachmentService`
- edge-function integrations
- utility-level error handling and guardrails

## 3) UI / UX Completion Scope

Allowed evolution scope:

- Navigation and sidebar hierarchy polish
- Reports/Finance page consistency
- Table/form state consistency (loading/empty/error)
- Print/PDF visual consistency (without changing pipeline)

## 4) Enforcement Gate

Run:

```bash
npm run check:freeze
```

The command fails when frozen core files are changed without explicit override:

```bash
ALLOW_CORE_CHANGES=1 npm run check:freeze
```
