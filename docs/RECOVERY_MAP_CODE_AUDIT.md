# Rentrix Code-Based Recovery Map

Date: 2026-05-16  
Branch: `recovery-code-audit-map`  
Purpose: define the executable recovery map from real code files, not prior prose reports.

## Scope inspected

This map is based on direct code/file inventory from three sources:

1. Current deployed GitHub app on `main`:
   - `artifacts/rentrix/src`
   - `artifacts/rentrix/src/routeTree.ts`
   - `artifacts/rentrix/src/layouts/app-shell.tsx`
   - current feature folders under `artifacts/rentrix/src/features/*`
2. Uploaded legacy package `rentrixxx-main.zip`:
   - `rentrixxx-main/artifacts/rentrix/src/ui/*`
   - `rentrixxx-main/artifacts/rentrix/src/components/*`
   - `rentrixxx-main/artifacts/rentrix/src/services/*`
3. Uploaded full/2026 package `Rentrix-2026-main.zip`:
   - `Rentrix-2026-main/src/pages/*`
   - `Rentrix-2026-main/src/components/*`
   - `Rentrix-2026-main/src/components/print/*`
   - `Rentrix-2026-main/src/services/*`
   - `Rentrix-2026-main/src/redesign/*`

This file intentionally does not import or wire legacy code. It is the implementation checklist for the next recovery PRs.

---

## 1. Current deployed app inventory

The current deployed app is a smaller Supabase/TanStack implementation. Its active route surface is:

| Route | Current page/component | Status |
|---|---|---|
| `/login` | `src/app/login-page.tsx` | Working but visually basic |
| `/` | `src/app/dashboard-page.tsx` | Basic KPI cards only |
| `/properties` | `src/features/properties/properties-list-page.tsx` | Basic property CRUD/list |
| `/properties/new` | `src/features/properties/property-form-page.tsx` | Basic form |
| `/properties/$propertyId` | `src/features/properties/property-detail-page.tsx` | Basic details |
| `/properties/$propertyId/edit` | `src/features/properties/property-form-page.tsx` | Basic edit |
| `/people` | `src/features/people/people-list-page.tsx` | Generic people list, not tenant-specific UX |
| `/people/new` | `src/features/people/person-form-page.tsx` | Basic form |
| `/people/$personId/edit` | `src/features/people/person-form-page.tsx` | Basic edit |
| `/owners` | `src/features/owners/OwnersPage.tsx` | Partial owner management |
| `/contracts` | `src/features/contracts/ContractsListPage.tsx` | Better than basic: filters/search/export/expand rows |
| `/contracts/new` | `src/features/contracts/ContractFormPage.tsx` | Basic contract form |
| `/contracts/$contractId` | `src/features/contracts/ContractDetailPage.tsx` | Detail page |
| `/contracts/$contractId/edit` | `src/features/contracts/ContractFormPage.tsx` | Edit form |
| `/financials` | `src/features/financials/financials-page.tsx` | Functional but overloaded page |
| `/accounting` | `src/features/accounting/accounting-page.tsx` | Placeholder shell only |
| `/reports` | `src/features/reports/reports-page.tsx` | Basic charts/CSV; logic partly duplicated |
| `/maintenance` | `src/features/maintenance/maintenance-page.tsx` | Basic maintenance workflow |
| `/settings` | `src/features/settings/settings-page.tsx` | UI/local-state settings; not a durable company profile |

Current navigation includes only:

- Dashboard
- Properties
- People
- Owners
- Contracts
- Financials
- Accounting
- Reports
- Maintenance
- Settings

---

## 2. Legacy/full app source inventory

### `rentrixxx-main.zip` high-value sources

| Area | Files discovered | Notes |
|---|---|---|
| Shell/App | `artifacts/rentrix/src/App.tsx`, `app/layouts/AppShellLayout.tsx`, `config/routes.ts`, `config/navigationMeta.ts` | Older app shell/navigation architecture. Use for UX reference only. |
| Auth | `contexts/AppContext.tsx`, `contexts/authContext.tsx`, `hooks/useAuthCore.tsx`, `hooks/specialized/useAuthHook.ts` | Do not bulk-port; current Supabase auth is the runtime path. |
| Invoices | `components/invoices/InvoiceFilters.tsx`, `InvoiceForm.tsx`, `InvoiceTable.tsx`, `QuickPayModal.tsx`, `StatCard.tsx` | Strong candidates for UI behavior recovery. |
| Reports | `components/reports/ReportsDashboard.tsx` | Candidate for reports UX, but must use current report services. |
| Print/shared | `components/print/PrintTemplate.tsx`, `components/shared/PrintPreviewModal.tsx`, `DocumentHeader.tsx`, `AttachmentsManager.tsx` | Use after document-template foundation. |
| Settings | `components/settings/*Settings.tsx` | Good breakdown for settings sections; persistence still needed. |
| Shared UX | `components/shared/ActionsMenu.tsx`, `ConfirmActionModal.tsx`, `DeleteConfirmationModal.tsx`, `SearchFilterBar.tsx`, `WhatsAppComposerModal.tsx` | Reusable UX patterns; adapt to current component system. |
| Finance | `components/finance/FinanceIntelligenceHub.tsx`, `ManualVoucherForm.tsx`, `contexts/financeContext.tsx`, `hooks/useFinance.ts` | Use carefully; current financial DB/RPCs differ. |

