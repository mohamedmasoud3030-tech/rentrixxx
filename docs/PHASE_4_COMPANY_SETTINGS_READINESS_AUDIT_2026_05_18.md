# Phase 4 Company Settings readiness audit — 2026-05-18

## Scope confirmation

This is a **docs-only Phase 4 readiness audit and implementation plan** for Company Settings. It does not implement Phase 4 runtime behavior.

Active phase context:

- Main active work remains **Phase 3 — i18n and direction foundation**.
- This audit is intentionally independent of unmerged Phase 3 PR 3 code.
- Phase 4 Company Settings implementation must not start until the Phase 3 completion report is accepted.
- If Phase 3 PR 3 changes shared i18n keys or resource structure, Phase 4 implementation should re-check those keys before coding.
- This report may be merged while Phase 3 continues only because it is docs-only and validation checks are green.

## Files and modules inspected

Primary plan and Phase 3 context:

- `docs/RENTRIX_MASTER_PLAN.md`
- `docs/PHASE_3_I18N_DIRECTION_AUDIT_2026_05_18.md`
- `artifacts/rentrix/src/lib/i18n.ts`

Company settings and formatting foundation:

- `artifacts/rentrix/src/features/settings/settings-page.tsx`
- `artifacts/rentrix/src/features/settings/settingsForm.ts`
- `artifacts/rentrix/src/features/settings/companySettingsService.ts`
- `artifacts/rentrix/src/features/settings/useCompanySettings.ts`
- `artifacts/rentrix/src/features/settings/settingsForm.test.ts`
- `artifacts/rentrix/src/features/settings/companySettingsService.test.ts`
- `artifacts/rentrix/src/features/settings/useCompanySettings.test.ts`
- `artifacts/rentrix/src/routes/_protected.settings.tsx`
- `artifacts/rentrix/src/lib/companySettings.ts`
- `artifacts/rentrix/src/lib/companyFormatters.ts`
- `artifacts/rentrix/src/lib/formatters.ts`

Supabase/schema/type path:

- `artifacts/rentrix/src/types/database.ts`
- `artifacts/rentrix/src/integrations/supabase/client.ts`
- `supabase/migrations/20260515120000_company_settings.sql`
- `supabase/migrations/` inventory for adjacent schema patterns and table availability.

## Master Plan Phase 4 baseline

`RENTRIX_MASTER_PLAN.md` defines Company Settings as customer-local configuration for branding, localization, and document output. The recommended defaults are:

- `default_language: ar`
- `default_currency: OMR`
- `country: OM`
- `timezone: Asia/Muscat`

The Phase 4 checklist is:

- Customer-local settings storage
- Company branding
- Default language
- Default currency
- Country and timezone
- Receipt/invoice settings foundation

The broader plan also states that contract/payment currency should default from company settings unless future schema supports per-contract currency.

## Current Company Settings state

### High-level status

The repository already contains a substantial persisted company settings foundation from earlier recovery work. In particular:

- A `company_settings` Supabase table migration exists.
- Generated/handwritten DB types include `company_settings`.
- A Supabase-backed settings service exists.
- React Query hooks exist for loading and updating settings.
- Settings form helpers exist for draft conversion, payload conversion, local settings conversion, validation, dirty-state comparison, and URL/email checks.
- SettingsPage already renders a company profile form and saves to the persisted table.
- Company money/date preview helpers already bridge company settings into centralized money/date formatting.

Because this task is not Phase 4 implementation, this report does not alter those files. Phase 4 should treat the existing code as the starting point rather than rebuild it.

### Audit checklist

