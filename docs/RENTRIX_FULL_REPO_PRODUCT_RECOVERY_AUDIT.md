# Rentrix Full Repo Product Recovery Audit

Date: 2026-05-14  
Scope: read-only audit of the current Rentrix app, legacy source, docs, and typed Supabase capability surface.  
Base branch: `main` at `375d6dfd4f4898906aee63b3f9fd7fff85849140`.  
PR intent: documentation only; no application code, UI, schema, migrations, deletions, imports from `legacy-src`, or behavior changes.

## Audit evidence reviewed

### Direct code evidence

| Area | Evidence |
|---|---|
| App boot path | `artifacts/rentrix/src/App.tsx` renders `AppProviders` and `AppRouterProvider`; `artifacts/rentrix/src/app/router.tsx` uses `@tanstack/react-router` and `routeTree`. |
| Routing | `artifacts/rentrix/src/routeTree.ts` defines reachable protected routes for dashboard, properties, people, contracts, financials, accounting, reports, maintenance, and settings. |
| Navigation | `artifacts/rentrix/src/layouts/app-shell.tsx` links to `/`, `/properties`, `/people`, `/contracts`, `/financials`, `/accounting`, `/reports`, `/maintenance`, `/settings`. |
| Package scripts | `artifacts/rentrix/package.json` exposes `typecheck`, `build`, `lint`, `test`, and `test:financials`. |
| Database typing | `artifacts/rentrix/src/types/database.ts` includes tables for properties, units, people, contracts, invoices, payments, maintenance requests, and expenses; functions include `renew_contract_atomic`, `post_receipt_atomic`, `generate_invoices_from_active_contracts`, and `rpt_financial_summary`. |
| Legacy recovery docs | `docs/LEGACY_FEATURE_RECOVERY.md` states current boot uses `src`, while `legacy-src` is excluded from compilation and must not be bulk imported. |
| Legacy reports docs | `docs/LEGACY_REPORTS_RECOVERY_AUDIT.md` lists 20 report-like legacy capabilities and confirms accounting/owner/document layers are blocked or deferred. |

### Commands requested for audit evidence

The audit instruction required command-style inspection. This PR records the commands that must be run by CI/local reviewer against the checked-out branch. GitHub connector inspection was used for repo contents and file evidence in this documentation pass. The terminal `git clone` path was blocked in the ChatGPT execution environment, so command runtime results are not fabricated here.

| Command | Status in this PR | Notes |
|---|---|---|
| `pwd` | Not run locally in repo checkout | GitHub connector was used against `mohamedmasoud3030-tech/rentrixxx`. |
| `git status --short` | Not run locally in repo checkout | This PR is docs-only with a single new markdown file. |
| `find . -maxdepth 3 -type f \| sort \| sed -n '1,240p'` | Not run locally in repo checkout | File evidence was gathered from GitHub API searches/fetches. |
| `find artifacts/rentrix/src -type f \| sort` | Not run locally in repo checkout | Current app areas inspected by path. |
| `find artifacts/rentrix/legacy-src -type f \| sort` | Not run locally in repo checkout | Legacy areas inferred from legacy docs and targeted searches. |
| `find docs -type f \| sort` | Not run locally in repo checkout | `LEGACY_FEATURE_RECOVERY.md` and `LEGACY_REPORTS_RECOVERY_AUDIT.md` inspected. |
| `cat artifacts/rentrix/package.json` | Inspected via GitHub file fetch | Scripts and dependencies recorded. |
| `rg ... routes/imports/exports/TODO/legacy/keywords/schema` | Partially inspected via GitHub search and direct fetches | No broad full-text command output is claimed. |
| `npm --prefix artifacts/rentrix run typecheck` | Not run | Must be run by CI/local reviewer; do not hide failures if they occur. |
| `npm --prefix artifacts/rentrix run build` | Not run | Must be run by CI/local reviewer; docs-only change should not affect app build. |
| `npm --prefix artifacts/rentrix run lint` | Not run | Equivalent to typecheck per package script. |
| `npm --prefix artifacts/rentrix test` | Not run | Financial test subset configured in package script. |
| `npm --prefix artifacts/rentrix run test:financials` | Not run | Dedicated financials test command exists. |
| `git diff --check` | Not run locally | Review should run before merge. |

