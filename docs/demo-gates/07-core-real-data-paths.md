# Core Real-Data Paths

Evidence level: CODE_PRESENT. Live data verification is UNKNOWN.

## Forbidden dependency scan

Command `rg -n "useApp|AppContext|dataService|legacy-src|\.migration-backup|react-router-dom|mock|fixture|db\." artifacts/rentrix/src` found no `useApp`, `AppContext`, `dataService`, `legacy-src`, `.migration-backup`, or `react-router-dom` hits in current runtime code. The `db.` hits are limited to document-rendering helpers over an injected `AppLikeDb` model, not imports of legacy runtime services. `artifacts/rentrix/src/services/documents/DocumentEngine.ts:29-34`

## Data-source classification

| Feature | Classification | Evidence |
| --- | --- | --- |
| Dashboard | CURRENT_RPC and CURRENT_SUPABASE_SERVICE | Counts use `supabase.from(...)`; financial summary uses `supabase.rpc('rpt_financial_summary')`. `artifacts/rentrix/src/app/dashboardService.ts:45-82` |
| Properties | CURRENT_SUPABASE_SERVICE and CURRENT_QUERY_HOOK | Hooks use TanStack Query/mutations; service inserts/updates `properties`. `artifacts/rentrix/src/features/properties/use-properties.ts:1-57`; `artifacts/rentrix/src/features/properties/property-service.ts:61-84` |
| Units | CURRENT_SUPABASE_SERVICE and CURRENT_QUERY_HOOK | Unit hooks use TanStack Query/mutations; service writes `units`. `artifacts/rentrix/src/features/units/use-units.ts:1-54`; `artifacts/rentrix/src/features/units/unit-service.ts:42-63` |
| People | CURRENT_SUPABASE_SERVICE and CURRENT_QUERY_HOOK | People service writes `people`; hooks use TanStack Query/mutations. `artifacts/rentrix/src/features/people/people-service.ts:61-84`; `artifacts/rentrix/src/features/people/use-people.ts:1-57` |
| Tenants | CURRENT_SUPABASE_SERVICE and CURRENT_QUERY_HOOK | Tenant workspace hook uses `useQuery`; service exports `listTenantWorkspace`. `artifacts/rentrix/src/features/tenants/useTenantWorkspace.ts:1-11`; `artifacts/rentrix/src/features/tenants/tenantWorkspaceService.ts:140` |
| Owners | CURRENT_SUPABASE_SERVICE and CURRENT_QUERY_HOOK | Owner hooks expose query/mutation flows; owner service exports owner and property-owner operations. `artifacts/rentrix/src/features/owners/useOwners.ts:40-124`; `artifacts/rentrix/src/features/owners/ownerService.ts:177-288` |
| Contracts | CURRENT_SUPABASE_SERVICE, CURRENT_RPC, CURRENT_QUERY_HOOK | Contract service uses Supabase table writes and `renew_contract_atomic`; form route loads properties, people, and units through current services. `artifacts/rentrix/src/features/contracts/services/contractService.ts:40-70`; `artifacts/rentrix/src/features/contracts/ContractFormPage.tsx:35-37` |
| Financials | CURRENT_RPC, CURRENT_SUPABASE_SERVICE, CURRENT_QUERY_HOOK | Payment service calls `record_invoice_payment_atomic`; financial report hooks use TanStack Query. `artifacts/rentrix/src/features/financials/payments/paymentService.ts:42`; `artifacts/rentrix/src/features/financials/reports/useFinancialReports.ts:44-101` |
| Invoices | CURRENT_SUPABASE_SERVICE and CURRENT_QUERY_HOOK | Invoice service/hook files are present and covered by the financial validation suite. Command `pnpm --filter ./artifacts/rentrix run test:financials` passed 15 files/53 tests. |
| Receipts | CURRENT_SUPABASE_SERVICE and CURRENT_QUERY_HOOK | Receipt service reads context from `units`, `properties`, and `people`; receipt hook uses `useQuery`. `artifacts/rentrix/src/features/financials/receipts/receiptService.ts:104-110`; `artifacts/rentrix/src/features/financials/receipts/useReceipts.ts:1-15` |
| Expenses | CURRENT_SUPABASE_SERVICE and CURRENT_QUERY_HOOK | Expense service updates `expenses`; hooks use TanStack Query/mutations. `artifacts/rentrix/src/features/financials/expenses/expenseService.ts:38`; `artifacts/rentrix/src/features/financials/expenses/useExpenses.ts:1-23` |
| Maintenance | CURRENT_SUPABASE_SERVICE and CURRENT_QUERY_HOOK | Maintenance service reads/inserts `maintenance_requests`; hooks use TanStack Query/mutations. `artifacts/rentrix/src/features/maintenance/maintenance-service.ts:9-33`; `artifacts/rentrix/src/features/maintenance/use-maintenance.ts:1-8` |
| Reports | CURRENT_QUERY_HOOK / UI report surface | Report and financial report files are current runtime files; live data path is not browser-verified. `artifacts/rentrix/src/features/reports/reports-page.tsx:1`; `artifacts/rentrix/src/features/financials/reports/useFinancialReports.ts:44-101` |
| Settings | CURRENT_SUPABASE_SERVICE and CURRENT_QUERY_HOOK | Company settings service reads/updates `company_settings`; hooks use TanStack Query/mutations. `artifacts/rentrix/src/features/settings/companySettingsService.ts:175-188`; `artifacts/rentrix/src/features/settings/useCompanySettings.ts:12-32` |
| Accounting | REDIRECT_ONLY | `/accounting` redirects to `/financials`; page returns `null`. `artifacts/rentrix/src/routeTree.ts:82`; `artifacts/rentrix/src/features/accounting/accounting-page.tsx:1-3` |

## Conclusion

Core route code uses current Supabase-backed services, current RPCs, and current TanStack Query hooks. No current runtime import of historical mock data, in-memory database flows, React Router, `useApp`, `AppContext`, or legacy global `dataService` was found. Live data verification is UNKNOWN because no safe read-only database access was available.