| Area | Current status | Notes for Phase 4 |
| --- | --- | --- |
| Company name | Implemented in table, DB type, service defaults, draft, form, validation, update path. | Confirm final label/validation copy through Phase 3 i18n resources before changing UI copy. |
| Logo URL | Implemented as text URL field with safe http/https validation in settings form. | Logo upload/storage is not implemented and is out of scope for this audit. Phase 4 should decide whether URL-only is sufficient for v1. |
| Default language | Partially implemented through `locale` in persisted settings and `defaultLanguage` in local normalized settings. | Phase 4 should standardize the persisted setting contract: either keep `locale` as source and derive `ar/en`, or add explicit language only in a later schema-approved task. No migration in this audit. |
| Default currency | Implemented as `currency` in table/service/form and as normalized `defaultCurrency` in local settings. | Currency choices align with Phase 2 supported currencies, but persisted type is currently plain `string`; validation relies on UI options and normalization paths. |
| Country | Implemented as nullable text field in persisted settings and draft. | Master Plan recommended default uses `OM`, while migration/service defaults currently use `Oman`; Phase 4 should decide display value versus ISO code without breaking existing data. |
| Timezone | Implemented in table/service/form and defaults to `Asia/Muscat`. | UI options are intentionally small; expand only if required by product scope. |
| Receipt prefix | Implemented in table/service/form, required validation, default `REC`. | Needs downstream consumption audit before documents/receipts begin using it. |
| Invoice prefix | Implemented in table/service/form, required validation, default `INV`. | Needs downstream consumption audit before invoices/documents begin using it. |
| Contact details | Implemented fields include legal name, tax number, registration number, phone, email, address, city, and country. | These are not yet connected to document output in this audit. |
| Settings read path | Implemented through `getCompanySettings()` via Supabase `.from('company_settings').select('*').limit(1).maybeSingle()`. | Missing-row fallback returns safe defaults; errors surface through `handleSupabaseError`. |
| Settings write path | Implemented through `updateCompanySettings()` after loading current row and updating by `id`. | No insert/upsert path exists if the row is missing; this is acceptable for seeded migration but a Phase 4 risk to decide. |
| Validation/normalization layer | Implemented in service normalization and form validation helpers. | There are two setting shapes: persisted record/draft and `CompanyLocalSettings`; Phase 4 should preserve one conversion boundary and avoid duplicated validation in UI components. |
| Supabase table availability | Implemented by `20260515120000_company_settings.sql`. | Table has singleton constraint, seed row, RLS read/update for authenticated users, and `set_updated_at()` trigger usage. |
| Generated DB types availability | Implemented in `artifacts/rentrix/src/types/database.ts`. | Types use plain `string` for currency/locale/country; no generated enum constraints are present. |
| Runtime fallback when missing | Implemented at service level and local settings helper level. | `updateCompanySettings()` reads current settings first; if no row exists, update by default fallback id may fail unless the seed row exists. |
| Relation to Phase 3 i18n/direction | Phase 3 helpers exist in `i18n.ts` and reuse language utilities from `companySettings.ts`. SettingsPage is still hardcoded RTL/Arabic. | Phase 4 should consume Phase 3 language state, text direction, and shared labels only after Phase 3 is complete and keys are stable. |
| Relation to Phase 2 money/currency | `formatMoney()`, supported currency metadata, and company formatters exist. SettingsPage preview already uses company money formatting. | Phase 4 should use `formatCompanyMoney()` or a successor company settings provider instead of direct `Intl.NumberFormat` calls. |
| Risks before implementation | Moderate. Existing foundation is useful but has shape/default mismatches and UI/i18n concerns. | Resolve through small PRs; do not combine schema, UI, i18n, and downstream document consumption in one PR. |

## Existing storage, service, UI, and persistence path

### Storage and schema

The current migration creates `public.company_settings` with:

- Singleton record design via `singleton_key boolean not null default true`, a `check (singleton_key)`, and a unique constraint.
- Company identity/contact fields: `company_name`, `legal_name`, `tax_number`, `registration_number`, `phone`, `email`, `address`, `city`, and `country`.
- Localization/formatting fields: `currency`, `locale`, `timezone`, `date_format`, and `number_format`.
- Branding/document fields: `logo_url`, `invoice_prefix`, and `receipt_prefix`.
- Audit fields: `created_at` and `updated_at`.
- `company_settings_set_updated_at` trigger using `public.set_updated_at()`.
- Forced RLS with authenticated read/update policies.
- Seed singleton row with the fixed id `00000000-0000-4000-8000-000000000001`.

No new migration is needed to begin Phase 4 UI/service cleanup because the table already exists. Any future schema changes must be explicitly scoped and should not be bundled into the first implementation PR.

### Type availability

`Database['public']['Tables']['company_settings']` exists with `Row`, `Insert`, `Update`, and empty `Relationships`. The fields align with the migration. Currency, locale, country, and format fields are typed as `string`, not narrow application unions.

### Service status

`companySettingsService.ts` provides:

- `CompanySettingsRecord` from DB types.
- `CompanySettingsUpdatePayload` limited to editable fields.
- `DEFAULT_COMPANY_SETTINGS_ID`.
- A complete `defaultCompanySettings` record.
- Normalization helpers that trim primitive strings, allow primitive numbers/booleans by stringifying them, reject object stringification, preserve singleton invariants, and fallback required fields.
- `getCompanySettings()` read path with missing-row fallback.
- `updateCompanySettings()` write path that normalizes payloads and updates the current row by `id`.

Phase 4 implementation should preserve this service boundary. Presentational components should not query Supabase directly.

### Hook status

`useCompanySettings.ts` provides:

- Stable React Query keys: `['company-settings']` and detail key.
- `useCompanySettings()` for loading.
- `useUpdateCompanySettings()` for mutation and invalidation after save.

This is a good integration point for Phase 4. If Phase 4 introduces a provider/context for app-wide company settings, it should consume these hooks or their service equivalent rather than bypassing them.

### UI status

`settings-page.tsx` currently:

- Loads settings through `useCompanySettings()`.
- Maps the record to draft state.
- Renders a company profile form with company/contact/localization/document prefix fields.
- Validates before save and persists through `useUpdateCompanySettings()`.
- Shows money/date previews through `formatCompanyMoney()` and `formatCompanyDate()`.
- Keeps local-only user management and app preference cards on the page.
- Uses hardcoded Arabic strings and `dir="rtl"` wrappers.

Phase 4 should not treat this as blank slate. The readiness work needed is refinement and integration with Phase 3 i18n/direction foundation, not a new SettingsPage build.

### Helper and formatter status

`companySettings.ts` defines the local application settings shape and defaults:

- Supported languages: `ar`, `en`
- `DEFAULT_LANGUAGE = 'ar'`
- `DEFAULT_COUNTRY = 'OM'`
- `DEFAULT_TIMEZONE = 'Asia/Muscat'`
- `DEFAULT_RECEIPT_PREFIX = 'REC'`
- `DEFAULT_INVOICE_PREFIX = 'INV'`
- `CompanyLocalSettings`
- normalization for language, direction, locale, currency, country, timezone, and prefixes.

`companyFormatters.ts` bridges `CompanyLocalSettings` to:

- `getCompanyLocale()`
- `formatCompanyMoney()`
- `formatDefaultCompanyMoney()`
- `formatCompanyDate()`

`formatters.ts` supplies Phase 2 currency foundation:

- Supported currencies: `OMR`, `AED`, `SAR`, `QAR`, `KWD`, `BHD`, `USD`, `EGP`
- `DEFAULT_CURRENCY = 'OMR'`
- currency metadata with minor units
- currency normalization
- centralized `formatMoney()`.

Phase 4 should continue using these helpers and avoid direct money formatting in UI components.

## Gaps against Master Plan Phase 4

### Gap 1 — persisted language field is represented as locale, not explicit default language

The Master Plan says `default_language: ar`. The table and UI currently store `locale` values such as `ar-OM` and `en-OM`, while `CompanyLocalSettings` derives `defaultLanguage` from the locale prefix.

Recommended Phase 4 treatment:

1. Do not add a migration in the first Phase 4 PR.
2. Define a documented adapter rule: persisted `locale` remains the source for now, with `defaultLanguage = locale startsWith('en') ? 'en' : 'ar'`.
3. After Phase 3 is complete, decide whether explicit `default_language` is worth a later schema PR.

### Gap 2 — country default mismatch

The Master Plan recommends `country: OM`, while the migration and service default use `Oman`, and `CompanyLocalSettings` default uses `OM`.

Recommended Phase 4 treatment:

1. Decide whether the persisted field is a display country (`Oman`) or an ISO country code (`OM`).
2. If keeping display text, document conversion to local settings separately.
3. If moving to ISO code, do it in a dedicated schema/data compatibility PR only if explicitly approved.

### Gap 3 — SettingsPage is not yet wired to Phase 3 i18n/direction foundation

SettingsPage still uses hardcoded Arabic copy and local `dir="rtl"` wrappers. That was acceptable before Phase 3 completion, but Phase 4 implementation should consume Phase 3 helpers.

Recommended Phase 4 treatment:

1. Wait for Phase 3 completion report and stable i18n keys.
2. Use `getAppLanguageState()`, `translateSharedLabel()`, or the final Phase 3 API for shared labels and direction.
3. Keep Arabic as default and avoid breaking RTL UX.
4. Re-check Phase 3 PR 3 resource keys immediately before coding if it changes shared labels.

### Gap 4 — no app-wide company settings consumer contract yet

Company settings can be read and updated from SettingsPage, but downstream modules do not yet have a documented safe consumption pattern for company name, branding, language, currency, timezone, or prefixes.

Recommended Phase 4 treatment:

1. Add a small integration contract in code only after Phase 3 completion.
2. Prefer a hook/helper adapter that returns normalized local settings plus original persisted record when needed.
3. Keep downstream changes out of the first Phase 4 Settings PR unless explicitly scoped.

### Gap 5 — receipt/invoice prefixes exist but are not yet consumed by receipt/invoice numbering

The table and form include `receipt_prefix` and `invoice_prefix`, but this audit did not identify a canonical downstream consumption path in receipts/invoices. Per scope, this report did not touch Payments/Receipts, Reports, Accounting, PDF, Documents, or financial calculations.

Recommended Phase 4 treatment:

1. Keep prefix persistence/UI separate from financial document mutation behavior.
2. Plan downstream prefix consumption only when receipt/invoice generation or printable documents are explicitly in scope.
3. Do not change posted payment, receipt, invoice, or financial calculation behavior inside Company Settings PRs.

### Gap 6 — logo URL is stored, but branding output is not complete

The app can store a logo URL, and the form validates safe `http`/`https` URLs. There is no logo upload/storage implementation and no document/header rendering integration in this audit.

Recommended Phase 4 treatment:

1. Keep URL-only logo support in the first implementation pass.
2. Do not add upload/storage until explicitly scoped.
3. Use a safe URL helper if logo rendering is added later, preserving the existing validation rules.

### Gap 7 — update path assumes a seeded singleton row exists

`getCompanySettings()` returns in-memory defaults when no row exists. `updateCompanySettings()` then updates by the current settings id. If the database lacks the seed row, update can fail because there is no row to update.

Recommended Phase 4 treatment:

1. Confirm all environments have applied `20260515120000_company_settings.sql`.
2. If resilient missing-row writes are required, add an explicit upsert strategy in a dedicated service PR, not in this audit.
3. Keep tests for missing-row fallback and update behavior.

## Dependencies on Phase 3 i18n/direction foundation

Phase 3 currently provides a lightweight foundation in `artifacts/rentrix/src/lib/i18n.ts`:

- Shared Arabic/English resources for core labels.
- `getAppLanguageState()` returning language, locale, and direction.
- `translateSharedLabel()` with Arabic fallback.
- `applyDocumentLanguageDirection()` for `document.documentElement.lang` and `dir`.

It also imports language normalization/direction helpers from `companySettings.ts`, meaning the Company Settings and i18n foundations already share basic language concepts.

Phase 4 should use Phase 3 as follows:

1. Do not create a second i18n system inside SettingsPage.
2. Use Phase 3 supported language normalization for settings language choices.
3. Use Phase 3 direction output instead of hardcoding new `dir="rtl"` wrappers in newly refactored settings UI.
4. Keep Arabic as the default fallback.
5. Before implementation, re-check Phase 3 PR 3 if it changes shared i18n keys, resource namespaces, or translation helper names.
6. Do not wire document-level language changes from company settings until the product decision is explicit: saved company default language may not be identical to the current user/session language.

## Dependencies on Phase 2 money/currency foundation

Phase 2 currency foundation is already available and should remain the only money formatting path:

- `formatters.ts` owns supported currencies, default OMR behavior, currency metadata, minor units, and `formatMoney()`.
- `companyFormatters.ts` adapts company settings to money and date formatting.
- SettingsPage already uses `formatCompanyMoney()` for preview output.

Phase 4 implementation should:

1. Continue using `formatCompanyMoney()` or a normalized company settings adapter.
2. Avoid hardcoded `OMR` labels in UI components except inside centralized options/defaults.
3. Keep currency validation aligned with `supportedCurrencies` instead of duplicating lists long term.
4. Avoid exchange-rate conversion; v1 has no exchange-rate scope.
5. Avoid changing financial calculations or persisted financial amounts while adding settings consumption.

