# Phase 4 Company Settings completion report — 2026-05-18

## 1. Executive confirmation

- **Phase 4 status:** Complete within the approved Phase 4 Company Settings scope.
- **Phase 5 status:** Phase 5 Dashboard can start after this report is reviewed, because the remaining Phase 4 items are intentional deferrals owned by later phases rather than Phase 4 blockers.
- **Blockers:** No Phase 4 blocker remains in the inspected code state.
- **Scope guard:** This report is verification-only. It does not start Phase 5, Dashboard implementation, Properties/Units work, Payments/Receipts work, Reports rewrite, Accounting/Ledger work, PDF/Documents work, Communications/WhatsApp work, schema migrations, dependency changes, package changes, or CI changes.
- **Code-change confirmation:** No runtime code was changed for this report. The only repository change is this completion report document.
- **PR #527 confirmation:** PR #527 was intentionally ignored and not touched.

## 2. Phase 4 checklist status

| Checklist item | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Customer-local settings storage | Complete | The Master Plan requires customer-local company settings, and the current migration creates `public.company_settings` with a singleton constraint, RLS, updated-at trigger, and a seeded row. | The v1 isolation model remains per-customer Supabase project/environment; no cross-company shared tenant model was introduced. |
| Company branding | Complete | Persisted fields include company name, legal/company contact fields, and `logo_url`; SettingsPage renders the saved company profile and a branding/document preview. | Branding is URL-only for logo; upload/storage is deferred. |
| Default language | Complete within approved scope | The Master Plan recommends `default_language: ar`; current runtime derives `defaultLanguage` from persisted `locale` through the normalized contract. | No explicit `default_language` column was added; a schema migration is deferred pending approval. |
| Default currency | Complete | The migration, service defaults, SettingsPage options, and normalized contract all support a persisted default currency, defaulting to `OMR`. | No exchange rates or per-record currency behavior were introduced. |
| Country | Complete | The migration and types include `country`; normalization maps display/legacy values such as `Oman` to supported ISO-style codes including `OM`. | The persisted schema remains text for backward compatibility. |
| Timezone | Complete | The migration, service defaults, SettingsPage options, and normalized contract include `timezone`, defaulting to `Asia/Muscat`. | Company-aware date formatting uses the normalized timezone. |
| Receipt prefix foundation | Complete | The migration, service defaults, SettingsPage form, and normalized contract include `receipt_prefix`, defaulting to `REC`. | Receipt generation/numbering is intentionally deferred to Payments/Receipts/Documents phases. |
| Invoice prefix foundation | Complete | The migration, service defaults, SettingsPage form, and normalized contract include `invoice_prefix`, defaulting to `INV`. | Invoice generation/numbering is intentionally deferred to Payments/Receipts/Documents phases. |
| SettingsPage persistence | Complete | SettingsPage loads through `useCompanySettings()`, maps the row to a draft, validates, saves through `useUpdateCompanySettings()`, and resets local draft state from the saved row. | The write path updates the singleton row by id; no upsert was introduced. |
| SettingsPage normalized options | Complete | SettingsPage options are sourced from supported currency, locale, country, and timezone constants. | The page remains Arabic-first and preserves RTL behavior while reacting to the selected company language. |
| Settings preview | Complete | SettingsPage renders a branding/document preview with company details, logo preview/fallback, language, currency, country, timezone, invoice/receipt prefixes, date preview, and money preview. | Preview is display-only and does not create documents. |
| Safe logo URL handling | Complete | Validation and normalization accept only safe `http`/`https` URLs; unsafe or invalid logo URL values normalize to `null` and previews use the normalized value. | No storage/upload path exists. |
| Normalized runtime settings contract | Complete | `CompanySettingsContract` exposes normalized company name, logo URL, default language, currency, country, timezone, prefixes, locale, and direction; persisted rows are adapted through `companySettingsRecordToContract()`. | Invalid/missing persisted values fall back to defaults. |
| Downstream display-only consumers | Complete | Contract list/detail screens consume the normalized settings contract for read-only rent, date, timestamp, day-count, and summary display. | Mutations, exports, generated documents, receipt/invoice numbering, and financial calculations remain deferred. |
| Company-aware money formatting | Complete | `formatCompanyMoney()` normalizes settings and calls the centralized `formatMoney()` with normalized currency and locale; contract screens consume it through contract display formatters. | No financial amounts or calculations were changed. |
| Company-aware date formatting | Complete | `formatCompanyDate()` normalizes settings and formats dates with normalized locale and timezone; contract screens consume it through contract display formatters. | Report/dashboard localization remains deferred. |