## 1. Current feature inventory

| Feature/domain | Current files | Entry route/page | Services/hooks used | Supabase tables/RPCs used | Status | Evidence | Risk/notes |
|---|---|---|---|---|---|---|---|
| Dashboard | `src/app/dashboard-page.tsx`, `src/app/dashboardService.ts` | `/` | `getDashboardOverview` via React Query | `rpt_financial_summary`, counts over properties/units/contracts/invoices | Partial | RouteTree exposes dashboard; service uses monthly RPC and count queries | Dashboard still depends on a narrow RPC and duplicates operational count logic instead of consuming stabilized report services. Should be near-last rebuild. |
| Properties | `src/features/properties/*` | `/properties`, `/properties/new`, `/properties/$propertyId`, edit route | `property-service`, `use-properties` | `properties` | Working/partial | Service lists, creates, updates, soft-deletes properties and searches owner_name | Owner is plain `owner_name`, not durable owner relation. Property-level unit detail not audited deeply here. |
| Units | `src/features/units/*` | No standalone top-level route found; used from property/maintenance contexts | `useUnits` | `units` | Service/context only | Maintenance page loads units for selected property; database table exists | Unit management is likely embedded/buried, not a first-class navigation domain. |
| People/tenants/owners/contacts | `src/features/people/*` | `/people`, `/people/new`, `/people/$personId/edit` | `people-service`, people hooks | `people` | Working/partial | People table supports `tenant`, `owner`, `contact`; service lists and filters by type | Contracts reference only `tenant_id`; properties use `owner_name` text, so owner model is weak. |
| Contracts | `src/features/contracts/*` | `/contracts`, `/contracts/new`, `/contracts/$contractId`, edit route | `contractService`, contract hooks | `contracts`, nested property/unit/person selects, `renew_contract_atomic` | Working/partial | Contract service lists, details, creates, updates, soft-deletes, renews | Legacy contract features like attachments, print, advanced filters, CSV export, balance view are not recovered. |
| Financials | `src/features/financials/financials-page.tsx` | `/financials` | invoice/payment/receipt/expense/report hooks | invoices, payments, expenses, properties, receipts projected from payments | Wired but incomplete | Financials page combines reports, invoices, quick payment, receipts, and expenses | Large monolithic page; no dedicated statement/arrears workflow UI; payment method is hard-coded to cash in quick payment. |
| Invoices | `src/features/financials/invoices/*` | `/financials` | `useInvoices`, `useInvoice`, `useGenerateInvoices`, `invoiceService` | `invoices`, `contracts`, `generate_invoices_from_active_contracts` | Working/partial | Status filters/search and invoice detail/payment history are wired | Manual invoice form, bulk actions, advanced filters, WhatsApp reminders, void/delete policy not recovered. |
| Payments | `src/features/financials/payments/*` | `/financials` | `usePostPayment`, `postReceiptAtomic` | `post_receipt_atomic`, payments via RPC | Working/partial | Mutation invalidates invoices, receipts, and financial report keys | Quick payment currently posts `method: 'cash'` and no reference; no method selector or richer payment UX. |
| Receipts | `src/features/financials/receipts/*` | `/financials` | `useReceipts`, `receiptService` | payments plus invoices/contracts/units/properties/people hydration | Partial | Receipt records are projected from payments with generated `REC-` numbers | No durable receipt table in typed schema; no Arabic-safe printable receipt or document layer. |
| Expenses | `src/features/financials/expenses/*` and embedded financials form | `/financials` | `useExpenses`, `useCreateExpense` | `expenses`, `properties` | Working/partial | Financials page lists and creates expenses | Expense filters are initialized but UI for filtering is minimal; no owner/accounting allocation. |
| Reports | `src/features/reports/reports-page.tsx`, `src/features/financials/reports/*` | `/reports`; financial summary also in `/financials` | Direct `useQuery` in ReportsPage plus report hooks/services | payments, expenses, units, contracts, invoices | Wired but incomplete/duplicated | Reports page computes charts directly; financial report services also exist | Duplicate report logic: charts bypass `financialReportsService`; reports include CSV despite print/export being deferred in recovery ordering. |
| Arrears/overdue | `financialReportsService.ts`, hooks | No dedicated page found; some report/chart data only | `getOverdueInvoicesReport`, `getAgedReceivablesReport`, `getArrearsSummaryReport` | invoices/contracts/people/properties/units | Service only / buried | Hooks exist for arrears reports, but no inspected route consumes them directly | Needs dedicated collection workflow after invoice/payment/receipt/report foundation. |
| Statements | None found in current `src` evidence | None | None | Current invoice/payment tables can support partial statement logic | Not implemented | Legacy docs list tenant/owner statements as not covered/deferred | Must wait for statement semantics and owner model decisions. |
| Accounting | `src/features/accounting/accounting-page.tsx` | `/accounting` | None | No accounts/journals in typed schema | UI shell only | Accounting route displays EmptyState saying only safe shell exists | Do not implement trial balance/income statement/balance sheet before ledger schema. |
| Maintenance | `src/features/maintenance/*` | `/maintenance` | `useMaintenance`, `useCreateMaintenance`, properties/units hooks | `maintenance_requests`, properties, units | Working/partial | Maintenance page supports status/property filter and create form | No maintenance reports, cost analytics, attachments, assignment workflow, or alerts. |
| WhatsApp/communications | Legacy only, no current table/service found | None | None | No communication log table in types | Not implemented | Legacy docs mention WhatsApp reminders and bulk reminders | Must come after phone normalization, arrears/statement sources, templates, and logging. |
| Notifications/reminders | Not found as current feature | None | None | No reminder table in types | Not implemented | Legacy dashboard alerts were local calculations | Requires collection/expiry/maintenance alert sources before UI. |
| Documents/PDF/print | `jspdf` deps present; no current safe document system found | None | None | No document template tables | Not implemented/deferred | Legacy docs explicitly defer Arabic-safe print/PDF/document generation | Do not add print/PDF until template, font, RTL, pagination foundation exists. |
| Settings/company profile | `settings-page.tsx` | `/settings` | local React state and UI store | None | UI only | Company/users settings are in component state | Not persistent; cannot be used as document source of truth. |
| Users/permissions | settings UI placeholder; Supabase auth session guards routes | `/settings`, protected route guard | `supabase.auth.getSession` | auth only | Partial/security shell | RouteTree protects all app routes via session | No app roles/permissions table in typed schema. |
| Import/export | CSV helper inside ReportsPage | `/reports` | Browser Blob download | Direct report rows | Partial/orphaned policy conflict | CSV export exists even though larger export layer is deferred | Needs governed import/export plan; do not expand before stable report contracts. |
| Shared UI components | `src/components/ui/*`, `components/shared/DataTable` | Used across pages | N/A | N/A | Working/partial | Maintenance uses DataTable; pages use Button/Card | Modal/form/mobile patterns are inconsistent and need later UI cleanup. |
| Forms/modals | Forms embedded in feature pages | Multiple | react-hook-form, zod | Feature tables | Partial | Property/people/contracts/maintenance/financials forms exist | No unified form shell/modal strategy; do not cleanup before business logic gaps are exposed. |
| Mobile/responsive patterns | Tailwind grid/flex classes in layout and pages | Global | UI store sidebar | N/A | Partial | AppShell has responsive sidebar/header | Needs final pass after features stabilize. |