## Proposed Phase 4 PR sequence

### PR 4.1 — Settings readiness cleanup and adapter contract

Scope:

- Docs/code-light cleanup only after Phase 3 completion.
- Create or refine a normalized settings adapter that clearly maps persisted `CompanySettingsRecord` to `CompanyLocalSettings`.
- Centralize settings option constants if needed, reusing `supportedCurrencies` and Phase 3 supported languages.
- Add focused tests for locale-to-language, currency normalization, country/default handling, and prefix fallback.

Do not include:

- Schema migrations.
- SettingsPage visual redesign.
- Downstream financial/document behavior changes.

### PR 4.2 — SettingsPage i18n/direction integration

Scope:

- Replace hardcoded shared/common SettingsPage labels with Phase 3 i18n resources after Phase 3 completion.
- Use the finalized Phase 3 direction API for page/form direction where appropriate.
- Preserve Arabic default labels and RTL behavior.
- Keep the persisted form fields already present; do not add logo upload.

Do not include:

- Dashboard, documents, receipts, accounting, reports, WhatsApp, or PDF changes.
- New schema.

### PR 4.3 — Settings validation and UX hardening

Scope:

- Tighten validation at helper level only: currency must be supported, locale/language must be supported, prefixes trimmed and non-blank, logo URL must remain safe `http`/`https`.
- Add tests for invalid currency/locale/prefix/logo cases.
- Keep presentational components thin and service logic outside UI.

Do not include:

- Behavioral changes outside Settings.
- Upload/storage implementation.

### PR 4.4 — Company settings consumer foundation

Scope:

- Add a small read-only consumption pattern for normalized company settings to be used by future modules.
- Document whether this is per-session/user-facing language or company default language.
- Add tests for missing settings fallback and loading/error states.

Do not include:

- Receipt/invoice numbering changes.
- Financial calculations.
- Printable document integration.

### PR 4.5 — Branding/read-only display integration, if approved

Scope:

- Use company name/logo URL in safe read-only shell or settings preview locations only if explicitly approved.
- Validate safe logo rendering and fallback behavior.

Do not include:

- Logo upload/storage.
- PDF/document output changes.

### Later separate PRs — downstream consumption when those phases are active

Only when explicitly scoped in later phases:

- Apply company settings to printable documents.
- Apply receipt/invoice prefixes to document generation.
- Apply default currency to new contract/payment creation if no per-contract currency exists.
- Apply timezone/date formats to reports and exports.

These should not be part of Phase 4's initial Settings readiness implementation because they touch financial/document/reporting domains.

## Risks and notes before implementation

- **Phase 3 dependency risk:** SettingsPage i18n should not be coded until Phase 3 completion report is accepted. If Phase 3 PR 3 changes shared i18n keys, re-check before coding.
- **Default mismatch risk:** `country` currently has both `OM` and `Oman` defaults across local and persisted layers.
- **Language shape risk:** persisted `locale` and local `defaultLanguage` are related but not identical.
- **Seed-row risk:** write path assumes the singleton row exists in the database.
- **Type strictness risk:** DB types use broad strings for currency/locale/timezone, so application validation must remain strong.
- **Scope creep risk:** Logo upload, receipt/invoice numbering, printable documents, financial defaults, and dashboard/report formatting are tempting but should remain out of the first Phase 4 PRs.
- **Existing UI risk:** SettingsPage includes local-only user management/app preference cards next to company settings. Phase 4 should avoid broad account/admin redesign unless explicitly requested.
- **Financial safety risk:** Currency settings must not retroactively mutate historical financial amounts or calculations.

## What was intentionally not changed

This audit intentionally did **not** change:

- Runtime behavior.
- SettingsPage UI.
- Settings form fields.
- Logo upload or storage.
- Supabase schema or migrations.
- Generated DB types.
- i18n/direction helpers.
- money/currency helpers.
- Dashboard.
- Properties/Units.
- Tenants.
- Payments/Receipts.
- Reports.
- Accounting.
- PDF/print/documents.
- Communications or WhatsApp.
- Legacy source imports or routing architecture.

## Validation plan for this docs-only PR

Requested validation commands:

```bash
pnpm --filter ./artifacts/rentrix run typecheck
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix run build
pnpm --filter ./artifacts/rentrix run lint
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
git diff --check
rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true
```
