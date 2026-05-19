
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