## 2. Legacy feature inventory

| Legacy capability | Legacy files | Domain | What it did | Current equivalent | Current status | Dependencies | Recommended phase |
|---|---|---|---|---|---|---|---|
| Operational dashboard KPIs | `legacy-src/ui/Dashboard.tsx` | Dashboard | Properties, units, vacancy, active contracts, financial cards, alerts, charts | Current dashboard has limited operational and financial cards | Partially recovered | Stable report services, operational services | Dashboard rebuild |
| Contract management depth | `legacy-src/ui/Contracts.tsx` | Contracts | Stats, filters, expandable rows, payments, print/PDF, attachments, renewal, balances | Basic contract CRUD/detail/renewal | Partially recovered | Contract service, attachments, document system, financial balances | Financial foundation then contracts UX |
| Invoice workflow | `legacy-src/ui/Invoices.tsx` | Invoices/payments | Stats, filters, quick pay, WhatsApp reminders, manual invoices, delete policy, receipt posting | Financials page lists and pays invoices | Partially recovered | Payment RPC, invoice generation, reminder/communication model | Financial operations foundation |
| Receipt artifacts | legacy document/receipt flows | Receipts/documents | Printable receipts and posted artifacts | Receipt projection from payments | Partially recovered | Durable receipt/document strategy | Document template then PDF |
| Reports dashboard | `legacy-src/components/reports/ReportsDashboard.tsx` | Reports | Financial, income, trial balance, aged receivables, overdue, statements, rent roll | Current reports page + financial report services | Partially recovered | Report service consolidation; accounting schema for accounting reports | Reporting recovery |
| Accounting UI/services | `legacy-src/ui/Accounting.tsx`, `legacy-src/services/accountingService.ts` | Accounting | Chart of accounts, journals, ledgers, trial balance, financial statements | Empty accounting shell | Not recovered / blocked by schema | Accounts, journals, posting rules | Accounting ledger then statements |
| Arrears screen | `legacy-src/ui/financial/Arrears.tsx` | Collections | Overdue invoice collection list | Service-level arrears reports only | Partially recovered/service-only | Arrears UI, phone normalization | Arrears/collections |
| Owner hub | `legacy-src/ui/OwnersHub.tsx` | Owner reports | Owner properties/contracts/invoices/payments/expenses/arrears | People owner type + property owner_name text only | Not recovered / blocked | Durable owner relationship | Owner model/reports |
| Owner portal | `legacy-src/ui/OwnerView.tsx` | Owner portal | Tokenized owner summary | None | Deferred | Auth/portal decision, owner reports | Later owner portal batch |
| Attachments manager | legacy attachments components/services | Documents/entities | Entity file attachments | None inspected | Not recovered | Storage/document model | After entity foundations |
| WhatsApp reminders | legacy invoices/reports actions | Communications | Click-to-chat/bulk reminders | None | Not recovered | Normalized phone, templates, log | Communications/WhatsApp |
| PDF/print/export | legacy pdf/report helpers | Documents/export | Contract/report/receipt print/PDF/CSV | CSV helper in current reports only | Deferred/partial | Arabic-safe document foundation | Document/PDF phases |