### `Rentrix-2026-main.zip` high-value sources

| Area | Files discovered | Notes |
|---|---|---|
| App/shell | `src/components/layout/AppShell.tsx`, `src/app/navRoutes.ts`, `src/app/routeManifest.ts`, `src/redesign/components/ExecutiveMobileNav.tsx` | Likely best source for visual/navigation parity. |
| Dashboard | `src/pages/Dashboard.tsx`, `src/redesign/pages/ExecutiveDashboard.tsx` | Best source for dashboard layout and executive cards. |
| Properties/Units | `src/pages/PropertiesAndUnits.tsx`, `src/pages/PropertyMap.tsx` | Missing from current route set. |
| Tenants | `src/pages/Tenants.tsx`, `src/pages/TenantLedgerReport.tsx` | Current `/people` is not enough for tenant UX. |
| Owners | `src/pages/Owners.tsx`, `src/pages/OwnerView.tsx`, `src/pages/OwnerLedgerReport.tsx` | Owner hub/portal/ledger sources. |
| Contracts | `src/pages/Contracts.tsx`, `src/redesign/pages/ExecutiveContracts.tsx`, `src/pages/print/PrintContract.tsx`, `src/components/print/ContractPrintable.tsx` | Current contracts already has some recovery; use 2026 for remaining UX. |
| Financials/Invoices | `src/pages/Financials.tsx`, `src/pages/Invoices.tsx`, `src/components/forms/InvoiceForm.tsx` | Best source for standalone invoice/payment UX. |
| Print/PDF | `src/components/print/*`, `src/pages/print/*`, `src/services/pdfService.ts`, `src/services/cairoFontBase64.ts` | Must wait for persistent settings/templates. |
| Reports | `src/pages/Reports.tsx`, `src/components/print/ReportDocumentLayout.tsx`, ledger report pages | Use after report service consolidation. |
| Accounting | `src/pages/Accounting.tsx`, `src/services/accountingService.ts` | Blocked by ledger schema/posting rules. |
| Communications | `src/pages/CommunicationHub.tsx`, `src/components/shared/WhatsAppComposerModal.tsx`, `src/services/whatsappService.ts` | Use after phone normalization + logs. |
| Other modules | `Leads.tsx`, `Lands.tsx`, `Commissions.tsx`, `AuditLog.tsx`, `RentrixAI.tsx`, `Backup.tsx`, `HR.tsx`, `Missions.tsx`, `System.tsx` | Add as later route placeholders before full recovery. |

---

## 3. Screen-by-screen recovery map

