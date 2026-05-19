# OLD BUT GOLD — Direct Port Audit (P1-A)

## Status
- P1-A PDF/Print Engine: **Completed**
- Arabic-safe rendering: **Completed** (RTL browser print fallback retained)
- Safe UI entry point: **Completed** (single contract detail action)
- Sonar duplication follow-up: **Completed** (helper extraction refactor)
- Invoice/receipt UI wiring: **Deferred intentionally** pending safe complete context

## Inspected Surfaces
- src/routes/_protected.invoices.tsx
- src/features/financials/financials-page.tsx
- src/features/financials/invoices/invoices-page.tsx
- src/features/financials/components/invoice-list-section.tsx
- src/features/financials/components/invoice-detail-section.tsx
- src/features/financials/receipts/receipt-detail-page.tsx
- src/features/contracts/ContractsListPage.tsx
- src/features/contracts/ContractDetailPage.tsx
- src/features/contracts/contractDocumentsShell.tsx