## 3. Current vs legacy gap map

| Capability | Legacy existed? | Current exists? | Current correctly wired? | Missing data/schema? | Missing UI? | Missing service? | Missing tests? | Risk if skipped | Recommended next action |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| Active operational dashboard | Yes | Partial | Partial | No major schema blocker for basic KPIs | Partial | Partial | Likely | Dashboard remains shallow and may duplicate logic | Keep dashboard near-last; feed from stable services. |
| Contract attachments | Yes | No | No | Likely document/storage metadata | Yes | Yes | Yes | Contract recovery incomplete | Defer until document/attachment model. |
| Invoice quick pay | Yes | Yes | Partial | No | Partial | Yes | Some financial tests | Payment UX is too narrow | Add payment method/reference as later PR after foundation. |
| Printable receipt | Yes | Partial projection only | No | Durable document/template layer missing | Yes | Yes | Yes | Users cannot issue formal receipt | Do after document template system. |
| Daily collection report | Yes | Service likely exists | No current report page consumer | No | Yes | Partial | Yes | Buried data capability | Wire after reporting recovery. |
| Aged receivables | Yes | Service exists | Not surfaced | No core blocker | Yes | Partial | Yes | Collections remain unactionable | Build arrears UI after services. |
| Tenant/contract/property statements | Yes | No | No | Statement ledger semantics missing | Yes | Yes | Yes | Incorrect balances if faked | Define statement rules from invoices/payments first. |
| Owner statements | Yes | No | No | Owner relationship is weak | Yes | Yes | Yes | Owner reporting will be unreliable | Resolve owner model first. |
| Accounting ledger | Yes | No | No | Accounts/journals missing | Yes | Yes | Yes | Cannot produce real accounting reports | Build ledger schema/service before statements. |
| WhatsApp reminders | Yes | No | No | Communication log/templates missing | Yes | Yes | Yes | No auditable collection workflow | Normalize contacts/phones first. |
| Company profile for documents | Yes/implicit | UI only | No persistence | Settings/company table missing | Partial | Yes | Yes | PDF/print would use fake data | Add persistent settings before documents. |
| Import/export | Some legacy CSV/PDF | Partial CSV | Isolated | Import schema/process missing | Partial | Yes | Yes | Inconsistent exports | Defer governed import/export. |

