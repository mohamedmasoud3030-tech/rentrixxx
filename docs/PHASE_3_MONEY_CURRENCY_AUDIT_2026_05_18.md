# Phase 3 Money/Currency Foundation Audit — 2026-05-18

This is PR 1 for the Money/Currency Foundation phase. It is documentation-only and does not change runtime behavior, financial calculations, schema, RPCs, payment posting, receipts, reports, PDF generation, or communications.

## Phase goals

- Use centralized money formatting.
- Support OMR, AED, SAR, QAR, KWD, BHD, USD, and EGP.
- Keep OMR as the default currency.
- Avoid plain monetary numbers without currency context.
- Ensure CSV exports that include money include currency.
- Do not add exchange-rate conversion in v1.

## Current inventory

### `artifacts/rentrix/src/lib/formatters.ts`

Current state:

- `supportedCurrencies` already includes all required currencies.
- `DEFAULT_CURRENCY` is `OMR`.
- `DEFAULT_LOCALE` is `ar`.
- `normalizeCurrency` falls back to OMR for unsupported values.
- `formatMoney` delegates to `Intl.NumberFormat` with currency style.

Gap:

- Currency metadata is not explicit yet. We still need a single metadata source for labels and minor-unit precision.
- Tests should lock all supported currencies and precision behavior.

### `artifacts/rentrix/src/lib/companyFormatters.ts`

Current state:

- `formatCompanyMoney` normalizes company-local settings and delegates to `formatMoney`.
- Locale is derived from the company language helper.

Gap:

- This is useful for the later company settings phase, but Phase 3 should not expand the Settings UI.

### `artifacts/rentrix/src/features/contracts/contractListExport.ts`

Current state:

- Contract CSV export includes rent and currency columns.
- Rent is formatted through `formatMoney`.
- Currency uses the current default.

Gap:

- Per-contract currency is not supported. That is acceptable for v1 until schema direction changes.

### `artifacts/rentrix/src/features/contracts/contractPaymentsTab.tsx`

Current state:

- Uses the centralized money formatter through a local helper.
- Displays invoice, payment, paid, and remaining values with currency.
- Scope is read-only and contract-scoped.

Gap:

- Local money helper can later be replaced or aligned after formatter metadata hardening.

### High-priority surfaces for the next inventory pass

Inspect these before applying money changes:

- `artifacts/rentrix/src/features/contracts/ContractDetailPage.tsx`
- `artifacts/rentrix/src/features/contracts/ContractsListPage.tsx`
- `artifacts/rentrix/src/features/financials/components/financials-formatters.ts`
- `artifacts/rentrix/src/features/financials/components/invoice-list-section.tsx`
- `artifacts/rentrix/src/features/financials/components/invoice-detail-section.tsx`
- `artifacts/rentrix/src/features/financials/components/receipts-section.tsx`
- `artifacts/rentrix/src/features/financials/components/receipt-detail-card.tsx`
- `artifacts/rentrix/src/features/financials/components/expenses-section.tsx`
- `artifacts/rentrix/src/features/financials/components/arrears-summary-cards.tsx`
- `artifacts/rentrix/src/features/financials/components/arrears-aging-buckets.tsx`
- `artifacts/rentrix/src/features/reports/reports-page.tsx`
- `artifacts/rentrix/src/app/dashboard-page.tsx`

## Risks

1. Some screens may still render monetary numbers through local helpers or raw interpolation.
2. Default OMR behavior is acceptable for v1, but it should remain centralized.
3. Minor-unit precision is currently implicit via `Intl.NumberFormat`.
4. Parsing form input into safe money numbers needs its own helper layer.
5. Exchange rates are out of scope.

## Recommended Phase 3 PR sequence

### PR 2 — Currency metadata and helper hardening

- Add or refine a single currency metadata source.
- Include currency code, Arabic label, English label, and minor units.
- Preserve current supported currency array and OMR default.
- Add focused tests for all supported currencies.

### PR 3 — Money parsing and normalization helpers

- Add safe helpers for unknown and form string values.
- Preserve existing financial behavior.
- Add tests for invalid, missing, decimal, and string numeric values.

### PR 4 — Apply helpers to active display surfaces

- Replace plain money display where safe.
- Start with contracts and existing CSV exports.
- Keep display-only.

### PR 5 — Phase completion report

- Add representative currency regression coverage.
- Document remaining work for company settings, future per-contract/per-invoice currency, ledger currency handling, receipt/PDF formatting, and exchange rates.

## Explicitly not changed

- No runtime code.
- No schema or migrations.
- No financial calculations.
- No payment or receipt mutation flow.
- No report rebuild.
- No accounting workflow.
- No PDF/document workflow.
- No communications workflow.