## 3. Completed PRs

| PR | What it added | Files/areas affected | Why it fits Phase 4 |
| --- | --- | --- | --- |
| #521 readiness audit | Documented the Phase 4 baseline, existing company settings foundation, gaps, risks, proposed PR sequence, validation plan, and forbidden scope. | `docs/PHASE_4_COMPANY_SETTINGS_READINESS_AUDIT_2026_05_18.md` plus inspection of settings, formatting, i18n, DB types, and migration paths. | Established the Company Settings implementation plan without runtime changes. |
| #522 normalized settings contract | Normalized the company settings runtime contract for language, direction, locale, currency, country, timezone, prefixes, and safe logo URL fallback. | `artifacts/rentrix/src/lib/companySettings.ts`, `artifacts/rentrix/src/lib/companySettings.test.ts`, formatter-related helpers. | Converted persisted/partial values into a safe Phase 4 contract usable by UI and future consumers. |
| #523 SettingsPage wiring | Wired SettingsPage to the normalized contract, persisted draft/payload conversion, normalized options, validation, and company-aware preview formatting. | `artifacts/rentrix/src/features/settings/settings-page.tsx`, `settingsForm.ts`, settings tests, hooks/service touchpoints. | Completed the settings edit/read path in the Phase 4 UI while preserving service boundaries. |
| #524 branding/document settings preview | Added the safe branding/document preview for company identity, logo URL/fallback, default language/currency/country/timezone, prefixes, contact details, and formatting examples. | `settings-page.tsx`, `settingsForm.ts`, settings form tests. | Delivered Phase 4 branding visibility without entering document/PDF generation scope. |
| #526 safe downstream consumers | Added/adopted the row-to-contract adapter and hooked safe display-only consumers into company-aware money/date formatting. | `useCompanySettings.ts`, `companySettingsContractAdapter.ts`, `ContractsListPage.tsx`, `ContractDetailPage.tsx`, `contractDisplayFormatters.ts`, related tests. | Proved downstream consumption can use normalized company settings safely without altering calculations or generated artifacts. |
| #528 Sonar cleanup | Cleaned post-merge Sonar concerns after #526 without expanding Phase 4 behavior. | Small quality-only cleanup in the Phase 4 touched areas. | Kept the Phase 4 implementation reviewable and compliant without adding new product scope. |

## 4. Current implementation state

### Persisted read path

`getCompanySettings()` reads `company_settings` from Supabase with `.select('*').limit(1).maybeSingle()`. If Supabase returns an error, it is surfaced through `handleSupabaseError()`. If no row exists, the service returns an in-memory default record. Returned rows are normalized by `normalizeCompanySettingsRecord()` before the UI consumes them.

### Save/update path

`updateCompanySettings()` first calls `getCompanySettings()` to identify the current singleton row, normalizes the update payload with `normalizeCompanySettingsUpdatePayload()`, updates `company_settings` by `id`, selects the saved row, and normalizes it before returning. `useUpdateCompanySettings()` wraps this service in a React Query mutation and invalidates the `company-settings` query key on success.

### Missing/invalid fallback behavior

- Missing row: `getCompanySettings()` returns the default in-memory record.
- Missing or invalid runtime values: `normalizeCompanySettingsContract()` falls back to `Rentrix`, `ar-OM`, `ar`, `rtl`, `OMR`, `OM`, `Asia/Muscat`, `REC`, `INV`, and `null` logo URL as appropriate.
- Invalid persisted service values: `normalizeCompanySettingsRecord()` applies safe string cleanup, currency normalization, locale normalization, country normalization, timezone normalization, logo URL normalization, and singleton enforcement.

### Locale, language, direction, and setting normalization