## 4. Routing and reachability audit

### Reachable routes

`routeTree.ts` exposes `/login`, `/`, `/properties`, `/properties/new`, `/properties/$propertyId`, `/properties/$propertyId/edit`, `/people`, `/people/new`, `/people/$personId/edit`, `/contracts`, `/contracts/new`, `/contracts/$contractId`, `/contracts/$contractId/edit`, `/financials`, `/accounting`, `/reports`, `/maintenance`, and `/settings`.

### Navigation-covered routes

`app-shell.tsx` links to the main modules only: dashboard, properties, people, contracts, financials, accounting, reports, maintenance, and settings. New/detail/edit routes are reachable through feature flows, not top-level nav.

### Existing but not sufficiently surfaced

| Item | Evidence | Classification | Recommendation |
|---|---|---|---|
| Arrears report hooks/services | `useFinancialReports.ts` exports arrears hooks | Service-only/buried | Surface after report foundation and before WhatsApp. |
| Daily collection/expense breakdown/financial period services | Financial report service and hooks | Service-only | Wire into reporting recovery page instead of duplicate report page calculations. |
| Accounting page | Route exists but EmptyState only | UI shell only | Keep as explicit placeholder until accounting schema exists. |
| Settings company/users | Route exists but local state only | UI only | Do not use as source for documents until persistence exists. |
| Reports CSV helper | Inside `reports-page.tsx` | Isolated export helper | Defer broader export strategy. |

## 5. Dead/orphan/duplicated code audit

| Finding | Evidence | Risk | Later action |
|---|---|---|---|
| Legacy code is present but excluded | Recovery doc states `legacy-src` is not compiled/typechecked/routed/deployed | Easy to accidentally re-import incompatible architecture | Keep as reference only until cleanup phase. |
| Duplicate report logic | `reports-page.tsx` directly computes financial/occupancy/contracts/payments trend while `financialReportsService.ts` also exposes report services | Business rules may diverge | Consolidate reports UI onto report services. |
| Duplicate formatting paths | Financials uses `formatCompanyMoney/defaultCompanyLocalSettings`; reports page uses raw chart numbers | Inconsistent money/date display | Centralize after report behavior is stable. |
| Receipt records are derived, not stored | `receiptService.ts` generates `REC-${paymentId.slice(0,8)}` from payments | Formal receipt numbering may change if payment IDs exposed | Decide durable receipt/document strategy before print. |
| Empty accounting module | `accounting-page.tsx` only renders EmptyState | Users may expect real accounting | Keep visibly blocked until ledger work begins. |
| Local-only settings | `settings-page.tsx` uses component state for company/users | Fake persistence; unsafe for documents/users | Replace with persisted settings/users after schema decision. |

No files should be deleted in this PR. Deletion belongs to final cleanup after replacement features and tests are confirmed.

## 6. Wiring correctness audit

| Area | Current wiring issue | Evidence | Fix direction |
|---|---|---|---|
| Dashboard | Reads `rpt_financial_summary` plus direct count queries; not based on full stabilized report layer | `dashboardService.ts` | Rebuild after report services are stable. |
| Reports | Direct chart query bypasses `financialReportsService` | `reports-page.tsx` | Consolidate into report hooks and keep export/print separate. |
| Financials quick payment | Method hard-coded to cash; no reference input | `financials-page.tsx` `postPayment.mutate({ method: 'cash', reference: null })` | Add method/reference only after foundation batch. |
| Receipts | Projected from payments without durable receipt schema | `receiptService.ts` | Introduce document/receipt strategy before print. |
| Owner reports | `people.type='owner'` exists, but properties have only `owner_name` | `database.ts` | Add/resolve owner relationship before owner reports. |
| Accounting | Route exists but no ledger schema | `accounting-page.tsx`, `database.ts` | Ledger schema and posting rules first. |
| Settings | Company/user UI not persisted | `settings-page.tsx` | Persist settings/users before document generation. |
| WhatsApp | No current communication log/template tables | `database.ts` | Normalize phones, templates, logs before actions. |

