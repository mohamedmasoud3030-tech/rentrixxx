# Phase 3 i18n and Direction Foundation Audit — 2026-05-18

This is Phase 3 / PR 1 for the i18n and direction foundation sequence. It is documentation-only and does not change runtime behavior, routing, settings UI, schema, financial calculations, payment or receipt mutations, reports, PDF/document generation, communications, WhatsApp, dashboard, accounting, properties/units, tenants, or legacy code.

## Required pre-coding scope declaration

### Active phase

- **Phase 3 — i18n and direction foundation** from `docs/RENTRIX_MASTER_PLAN.md`.
- Phase 4 Company Settings is intentionally **not started** in this PR.

### Files/modules inspected first

- App/root/layout shell:
  - `artifacts/rentrix/index.html`
  - `artifacts/rentrix/src/index.tsx`
  - `artifacts/rentrix/src/App.tsx`
  - `artifacts/rentrix/src/app/providers.tsx`
  - `artifacts/rentrix/src/app/router.tsx`
  - `artifacts/rentrix/src/routes/__root.tsx`
  - `artifacts/rentrix/src/routes/_protected.tsx`
  - `artifacts/rentrix/src/routeTree.ts`
  - `artifacts/rentrix/src/layouts/app-shell.tsx`
  - `artifacts/rentrix/src/styles/globals.css`
- Existing language, locale, and company-settings helpers:
  - `artifacts/rentrix/src/lib/companySettings.ts`
  - `artifacts/rentrix/src/lib/companyFormatters.ts`
  - `artifacts/rentrix/src/lib/formatters.ts`
  - `artifacts/rentrix/src/features/settings/companySettingsService.ts`
  - `artifacts/rentrix/src/features/settings/settingsForm.ts`
  - `artifacts/rentrix/src/features/settings/useCompanySettings.ts`
- Shared UI components:
  - `artifacts/rentrix/src/components/empty-state.tsx`
  - `artifacts/rentrix/src/components/loading-state.tsx`
  - `artifacts/rentrix/src/components/error-boundary.tsx`
  - `artifacts/rentrix/src/components/shared/DataTable.tsx`
  - `artifacts/rentrix/src/components/shared/FormActions.tsx`
  - `artifacts/rentrix/src/components/ui/status-badge.tsx`
- Newly refactored commercial screens for hardcoded Arabic inventory only:
  - `artifacts/rentrix/src/features/financials/**`
  - `artifacts/rentrix/src/features/contracts/**`

### Exact PR 1 scope

- Inventory the current i18n, translation, locale, language, and RTL/LTR direction state.
- Identify existing direction defaults and hardcoded RTL assumptions.
- Identify whether a translation layer exists in the current `src` app.
- Identify locale helper touchpoints that can later consume Company Settings without starting Phase 4.
- Inventory hardcoded Arabic strings in the newly refactored commercial surfaces at a file/category level.
- Produce this checklist/report as the only changed artifact.

### Intentionally not changed

- No runtime behavior change.
- No translation resources added yet.
- No i18n provider wiring yet.
- No mass label migration.
- No SettingsPage changes.
- No Company Settings UI/storage work.
- No schema/Supabase migrations.
- No payment/receipt mutations.
- No report rewrite.
- No dashboard rebuild.
- No accounting/ledger work.
- No PDF/document generation.
- No communications/WhatsApp work.
- No `legacy-src` edits.
- No forbidden architecture imports or migrations to `useApp`, `AppContext`, `dataService`, local DB flows, or `react-router-dom`.

## Current i18n and translation-layer inventory

### Current `src` app

- `i18next` and `react-i18next` are installed in `artifacts/rentrix/package.json`, but the current `artifacts/rentrix/src` application has no active i18n initializer, provider, translation resources, or `useTranslation` usage.
- There is no `artifacts/rentrix/src/i18n` or `artifacts/rentrix/src/locales` directory.
- Route titles, navigation labels, shell labels, shared error/loading labels, and commercial-screen copy are currently direct Arabic literals.

### Legacy reference only

- `artifacts/rentrix/legacy-src/i18n/index.ts` configures `i18next` with Arabic and English `common` resources.
- `artifacts/rentrix/legacy-src/locales/ar/common.json` and `artifacts/rentrix/legacy-src/locales/en/common.json` exist.
- These legacy files were inspected only as reference. They must not be imported by the current app and were not edited.

## Current language and locale helper inventory

### `artifacts/rentrix/src/lib/companySettings.ts`

Current state:

- Defines `supportedLanguages = ['ar', 'en']`.
- Defines `SupportedLanguage` and `TextDirection`.
- Defines `DEFAULT_LANGUAGE = 'ar'`.
- Normalizes unknown language values back to Arabic.
- Provides `getLanguageDirection(language)`, currently mapping Arabic to `rtl` and everything normalized to English to `ltr`.
- Provides `getLanguageLocale(language)`, currently returning normalized `ar` or `en` rather than full regional locales like `ar-OM` or `en-US`.