- Persisted `locale` is the current language source. `languageFromCompanyLocale()` maps values starting with `en` to `en`; all other invalid/missing values default to Arabic.
- `normalizeCompanyLocale()` accepts supported company locales and otherwise returns `en-OM` for English or `ar-OM` by default.
- `getLanguageDirection()` maps Arabic to `rtl` and English to `ltr`.
- Currency normalizes through the centralized currency helper, defaulting to `OMR`.
- Country normalizes to supported codes and maps legacy/display aliases like `Oman` to `OM`.
- Timezone normalizes to supported timezones and defaults to `Asia/Muscat`.
- Invoice and receipt prefixes trim/fallback through the normalized contract and service required-field cleanup.
- Logo URL is normalized through the URL parser and only `http:` or `https:` URLs are retained.

### SettingsPage consumption

SettingsPage loads the persisted row through `useCompanySettings()`, converts it to a draft with `companySettingsRecordToDraft()`, renders configured select/input fields from supported option constants, validates with `validateCompanySettingsDraft()`, converts draft to payload with `companySettingsDraftToPayload()`, saves through `useUpdateCompanySettings()`, then resets the baseline and draft from the saved normalized row. It derives `pageLanguage` from the draft's normalized default language, uses it for page `dir` and `lang`, and renders preview money/date examples through company-aware formatters.

### Contract screen consumption

Contract list/detail screens call `useCompanySettingsContract()` and pass the normalized contract into contract display formatters. The list page uses company-aware money/date formatting for visible rent summary, table dates, table rent, and card rent/date displays. The detail page uses the same normalized contract for details, lifecycle descriptions, financial timeline entries, date-time display, and renewal context. This downstream consumption is display-only.

## 5. Deferred items and exact reasons

| Deferred item | Why deferred | Future phase owner | Schema approval needed? |
| --- | --- | --- | --- |
| App-wide visible language switcher | Phase 4 only normalizes company default language; a product-wide switcher changes application shell/session behavior and requires UX/i18n decisions. | Phase 3 follow-up or UX/forms cleanup, before broad commercial screen expansion. | No, unless persisted user preference is added. |
| User/session language preference | Current language source is company default locale, not user/session preference; user preferences introduce auth/profile/session scope. | Phase 3 follow-up or later account/user settings work. | Yes if persisted per-user/session preference is stored in Supabase. |
| Full SettingsPage translation | SettingsPage remains Arabic-first; full translation requires broader i18n resource expansion and copy review beyond Phase 4 storage/normalization. | Phase 3 follow-up or UX/forms cleanup. | No. |
| Logo upload/storage | Phase 4 approved URL-only branding; uploads require Supabase Storage policy, file validation, lifecycle, and UI work. | Documents/branding/admin follow-up or later UX/settings hardening. | Yes if storage buckets/policies or DB fields change; no if only client UI uploads to pre-approved storage. |
| Generated invoice/receipt numbers | Prefix persistence is only the foundation; generated numbering affects documents/financial identity and must be atomic and auditable. | Phase 8 Payments and Receipts and/or Phase 17 printable documents. | Likely yes for counters/sequences/number tables. |
| Receipt generation | Receipts must originate from posted payments and remain financial-domain work. | Phase 8 Payments and Receipts. | Likely yes if receipt tables/numbering are added or changed. |
| Invoice generation | Invoice generation is document/financial behavior outside Company Settings. | Phase 8 Payments and Receipts and/or Phase 17 printable documents. | Likely yes if invoice tables/numbering are added or changed. |
| PDF/document generation | Phase 4 preview is display-only; PDF/print output requires document templates, rendering, Arabic-safe PDF decisions, and storage/download flows. | Phase 14-17 document/PDF phases. | Possibly, depending on template/document artifact persistence. |
| Report localization | Reports are a separate domain and can affect financial presentation/export expectations. | Phase 9 Reports. | No for UI-only localization; yes if persisted report preferences are added. |
| Dashboard metrics | Dashboard is explicitly Phase 5 and must use canonical financial data sources. | Phase 5 Dashboard. | No for read-only UI; yes if new materialized/reporting tables are introduced. |
| Per-contract/per-invoice currency | Phase 4 sets company default currency only; per-record currency affects schemas, calculations, exports, and history. | Contracts/Payments/Invoicing future schema work. | Yes. |
| Exchange rates | Master Plan excludes v1 exchange-rate conversion unless explicitly requested; it would affect financial calculations. | Future finance/accounting phase only if explicitly approved. | Yes. |
| Schema/default_language migration | The approved Phase 4 path derives language from `locale`; adding `default_language` is a schema change and was intentionally not bundled. | Future schema-approved settings/i18n follow-up. | Yes. |
| Any payment/receipt/accounting behavior | Phase 4 must not alter financial transactions, receipts, ledger behavior, or calculations. | Phase 8 Payments/Receipts and Phase 18-22 Ledger/Accounting. | Yes for schema/ledger changes; no for some later UI-only display changes. |