## 7. Schema capability audit

### Supported safely by current typed schema

- Property CRUD and filtering through `properties`.
- Unit references via `units`.
- People as `tenant`, `owner`, or `contact` records.
- Contract CRUD with tenant/property/unit references and renewal RPC.
- Invoice generation/list/detail from `invoices` and contract context.
- Payment posting through `post_receipt_atomic` RPC.
- Maintenance requests.
- Expense capture by property/category/date.
- Some dashboard financial summary through `rpt_financial_summary`.

### Weak or missing schema surfaces

| Capability | Schema state | Consequence |
|---|---|---|
| Owner model | `people.type='owner'` exists but `properties.owner_name` is text and no typed property owner FK exists | Owner statements/reporting should not be built on weak text fields. |
| Accounting ledger | No `accounts`, `journal_entries`, ledger balances, or reconciliation view in `database.ts` | Trial balance, income statement, balance sheet, account ledger, reconciliation are blocked. |
| Communications | No templates, communication logs, normalized phone metadata | WhatsApp workflows are blocked. |
| Documents/templates | No document templates, headers, signatures, logo settings, durable receipt docs | PDF/print is blocked. |
| Roles/permissions | No app roles/permission tables in `database.ts` | User management and admin-only actions are not ready. |
| Settings/company profile | Settings UI is local state; no table typed | Documents cannot rely on company profile data. |

## 8. Test coverage audit

| Test area | Current evidence | Gap |
|---|---|---|
| Package scripts | `typecheck`, `build`, `lint`, `test`, `test:financials` exist in `package.json` | Runtime results must be collected by CI/local checkout. |
| Financial tests | `test` script explicitly targets receipt/payment financial tests; `test:financials` runs financial directory | Good starting coverage for payments/receipts/reports, but exact pass/fail not run here. |
| Properties/people/contracts | No test evidence inspected | Add CRUD/service tests before deep UX recovery. |
| Reports | Financial report services should have tests for date filters, method totals, aging buckets, and deleted rows | Must be expanded before dashboard rebuild. |
| Settings/users/documents | No persistence, no tests | Wait until schema exists. |
| Accounting | No current ledger | Tests belong with ledger schema and posting rules. |

Recommended test batches:

1. Financial math and report service pure helpers.
2. Invoice/payment/receipt invalidation and RPC payloads.
3. Arrears aging and overdue report calculations.
4. Contract CRUD/renewal payload tests.
5. Maintenance create/filter tests.
6. Dashboard service after report consolidation.
7. Owner model/report tests after schema decision.
8. Accounting ledger posting tests before statements.

## 9. Product dependency map

| Dependency rule | Why |
|---|---|
| Financial operations foundation before statements | Statements need reliable invoice/payment/receipt semantics. |
| Reporting recovery before dashboard rebuild | Dashboard must consume stable report services, not duplicate business logic. |
| Dashboard last or near-last | It aggregates many domains and should not hide missing business logic. |
| WhatsApp after phone normalization, arrears, and statement sources | Messages need accurate contacts, balances, templates, and audit logs. |
| PDF/print after document templates and Arabic-safe rendering foundation | RTL, Arabic fonts, pagination, headers/footers, logos, and signatures must be solved centrally. |
| Accounting ledger before trial balance/income statement/balance sheet | Accounting statements cannot be faked from invoices/payments/expenses. |
| Owner reports after owner relationship/model | `owner_name` text is not enough for durable owner statements. |
| Global UI cleanup after business logic recovery | UI polish should not hide incomplete services/schema. |

## 10. Required recovery phases

