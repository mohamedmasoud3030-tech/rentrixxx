# Rentrix Print and Export Readiness

This is a repository-only audit of current print, PDF, and CSV export support. It does not claim production readiness without authenticated browser QA, mobile print checks, and live payment evidence.

## Current Support Matrix

| Area | Current support | Evidence | Limitations |
| --- | --- | --- | --- |
| Receipt print | Supported through the receipt detail page. The page loads a payment-backed receipt projection and calls `globalThis.print()` from the print button. | `artifacts/rentrix/src/features/financials/receipts/receipt-detail-page.tsx` and `receiptService.ts` | Browser print only; no generated receipt PDF file; receipt detail ID is currently `payments.id`, not internal `receipts.id`. |
| Invoice PDF | A generic `exportInvoiceToPdf` helper exists through the document engine. | `artifacts/rentrix/src/services/pdfService.ts`, `DocumentController.ts`, `DocumentEngine.ts` | No verified active invoice-page button was found in this audit. Template uses generic English labels and does not include verified Arabic RTL PDF shaping evidence. |
| Contract PDF | Supported from contract detail with a `تصدير PDF` action that calls `exportContractToPdf`. | `artifacts/rentrix/src/features/contracts/ContractDetailPage.tsx`, `pdfService.ts` | Contract document shell explicitly remains a read-only wrapper for future documents and does not generate attachments or addenda PDFs. |
| Contract CSV | Supported from the contracts list. Filenames use the local-date helper. | `artifacts/rentrix/src/features/contracts/ContractsListPage.tsx`, `contractListExport.ts` | Exports the filtered visible list only. Filename is `rentrix-contracts-YYYY-MM-DD.csv`. |
| Reports CSV | Supported for financial summary, rent roll, overdue invoices, aged receivables, and daily collection. Filenames include a local-date suffix and exports include a UTF-8 BOM for Excel/Arabic compatibility. | `artifacts/rentrix/src/features/reports/reports-page.tsx` | CSV field order is sorted by object key. |
| Expense PDF | A generic `exportExpenseToPdf` helper exists. | `artifacts/rentrix/src/services/pdfService.ts`, `DocumentEngine.ts` | No verified active expense-page export button was found in this audit. |
| Accounting-style PDFs | Helpers exist for trial balance, income statement, and balance sheet. | `artifacts/rentrix/src/services/pdfService.ts` | These are not approval to build or expose a general ledger during stabilization. Treat as legacy/generic document service capability unless a reviewed product decision activates them. |

## PDF Lazy Loading

PDF rendering is intentionally lazy-loaded. `DocumentController.renderToPDF` builds the document model first, then dynamically imports `DocumentRenderer`, keeping jsPDF out of initial route chunks that only might export a PDF.

## CSV Filename Behavior

- Contract CSV filenames include a local date: `rentrix-contracts-YYYY-MM-DD.csv`.
- Reports CSV filenames include a local date: `financial-summary-YYYY-MM-DD.csv`, `rent-roll-YYYY-MM-DD.csv`, `overdue-invoices-YYYY-MM-DD.csv`, `aged-receivables-YYYY-MM-DD.csv`, and `daily-collection-YYYY-MM-DD.csv`.
- Reports CSV export includes a UTF-8 BOM for Excel/Arabic compatibility.

## Mobile Print Limitations

- Receipt printing depends on the browser or operating-system print sheet.
- Mobile browser print support varies by device and may require "Save to PDF" support from the platform.
- The app includes print-specific classes for receipt detail and app shell hiding, but no device-lab evidence exists in this repository-only audit.

## Missing or Unverified Documents

- Dedicated invoice print/export UI needs verification or implementation before release claims.
- Dedicated receipt PDF generation is missing; current support is browser print.
- Contract addenda, attachments, and signed contract package generation are not implemented.
- Reports PDF export is not implemented; current reports export is CSV only.
- Owner statements and advanced owner settlement documents are deferred.
- Lands, leads, commissions, communication, and CRM documents are deferred with their systems.

## Required QA Before Release

- Print a receipt from an authenticated payment-backed receipt route on desktop.
- Save the receipt print view as PDF from a supported browser.
- Export a contract PDF from a real contract detail page.
- Export contract CSV and reports CSV with Arabic data, commas, quotes, formula-prefix text, and RTL display names.
- Verify mobile receipt print behavior on at least one supported mobile browser.
- Confirm no general ledger/accounting PDFs are exposed as active product features during stabilization.