## 6. Risks / notes

- **`company_settings` singleton row dependency:** The migration seeds a singleton row and the update path updates by current `id`. If an environment lacks the seed row, reads fall back in memory but updates can fail because there is no persisted row to update.
- **Persisted locale vs explicit default language:** The database stores `locale`, while the app derives `defaultLanguage` from locale. This is acceptable for Phase 4 but should be revisited only through a schema-approved follow-up if explicit language storage is required.
- **Arabic default remains active:** Defaults remain Arabic/RTL (`ar`, `ar-OM`, `rtl`) as required for the first commercial version.
- **English/LTR readiness exists but is not a full UI switcher:** The normalized contract and SettingsPage direction handling support English/LTR readiness, but there is no app-wide visible language switcher or full SettingsPage translation.
- **Logo URL is URL-only, no storage:** Safe URL validation/rendering exists. Uploads, Supabase Storage, image processing, and storage policies are not implemented.
- **Downstream consumption is display-only:** Contract screens consume company settings only for formatting/display. Exports, mutations, document generation, reports, and numbering are deferred.
- **No financial calculations were changed:** Company-aware formatting affects presentation only and does not mutate amounts, balances, rent calculations, payments, receipts, invoices, or ledger/accounting behavior.

## 7. Validation summary

Validation commands requested for this report:

- `pnpm --filter ./artifacts/rentrix run typecheck`
- `pnpm --filter ./artifacts/rentrix run typecheck:test`
- `pnpm --filter ./artifacts/rentrix run build`
- `pnpm --filter ./artifacts/rentrix run lint`
- `pnpm --filter ./artifacts/rentrix test`
- `pnpm --filter ./artifacts/rentrix run test:financials`
- `git diff --check`
- `rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true`
- `git status --short`

Final command results for this task:

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm --filter ./artifacts/rentrix run typecheck` | Passed | Completed successfully. Node emitted a pre-existing `[DEP0169]` deprecation warning before the TypeScript command. |
| `pnpm --filter ./artifacts/rentrix run typecheck:test` | Passed | Completed successfully. Node emitted a pre-existing `[DEP0169]` deprecation warning before the TypeScript command. |
| `pnpm --filter ./artifacts/rentrix run build` | Passed | Vite production build completed successfully. Node emitted a pre-existing `[DEP0169]` deprecation warning before the build command. |
| `pnpm --filter ./artifacts/rentrix run lint` | Passed | Current lint script completed successfully. Node emitted a pre-existing `[DEP0169]` deprecation warning before the TypeScript command. |
| `pnpm --filter ./artifacts/rentrix test` | Passed | 3 test files and 6 tests passed. Node emitted a pre-existing `[DEP0169]` deprecation warning before Vitest. |
| `pnpm --filter ./artifacts/rentrix run test:financials` | Passed | 11 test files and 40 tests passed. Node emitted a pre-existing `[DEP0169]` deprecation warning before Vitest. |
| `git diff --check` | Passed | No whitespace errors reported. |
| `rg "legacy-src|useApp|AppContext|dataService|local db|react-router-dom" artifacts/rentrix/src -n || true` | Passed | No forbidden references were reported. |
| `git status --short` | Passed | Only this new completion report document was untracked before staging. |

## 8. Hosted checks

Hosted checks were not available from the local environment for this verification task:

- **Sonar status:** Not available locally.
- **Codacy status:** Not available locally.
- **Vercel status:** Not available locally.

## 9. Final recommendation

**Phase 4 complete; start Phase 5 Dashboard.**

No additional Phase 4 implementation PR is required before Phase 5, provided the intentional deferrals above remain assigned to their future phases and no hosted check reports a new blocker.

## 10. Recommended next task if Phase 4 is complete

**Exact next task prompt title:** Phase 5 PR 1 — Dashboard data-source audit and current-state report.

Do not start Phase 5 code in this task.