| Phase | Purpose | Prerequisites | Features included | Explicit out-of-scope | Likely files touched | Expected tests | Risk | Why here |
|---|---|---|---|---|---|---|---|---|
| Financial operations foundation | Stabilize invoices/payments/receipts/expenses | Current schema/RPCs | Payment method/reference, invoice UX, expense filters | PDF, WhatsApp, accounting | `features/financials/*` | Financial service/hook tests | Medium | Base for statements/reports. |
| Reporting recovery | Consolidate report services/UI | Financial foundation | Daily collection, expense breakdown, financial period, arrears surfacing | Dashboard rebuild, export/PDF | `features/financials/reports/*`, `features/reports/*` | Report calculation/filter tests | Medium | Prevent duplicate reporting logic. |
| Arrears/collections | Actionable overdue workflows | Reporting recovery | Overdue rows, aging buckets, collection queues | WhatsApp sends | `features/arrears` or financials tabs | Aging/overdue tests | Medium | Feeds communications. |
| Statements | Tenant/contract/property statements | Financial foundation + report rules | Debit/credit/running balance | PDF | statement services/UI | Statement line tests | High | Requires precise semantics. |
| Communications/WhatsApp | Auditable contact workflows | Arrears/statements + phone normalization | Templates, click-to-chat, logs | Bulk automation until logging | communications services/UI | Phone/template/log tests | High | Prevents unaudited sends. |
| Owner model/reports | Reliable owner reporting | Owner relationship decision | Owner statements/hub/report payloads | Owner portal auth first | schema/services/features owners | Owner model/report tests | High | Text owner names are unsafe. |
| Accounting ledger | Real accounting foundation | Schema design | Accounts, journals, posting rules | Financial statements | accounting services/schema | Posting balance tests | High | Required before statements. |
| Accounting statements | Trial balance, income statement, balance sheet | Accounting ledger | Accounting reports | PDF/export | accounting reports | Statement tests | High | Depends on ledger. |
| Maintenance recovery | Restore operational depth | Current maintenance baseline | Reports, assignment, cost tracking | PDF/WhatsApp | maintenance features | Maintenance tests | Medium | Business ops after financial base. |
| Document template system | Company docs foundation | Persisted settings | Templates, header/footer/logo/signatures | PDF renderer | settings/documents | Template tests | Medium | Needed before print. |
| Arabic-safe print/PDF | Safe document rendering | Template system | Receipts/invoices/contracts/statements print | Business logic changes | document/pdf layer | RTL/render tests | High | Arabic correctness is central. |
| Global entity UX/forms/mobile | Consistent UX | Business logic settled | Unified forms/modals/responsive polish | New domain logic | shared components/forms | Interaction tests | Medium | Avoids hiding gaps. |
| Dashboard rebuild | Final executive view | Reports stable | KPIs, trends, alerts | New source logic | dashboard | Dashboard service tests | Medium | Aggregator should be late. |
| Import/export | Governed data movement | Stable models | CSV/import/export | Ad hoc helpers | import/export services | File validation tests | Medium | Needs stable schemas. |
| Final cleanup/dead-code removal | Remove replaced/dead legacy | Replacement confirmed | Delete/archive dead code | Feature changes | legacy/docs cleanup | Build/typecheck | Low/Medium | Last, after evidence. |

## 11. Immediate next 10 PR-sized batches