| Domain | Current implementation | Legacy/full source of truth | Missing from current app | Recovery decision |
|---|---|---|---|---|
| Login/Auth UI | `src/app/login-page.tsx` | `rentrixxx-main/src/ui/Login.tsx`; `Rentrix-2026/src/pages/Login.tsx`; `ChangePassword.tsx` | Branded login, change-password UX, richer messages | Recover visual UX only; keep current Supabase auth/session guard. |
| App Shell/Nav | `src/layouts/app-shell.tsx` | `Rentrix-2026/src/components/layout/AppShell.tsx`, `src/redesign/*`, `navRoutes.ts` | More complete module list, mobile nav, command palette, legacy module parity | PR-1 should restore navigation parity with safe placeholders. |
| Dashboard | `src/app/dashboard-page.tsx` + `dashboardService.ts` | `rentrixxx-main/src/ui/Dashboard.tsx`, `Rentrix-2026/src/pages/Dashboard.tsx`, `ExecutiveDashboard.tsx` | Contract expiry, overdue balance, monthly rent, collection trends, alerts, occupancy charts, quick actions | Recover after financial/report services are stable; do not fake KPIs. |
| Properties/Units | `src/features/properties/*`, `src/features/units/*` | `rentrixxx-main/src/ui/Properties.tsx`, `Rentrix-2026/src/pages/PropertiesAndUnits.tsx`, `PropertyMap.tsx` | Combined property/unit workspace, unit quick actions, property map, occupancy UX | Add `/property-map` placeholder in nav; recover combined workspace later. |
| Tenants | Generic `src/features/people/*` | `rentrixxx-main/src/ui/Tenants.tsx`, `Rentrix-2026/src/pages/Tenants.tsx`, `TenantLedgerReport.tsx` | Tenant-specific screen, tenant ledger, tenant statement/history/documents | Add `/tenants` route backed by people where type=tenant; do not replace `/people` yet. |
| Owners | `src/features/owners/*` | `rentrixxx-main/src/ui/Owners.tsx`, `OwnersHub.tsx`, `OwnerView.tsx`; `Rentrix-2026/src/pages/Owners.tsx`, `OwnerLedgerReport.tsx` | Owner hub, owner portal, owner ledger/statement, owner financial rollups | Existing `/owners` remains; add owner hub/ledger after owner relationship data is validated. |
| Contracts | `src/features/contracts/*` | `rentrixxx-main/src/ui/Contracts.tsx`; `Rentrix-2026/src/pages/Contracts.tsx`, `ContractPrintable.tsx`, `PrintContract.tsx` | Stats cards, last payments, balance, print/PDF, attachments, maintenance block | Current list already has search/filter/export/expand; next PR should add stats/balance/last payment placeholders. |
| Financials | `src/features/financials/financials-page.tsx` | `rentrixxx-main/src/ui/Finance.tsx`, `Financials.tsx`; `Rentrix-2026/src/pages/Financials.tsx` | Clear section/page split, richer payment UX, better expense filtering | Split page into section files; preserve current hooks. |
| Invoices | `src/features/financials/invoices/*` | `rentrixxx-main/components/invoices/*`, `src/ui/Invoices.tsx`; `Rentrix-2026/src/pages/Invoices.tsx` | Standalone invoices route, stats, advanced filters, manual invoice form, QuickPay modal, actions | Add `/invoices`; recover UI using current invoice/payment hooks. |
| Payments | `src/features/financials/payments/*` | `QuickPayModal.tsx`, `Rentrix-2026/src/pages/Invoices.tsx` | Method selector, reference, date selector, better validation UX | Update current `onPostPayment` away from hard-coded `cash`/`null`. |
| Receipts | `src/features/financials/receipts/*` | `ReceiptPrintable.tsx`, `PrintReceipt.tsx`, `PrintPreviewModal.tsx` | Durable/formal receipt artifact, print/PDF, numbering policy | Do not start PDF until document template/settings foundation. |
| Reports | `src/features/reports/reports-page.tsx`, `src/features/financials/reports/*` | `rentrixxx-main/components/reports/ReportsDashboard.tsx`, `Rentrix-2026/src/pages/Reports.tsx` | Full report dashboard, aged receivables UI, rent roll, statements, print/export discipline | Consolidate reports onto current service hooks before adding screens. |
| Arrears | Current components under `features/financials/components/arrears-*` | `rentrixxx-main/src/ui/financial/Arrears.tsx` | Dedicated route/workflow, collection queue, actions | Add `/arrears` route reusing current ArrearsWorkflowSection. |
| Accounting | `src/features/accounting/accounting-page.tsx` placeholder | `rentrixxx-main/src/ui/Accounting.tsx`, `GeneralLedger.tsx`, `services/accountingService.ts`; `Rentrix-2026/src/pages/Accounting.tsx` | Chart of accounts, journal entries, general ledger, trial balance, financial statements | Keep placeholder until ledger schema and posting rules are designed. |
| Maintenance | `src/features/maintenance/*` | `rentrixxx-main/src/ui/Maintenance.tsx`, `Rentrix-2026/src/pages/Maintenance.tsx`, `MaintenancePrintable.tsx` | Assignment, cost tracking, report/print, attachments, alerts | Recover operational depth after contracts/financials. |
| Communications | Not in current app | `CommunicationHub.tsx`, `WhatsAppComposerModal.tsx`, `whatsappService.ts` | WhatsApp composer, templates, logs, bulk reminders | Add route placeholder now; full feature after arrears/phone/logs. |
| Attachments | Not in current app | `AttachmentsManager.tsx` in both legacy/full sources | Entity attachments for contracts/properties/tenants | Requires storage/table design before UI. |
| Documents/PDF | Not wired in current app | `Rentrix-2026/src/components/print/*`, `src/pages/print/*`, `pdfService.ts` | Arabic-safe print/PDF for receipts/invoices/contracts/reports | Requires persistent settings + document template foundation first. |
| Settings/System | `src/features/settings/settings-page.tsx` | `rentrixxx-main/components/settings/*`, `Rentrix-2026/src/pages/Settings.tsx`, `System.tsx` | Persistent company profile, document settings, users/permissions, backup settings | Recover settings sections, then add persistence. |
| Audit/AI/CRM | Not in current app | `AuditLog.tsx`, `RentrixAI.tsx`, `Leads.tsx`, `Lands.tsx`, `Commissions.tsx` | Entire modules absent | Add safe placeholders in nav; recover later only if still required. |

