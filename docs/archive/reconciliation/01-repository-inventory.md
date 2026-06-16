# 01 - Repository Inventory

## Scope and exclusions

Inventoried paths: `artifacts/rentrix/`, `.migration-backup/`, and `artifacts/rentrix/legacy-src/`. Generated/dependency paths were excluded from comparisons: `node_modules/`, `dist/`, `coverage/`, `.git/`, `.cache/`, `.vite/`, build outputs, generated files, and lockfiles except when package-manager strategy was relevant.

The combined non-generated inventory contained 1,257 files. `artifacts/rentrix/legacy-src/` is nested inside the deployable package directory but is treated as a historical recovery source, not as part of the current runtime baseline.

## Workspace and package structure

Current runtime uses the root pnpm workspace (`packageManager: pnpm@10.11.1`) and the `@workspace/rentrix` package under `artifacts/rentrix/`. Runtime package scripts are `dev`, `build`, `serve`, `typecheck`, `typecheck:test`, `test`, `lint`, and `test:financials`.

Historical `.migration-backup/` is a broader standalone app named `rentrix-pwa`, includes both `package-lock.json` and `pnpm-lock.yaml`, and declares npm engine assumptions. It is not canonical for package-manager strategy.

## Current runtime map

| Layer | Files and notes |
| --- | --- |
| App entry | `artifacts/rentrix/src/index.tsx`, `artifacts/rentrix/src/App.tsx`. |
| Router | TanStack Router file routes in `artifacts/rentrix/src/routes/`; generated route tree in `artifacts/rentrix/src/routeTree.ts`. |
| Auth | `artifacts/rentrix/src/app/auth.tsx`, login route `_auth.login.tsx`, protected route shell `_protected.tsx`. |
| Providers | Query client/router providers from app entry and root route. |
| Layout/navigation | `artifacts/rentrix/src/layouts/app-shell.tsx` and route files. |
| Supabase | `artifacts/rentrix/src/integrations/supabase/client.ts`, `artifacts/rentrix/src/lib/env.ts`, `artifacts/rentrix/src/lib/supabase-error.ts`, `artifacts/rentrix/src/types/database.ts`. |
| Shared UI | `artifacts/rentrix/src/components/ui/`, `empty-state.tsx`, `skeleton.tsx`, cards, table, form primitives. |
| Features | `src/features/accounting`, `contracts`, `financials`, `maintenance`, `owners`, `people`, `properties`, `reports`, `settings`, `tenants`, `units`. |
| Services/hooks | Feature-local services and hooks, plus `src/services/peopleService.ts`, `src/services/propertyService.ts`, and shared lib helpers. |
| Stores | `artifacts/rentrix/src/store/` is minimal. |
| Tests | Runtime Vitest tests are concentrated around contracts, financials, owners, properties, units, maintenance, settings, and shared state semantics. |
| Vite/PWA | `artifacts/rentrix/vite.config.ts`, `public/manifest.json`, `public/offline.html`. |
| Vercel | `artifacts/rentrix/vercel.json`. |

## Historical `.migration-backup/` map