| # | PR title | Why it comes next | Scope | Explicit out-of-scope | Dependencies | Files likely touched | Tests expected | Merge criteria |
|---:|---|---|---|---|---|---|---|---|
| 1 | Consolidate reports page onto financial report services | Removes duplicate report logic | Use report hooks for existing charts/cards | New reports, PDF/export expansion | Existing financial report services | `features/reports/*`, `features/financials/reports/*` | report hook/service tests | No behavior regression, typecheck/build pass. |
| 2 | Expand financial quick payment inputs safely | Payment UX currently hard-codes cash | Method/reference/date controls, validation | Receipts print, WhatsApp | Payment RPC | `financials-page.tsx`, payment hooks/tests | payment mutation tests | Correct RPC payload and invalidation. |
| 3 | Surface arrears and aging report read model | Arrears services are buried | Dedicated read-only arrears panel/page | WhatsApp sends | Report services | financials/reports or arrears feature | aging/overdue tests | Correct totals/buckets from sample data. |
| 4 | Split financials page into feature sections | Monolith increases risk | Extract invoice/payment/receipt/expense sections | New features | Current behavior | `features/financials/*` | component/service tests | No behavior changes except structure. |
| 5 | Add persistent company settings design doc/schema proposal | Settings are local-only | Document exact settings needed for documents | Applying migration | Current settings UI | docs only or schema proposal | none/docs check | Clear prerequisites for documents. |
| 6 | Define owner relationship recovery design | Owner reporting blocked | Decide owner model and migration plan | Implementing reports | People/properties schema | docs/schema proposal | none/docs check | Explicit model accepted. |
| 7 | Contract UX recovery batch 1 | Legacy contracts richer | Search/filter/stats and safer balance context | PDF/attachments | Contract services | `features/contracts/*` | contract service tests | No legacy imports; route stable. |
| 8 | Maintenance recovery batch 1 | Maintenance is basic | Add list/detail status workflow and reporting service | WhatsApp/PDF | Current maintenance table | `features/maintenance/*` | maintenance tests | CRUD/filter stable. |
| 9 | Accounting ledger design and minimal schema proposal | Accounting blocked | Chart/account/journal posting design | Trial balance UI | None | docs/migrations proposal only | schema validation once applied | No fake accounting reports. |
| 10 | Document template foundation | Needed before PDF | Header/footer/logo/signature/template data model | PDF rendering | Persistent settings decision | docs/documents or schema proposal | template model tests later | Arabic-safe PDF can start after this. |

## 12. Do-not-forget checklist

- [ ] arrears aging
- [ ] overdue invoices
- [ ] collection workflows
- [ ] WhatsApp click-to-chat
- [ ] WhatsApp templates
- [ ] communication log
- [ ] tenant statements
- [ ] contract statements
- [ ] property statements
- [ ] owner statements
- [ ] owner portal/reporting
- [ ] owner relationship model
- [ ] rent roll
- [ ] occupancy reports
- [ ] contract expiry alerts
- [ ] maintenance reports
- [ ] accounting ledger
- [ ] chart of accounts
- [ ] journal entries
- [ ] account ledger
- [ ] trial balance
- [ ] income statement
- [ ] balance sheet
- [ ] reconciliation
- [ ] receipts print
- [ ] invoice print
- [ ] contract print
- [ ] Arabic-safe PDF
- [ ] document header/footer/logo/signatures
- [ ] settings/company profile
- [ ] permissions/users
- [ ] import/export
- [ ] mobile responsiveness
- [ ] unified modals/forms
- [ ] dashboard final rebuild
- [ ] dead-code cleanup

## 13. Top findings

### Top disconnected/orphan/incomplete findings

1. Accounting route is reachable but intentionally an empty shell.
2. Settings/company/users UI is local state only, not persistent.
3. Arrears/aging report hooks exist but are not surfaced as a dedicated workflow.
4. Reports page duplicates calculation logic instead of using the report service layer.
5. Receipt records are projected from payments and not durable printable artifacts.
6. Legacy source remains present as reference but is excluded from current compiled boot path.

### Top blocked-by-schema findings

1. Owner reporting requires durable owner relationships beyond `owner_name` text.
2. Accounting statements require accounts/journal entries/ledger schema.
3. WhatsApp requires phone normalization, templates, and communication logs.
4. Document/PDF requires persistent company settings and template metadata.
5. Permissions require app role/permission tables, not only Supabase auth session guard.

## 14. PR change confirmation

This PR adds documentation only:

- Added: `docs/RENTRIX_FULL_REPO_PRODUCT_RECOVERY_AUDIT.md`
- No app code changed.
- No routes changed.
- No UI added.
- No schema or migration added.
- No files removed.
- No imports from `legacy-src`.
- No reintroduction of `useApp`, `AppContext`, `dataService`, local DB, or `react-router-dom`.

## 15. Checks to run before merge

Because this PR is docs-only, the minimum required check is:

```bash
git diff --check
```

For audit evidence completeness, also run and paste results into the PR thread or CI summary:

```bash
npm --prefix artifacts/rentrix run typecheck
npm --prefix artifacts/rentrix run build
npm --prefix artifacts/rentrix run lint
npm --prefix artifacts/rentrix test
npm --prefix artifacts/rentrix run test:financials
```

If any command fails, preserve the failure output and open a follow-up fix PR rather than hiding it in this docs-only audit.
