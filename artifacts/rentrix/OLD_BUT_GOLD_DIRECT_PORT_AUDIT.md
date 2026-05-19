
---

## P1-A implementation update — 2026-05-19

**Status:** partial

**Scope completed (ported):**
- `artifacts/rentrix/legacy-src/services/documents/DocumentEngine.ts` → `artifacts/rentrix/src/services/documents/DocumentEngine.ts`
- `artifacts/rentrix/legacy-src/services/documents/DocumentController.ts` → `artifacts/rentrix/src/services/documents/DocumentController.ts`
- `artifacts/rentrix/legacy-src/services/documents/DocumentRenderer.ts` → `artifacts/rentrix/src/services/documents/DocumentRenderer.ts`
- `artifacts/rentrix/legacy-src/services/documents/TableGenerator.ts` → `artifacts/rentrix/src/services/documents/TableGenerator.ts`
- `artifacts/rentrix/legacy-src/services/documents/types.ts` → `artifacts/rentrix/src/services/documents/types.ts`
- `artifacts/rentrix/legacy-src/services/documents/index.ts` → `artifacts/rentrix/src/services/documents/index.ts`
- `artifacts/rentrix/legacy-src/services/pdfService.ts` → `artifacts/rentrix/src/services/pdfService.ts`

**Exact files changed in this implementation:**
- `artifacts/rentrix/src/services/documents/DocumentEngine.ts`
- `artifacts/rentrix/src/services/documents/DocumentController.ts`
- `artifacts/rentrix/src/services/documents/DocumentRenderer.ts`
- `artifacts/rentrix/src/services/documents/TableGenerator.ts`
- `artifacts/rentrix/src/services/documents/types.ts`
- `artifacts/rentrix/src/services/documents/index.ts`
- `artifacts/rentrix/src/services/pdfService.ts`
- `artifacts/rentrix/OLD_BUT_GOLD_DIRECT_PORT_AUDIT.md`

**Blockers / deferred wiring:**
- Invoice/contract/receipt pages currently need dedicated data adapters to compose `PdfContextInput` safely from current query models without widening page responsibilities.
- Minimal safe exposure is complete at service layer; direct UI actions were intentionally deferred to a follow-up focused wiring PR.

## P1-A follow-up update — 2026-05-19 (wiring + Arabic rendering)

**Status:** completed

**Inspected pages/components before wiring:**
- `src/routes/_protected.invoices.tsx`
- `src/features/financials/financials-page.tsx`
- `src/features/financials/invoices/invoices-page.tsx`
- `src/features/financials/components/invoice-list-section.tsx`
- `src/features/financials/components/invoice-detail-section.tsx`
- `src/features/financials/receipts/receipt-detail-page.tsx`
- `src/features/contracts/ContractsListPage.tsx`
- `src/features/contracts/ContractDetailPage.tsx`
- `src/features/contracts/contractDocumentsShell.tsx`

**Button/action findings:**
- Existing receipt screen already had print action (`طباعة`) using browser print; preserved with no duplication.
- Contracts list had CSV export only; no existing PDF action.
- Contract detail had no PDF action; minimal `تصدير PDF` action was added there only.
- Invoice list/detail had no safe, complete context adapter for PDF service (tenant/unit/property joins across selected invoice context are incomplete at the current component boundaries), so no duplicate/unsafe button was added.

**Arabic rendering fix:**
- `DocumentRenderer` now detects Arabic text in document model payload.
- For Arabic content, renderer uses an RTL HTML print preview fallback (browser print flow) to avoid jsPDF Arabic glyph corruption/symbol output.
- Non-Arabic content keeps jsPDF generation path.
- Added minimal test coverage for Arabic detection logic.

**Exact files changed in follow-up:**
- `artifacts/rentrix/src/services/documents/DocumentRenderer.ts`
- `artifacts/rentrix/src/services/documents/DocumentRenderer.test.ts`
- `artifacts/rentrix/src/features/contracts/ContractDetailPage.tsx`
- `artifacts/rentrix/OLD_BUT_GOLD_DIRECT_PORT_AUDIT.md`