Gap:

- These helpers are useful for Phase 3, but they are not yet wired into the root document, shell, toaster, or route metadata.
- `getLanguageLocale` is minimal and does not yet distinguish app language (`ar`/`en`) from formatting locale (`ar-OM`/`en-US` or future company settings values).

### `artifacts/rentrix/src/lib/formatters.ts`

Current state:

- Defines `DEFAULT_LOCALE = 'ar'`.
- `formatMoney` accepts a caller-provided `locale` and defaults to Arabic.
- Currency formatting uses `Intl.NumberFormat` and does not hardcode OMR in the UI when the helper is used.

Gap:

- The default locale is Arabic-only and not connected to an app-level language context.
- Date/time formatting is not centralized in the same way.

### `artifacts/rentrix/src/lib/companyFormatters.ts`

Current state:

- `getCompanyLocale(settings)` derives locale from `settings.defaultLanguage` via `getLanguageLocale`.
- `formatCompanyMoney(settings, amount)` applies settings-derived currency and locale.
- `formatCompanyDate(settings, value)` uses `toLocaleDateString(getCompanyLocale(settings))`.

Gap:

- This is ready to consume normalized company settings later, but it is not part of a global app locale/direction provider yet.
- Regional formatting values from the persisted `company_settings.locale` and `company_settings.number_format` fields are not yet the source of truth for app-level formatting.

### Company Settings modules inspected without Phase 4 work

Current state:

- `companySettingsService` has default persisted-setting fallback values: `locale: 'ar-OM'`, `number_format: 'ar-OM'`, `currency: 'OMR'`, and `timezone: 'Asia/Muscat'`.
- `settingsForm.companySettingsDraftToLocalSettings` maps draft locales starting with `en` to `defaultLanguage: 'en'`; otherwise it preserves Arabic.
- Settings tests exist for service, form, and hook behavior.

Gap:

- Phase 4 will decide how the app shell consumes persisted settings. Phase 3 should only add a small helper layer that can be called by Phase 4 later.
- SettingsPage itself should remain untouched until Phase 4 unless a future Phase 3 task finds an integration-breaking issue.

## Current root, shell, and direction handling

### Document/root defaults

Current state:

- `artifacts/rentrix/index.html` sets `<html lang="ar" dir="rtl">`.
- `artifacts/rentrix/src/styles/globals.css` sets `html { direction: rtl; font-family: var(--font-sans); }`.
- `artifacts/rentrix/src/routes/__root.tsx` renders `Toaster` with `dir="rtl"` and a left-side position.

Gap:

- Root document language/direction is static Arabic/RTL.
- There is no current app-level effect that sets `document.documentElement.lang` or `document.documentElement.dir` from normalized app language.
- Toaster direction is static RTL.

### App shell layout

Current state:

- `AppShell` wraps the protected shell with `dir="rtl"`.
- Sidebar placement is hardcoded on the right using `right-0`, `border-l`, and content padding classes such as `lg:pr-72` / `lg:pr-20`.
- Header breadcrumbs use Arabic copy and a left-pointing chevron.
- User email is intentionally rendered with `dir="ltr"`.
- Sync timestamp uses `new Date(lastSyncedAt).toLocaleTimeString('ar')`.

Gap:

- Direction is not computed from a locale/direction helper.
- Sidebar placement uses physical right/left utilities, so full LTR shell support will need a careful later layout pass. Phase 3 PR 2 should not rewrite the shell; it should expose helpers and make future wiring possible.
- Timestamp locale should eventually consume app/company locale instead of hardcoded `ar`.

### Routes and titles

Current state:

- `routeTree.ts` defines `staticData.title` as Arabic literals for all routes.
- `AppShell` reads these route titles directly for document title, breadcrumbs, and page heading.

Gap:

- Route metadata has no translation keys or language-aware title resolver.
- PR 3 can safely target shared/core route labels if a small helper exists, but mass route churn should be avoided.

## Shared UI component inventory

- `EmptyState` accepts caller-provided labels; it has no internal Arabic literals.
- `RouteLoadingState` contains an Arabic `aria-label` (`جار التحميل`).
- `RouteErrorFallback` contains Arabic title, description, and retry button labels.
- `DataTable` uses `text-right`, which is an RTL-biased physical text alignment. It should eventually become direction-aware or use logical/default alignment where practical.
- `FormActions` accepts caller-provided labels; it has no internal Arabic literals.
- `StatusBadge` has no labels; callers provide translated content.

## Hardcoded Arabic inventory in newly refactored commercial screens

This audit intentionally limits the commercial-screen inventory to active/refactored Contracts and Financials/Arrears/Invoices/Receipts surfaces. Dashboard, Properties/Units, Tenants, Payments/Receipts mutation flows, Reports rewrite, Accounting, PDF, Communications, WhatsApp, and SettingsPage are not being started.

### Financials / arrears / invoices / receipts

Files with hardcoded Arabic lines detected under `artifacts/rentrix/src/features/financials` include:

- `components/overdue-invoices-table.tsx` — 21 matching lines.
- `receipts/receipt-detail-page.tsx` — 19 matching lines.
- `reports/financialReportsService.test.ts` — 19 matching lines in test fixtures/assertions.
- `components/receipt-detail-card.tsx` — 15 matching lines.
- `components/quick-payment-form.tsx` — 13 matching lines.
- `components/expenses-section.tsx` — 11 matching lines.
- `components/invoice-detail-section.tsx` — 11 matching lines.
- `components/financial-reports-preview-section.tsx` — 10 matching lines.
- `components/receipts-section.tsx` — 10 matching lines.
- `components/invoice-list-section.tsx` — 9 matching lines.
- Smaller occurrences are present in invoice filters/workspace/summary cards, arrears workspace/filters/summary/aging/workflow files, status label helpers, hooks, and service error messages.

Recommended treatment:

- Do not mass-convert all labels in one PR.
- Start with shared/core labels and small label maps in PR 3 after PR 2 establishes helpers/resources.
- Keep service error strings Arabic by default until a safe error-message translation convention exists.
- Avoid changing payment/receipt mutation behavior while translating labels.

### Contracts

Files with hardcoded Arabic lines detected under `artifacts/rentrix/src/features/contracts` include:

- `ContractDetailPage.tsx` — 63 matching lines.
- `ContractsListPage.tsx` — 50 matching lines.
- `contractPaymentsTab.tsx` — 33 matching lines.
- Tests and helpers also include Arabic expectations and labels: `ContractDetailPage.test.tsx`, `contractSchema.ts`, `ContractFormPage.tsx`, `contractListExport.ts`, `contractDocumentsShell.tsx`, `useContracts.ts`, and related tests.

Recommended treatment:

- Treat Contracts as a high-value later target because copy is dense and user-facing.
- For Phase 3 PR 3, only translate safe shared/core labels or small stable label maps. Avoid a broad contract page rewrite.
- Preserve existing Arabic default strings and RTL layout while adding English fallback support.

## Phase 3 PR 2 recommendation — lightweight i18n/direction foundation

Add or refine a very small helper/resource layer in `artifacts/rentrix/src`, preferably without yet wiring SettingsPage or persisted settings:

- `src/lib/i18n` or `src/i18n` with:
  - Supported app languages: `ar`, `en`.
  - Arabic default.
  - English fallback.
  - `getTextDirection(language): 'rtl' | 'ltr'` using `ar => rtl`, `en => ltr`.
  - `normalizeAppLanguage(value)` preserving Arabic fallback.
  - `getAppLocale(language)` with a clear path to regional/company locale later.
- Minimal resources for shared/core labels only, for example:
  - loading/retry/error labels,
  - navigation/core shell labels,
  - generic actions such as save/cancel/back/retry,
  - common status/empty-state words where reused.
- Optional focused tests for language normalization, direction mapping, fallback behavior, and Arabic default.

Do not add a full app-wide translation migration in PR 2.

## Phase 3 PR 3 recommendation — apply foundation narrowly

After PR 2 exists and passes validation:

- Apply translations only to shared/core labels where safe.
- Candidate safe surfaces:
  - `RouteLoadingState` aria label.
  - `RouteErrorFallback` title/description/retry label.
  - App shell navigation labels if this can be done without physical LTR layout rewrite.
  - Small route-title helper if the change stays bounded.
- Avoid huge copy churn in Contracts and Financials.
- Avoid SettingsPage unless only consuming a neutral app-locale helper without starting Phase 4.

## Deferred to Phase 4 Company Settings

- Persisted settings as the live source for app language/direction.
- Settings UI changes for default language selection.
- Applying persisted `company_settings.locale`, `number_format`, `timezone`, or currency as global formatting sources.
- Company branding integration in the shell.
- Any broader settings workflow changes.

## Risks and guardrails

1. Static `dir="rtl"` values currently keep Arabic UX stable; changing them globally without layout readiness could regress sidebar placement and spacing.
2. Physical Tailwind utilities (`right-0`, `border-l`, `pr-*`, `text-right`) mean English/LTR support should be enabled gradually rather than through a single global flip.
3. The current app has i18n dependencies installed but no active current-app i18n runtime. PR 2 should choose a deliberately small pattern rather than reviving legacy architecture wholesale.
4. Legacy i18n resources may be useful as reference but must not be imported from `legacy-src`.
5. Tests contain Arabic fixture text; translation work should not rewrite tests unless the related runtime labels are intentionally changed.

## PR 1 checklist

- [x] Inventory current translation layer state.
- [x] Inventory current language/default helpers.
- [x] Inventory direction handling in document/root/shell/shared UI.
- [x] Inspect company settings helpers without starting Phase 4.
- [x] Identify hardcoded Arabic strings in newly refactored commercial screens at file/category level.
- [x] Define PR 2 and PR 3 safe next steps.
- [x] Document what is deferred to Phase 4.
- [x] Avoid runtime code changes.