---

## 4. First three executable PRs

### PR-1: Restore shell/navigation parity with safe placeholders

Branch suggestion: `recovery-shell-navigation-parity`

Touch:

- `artifacts/rentrix/src/routeTree.ts`
- `artifacts/rentrix/src/layouts/app-shell.tsx`
- new placeholder pages under `artifacts/rentrix/src/features/*` or `artifacts/rentrix/src/app/placeholders/*`

Add safe routes for:

- `/tenants`
- `/invoices`
- `/arrears`
- `/communication`
- `/property-map`
- `/audit-log`
- `/smart-assistant`
- `/leads`
- `/lands`
- `/commissions`

Acceptance:

- App still builds.
- Existing routes unchanged.
- Placeholders clearly say “Recovery pending”.
- No legacy `react-router-dom`, `useApp`, `AppContext`, `dataService`, or local DB imports.

### PR-2: Recover invoice/payment UX on top of current services

Branch suggestion: `recovery-invoices-payments-ux`

Touch:

- `artifacts/rentrix/src/features/financials/financials-page.tsx`
- `artifacts/rentrix/src/features/financials/components/*`
- `artifacts/rentrix/src/features/financials/invoices/*`
- `artifacts/rentrix/src/features/financials/payments/*`
- optional `/invoices` route added in PR-1

Recover from:

- `rentrixxx-main/artifacts/rentrix/src/components/invoices/InvoiceFilters.tsx`
- `rentrixxx-main/artifacts/rentrix/src/components/invoices/InvoiceTable.tsx`
- `rentrixxx-main/artifacts/rentrix/src/components/invoices/QuickPayModal.tsx`
- `Rentrix-2026-main/src/pages/Invoices.tsx`

Do now:

- Add method selector.
- Add payment date.
- Add payment reference.
- Add richer invoice filters/actions.
- Reuse current `post_receipt_atomic` path.

Do not do yet:

- PDF/receipt print.
- WhatsApp bulk sends.
- Direct invoice delete unless reversal/void policy is finalized.

### PR-3: Recover contracts UX batch 1

Branch suggestion: `recovery-contracts-ux-batch-1`

Touch:

- `artifacts/rentrix/src/features/contracts/ContractsListPage.tsx`
- `artifacts/rentrix/src/features/contracts/ContractDetailPage.tsx`
- `artifacts/rentrix/src/features/contracts/services/contractService.ts`

Recover from:

- `rentrixxx-main/artifacts/rentrix/src/ui/Contracts.tsx`
- `Rentrix-2026-main/src/pages/Contracts.tsx`
- `Rentrix-2026-main/src/redesign/pages/ExecutiveContracts.tsx`

Do now:

- Stats cards.
- Stronger filters.
- Last payment/balance read model if available from current services.
- Maintenance block warning before contract creation if data exists.

Do not do yet:

- Contract PDF.
- Attachments.
- Full accounting balance if ledger is not ready.

---

## 5. Non-negotiable guardrails

- Do not bulk-copy legacy files into `src`.
- Do not reintroduce `react-router-dom`.
- Do not reintroduce `useApp` / `AppContext` into current deployed app.
- Do not reintroduce `dataService` or client-side local DB as source of truth.
- All recovered UI must use current Supabase services/hooks or new typed service adapters.
- Print/PDF waits for document templates + persistent company settings.
- Accounting waits for ledger schema/posting rules.
- Owner statements wait for durable owner relationship verification.
- WhatsApp bulk workflows wait for communication log + phone normalization.

---

## 6. Immediate status

This PR only creates the code-based recovery map. It does not change runtime behavior.

Next action after merge: start `PR-1: Restore shell/navigation parity with safe placeholders`.