| Layer | Files and notes |
| --- | --- |
| App entry/router | `src/App.tsx` uses `react-router-dom` `Routes`, `Route`, `Navigate`, and legacy shell layout. |
| Contexts | `src/contexts/AppContext.tsx`, `authContext.tsx`, `financeContext.tsx`, `operationsContext.tsx`. |
| UI pages | 28 files under `src/ui/`, including `AuditLog`, `DataIntegrityAudit`, `OwnersHub`, `OwnerView`, `Lands`, `Leads`, `Commissions`, `CommunicationHub`, `Finance`, `Financials`, `Invoices`, `Accounting`, `GeneralLedger`, `SmartAssistant`, and `ChangePassword`. |
| Services | 46 files under `src/services/`, including accounting, audit, documents, edge functions, finance, Gemini, governance, reports, receipts, Supabase data service, WhatsApp. |
| Design system | `src/design-system/` atoms, molecules, organisms, templates, tokens, and theme helpers. |
| Shared components | UI primitives, invoice components, print layout, settings submodules, reports dashboard, assistant, attachments, confirmations. |
| Domain modules | `src/domain/*` facades and types; many reference `AppContextType`. |
| Hooks | Query hooks and legacy `useAppCoreImpl`, `useFinanceCore`, `useOperationsCore`, etc. |
| Infrastructure | Security and observability helpers. |
| Database/infrastructure | `supabase/migrations`, `supabase/sql`, `supabase/functions`, `prisma/schema.prisma`, SDKs, OpenAPI docs. These are recovery evidence only; no SQL was executed. |
| CI/scripts | `.github/workflows/*`, validation scripts, repair scripts, schema-drift scripts. |

## Historical `legacy-src` map

`artifacts/rentrix/legacy-src/` largely mirrors `.migration-backup/src/` and includes extra files such as `services/api/apiClient.ts`, `services/service-api.contract.ts`, `components/shared/DataErrorScreen.tsx`, and `services/audit/AuditTrail.test.ts`. It is useful for resolving gaps where `.migration-backup/` and current runtime differ, but it is not the deployed app.

## Equivalents and duplicates

| Purpose | Current runtime | Historical sources | Finding |
| --- | --- | --- | --- |
| Router | `src/routes/*`, TanStack Router | `src/App.tsx`, React Router | Duplicate architecture; keep current. |
| Auth | `src/app/auth.tsx` | `contexts/AppContext`, `authService`, `authContext` | Duplicate architecture; use current auth and write adapters only if needed. |
| Supabase client | Non-throwing runtime diagnostics client | `config/env.ts` hard-throws on missing env; `services/api/supabaseClient.ts` | Keep current client and diagnostics. |
| Owners | `src/features/owners/*` | `ui/Owners.tsx`, `ui/OwnersHub.tsx`, `ui/OwnerView.tsx` | Current owners list is canonical; hub/portal are historical-only candidates. |
| Financials | `src/features/financials/*` | `ui/Finance.tsx`, `Financials.tsx`, `Invoices.tsx`, `Accounting.tsx`, `GeneralLedger.tsx` | Merge selectively; do not restore legacy finance router. |
| UI primitives | `src/components/ui/*` | `src/components/ui/*`, `src/design-system/*` | Duplicate primitives; port only missing components per feature. |
| Documents/printing | Contract document shell and PDF/report code in current | `components/print`, `services/documents`, `pdfService` | Merge only after adapter and XSS/permission review. |

## Risks identified

| Risk | Evidence | Recommendation |
| --- | --- | --- |
| Deprecated architecture coupling | Historical UI imports `useApp`, `AppContext`, and `react-router-dom`. | Do not port directly; adapt to TanStack Router, current auth, and feature services. |
| Hard env throws | `.migration-backup/src/config/env.ts` throws on missing Supabase env. | Discard for runtime; preserve current diagnostics behavior. |
| Privileged/schema assumptions | Historical audit, data integrity, finance, settings, and assistant flows assume tables/RPCs/functions not all present in current typed services. | Verify schema before writes; start read-only. |
| Placeholder runtime page | Current `src/features/accounting/accounting-page.tsx` is a three-line placeholder. | Replace via read-only adapted accounting/ledger work after schema verification. |
| Barrel/export risk | Historical `hooks/index.ts`, `services/index.ts`, and design-system barrels aggregate legacy modules. | Avoid importing historical barrels into runtime. |
| Mock/data ambiguity | Historical comments and tests reference mock/fix state and in-memory `db`. | Treat legacy `db` as behavior reference, not data source. |
| Dead/recovery-only code | SDKs, repair scripts, Prisma, old CI, old PWA, and old package files are not used by current runtime. | Reference only unless a targeted future task needs them. |

