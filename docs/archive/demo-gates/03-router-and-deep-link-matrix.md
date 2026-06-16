# Router And Deep-Link Matrix

Evidence level: CODE_PRESENT for route definitions; HTTP_VERIFIED and BROWSER_VERIFIED are UNKNOWN because no deployment tooling, public deployment URL, or credentials were available.

## Route guard evidence

The TanStack route tree imports the Supabase client and guards auth routes by calling `supabase.auth.getSession()`. `artifacts/rentrix/src/routeTree.ts:1-31`; `artifacts/rentrix/src/routeTree.ts:39-58`

## Route matrix

| Route | Current component | Auth required | Refresh expectation on root Vercel | Expected redirect | Runtime source | Behavior | Staging verification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/login` | `LoginPage` | No; redirects away if already sessioned | Should load SPA entrypoint | Session users redirect to `/` | Current | Auth write flow | UNKNOWN |
| `/` | `DashboardPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | Read-only dashboard/RPC counts | UNKNOWN |
| `/properties` | `PropertiesListPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | CRUD-capable list | UNKNOWN |
| `/properties/new` | `PropertyFormPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | Write-capable create route | UNKNOWN |
| `/units` | `UnitsPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | CRUD-capable | UNKNOWN |
| `/people` | `PeopleListPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | CRUD-capable | UNKNOWN |
| `/tenants` | `TenantsPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | Read-only tenant workspace | UNKNOWN |
| `/owners` | `OwnersPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | CRUD-capable owner/property links | UNKNOWN |
| `/contracts` | `ContractsListPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | CRUD/renewal capable | UNKNOWN |
| `/contracts/new` | `ContractFormPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | Write-capable create route | UNKNOWN |
| `/financials` | `FinancialsPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | Read/RPC-backed summary surface | UNKNOWN |
| `/receipts` | `ReceiptsPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | Read-capable receipts route | UNKNOWN |
| `/expenses` | `ExpensesPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | CRUD-capable expenses route | UNKNOWN |
| `/invoices` | `InvoicesPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | Read/summary invoice route | UNKNOWN |
| `/arrears` | `ArrearsPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | Read/action workflow UI | UNKNOWN |
| `/accounting` | Redirect route | Yes | Should load SPA entrypoint | Redirects to `/financials` | Current redirect | REDIRECT_ONLY | UNKNOWN |
| `/reports` | `ReportsPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | Report UI surface | UNKNOWN |
| `/maintenance` | `MaintenancePage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | CRUD/status-capable | UNKNOWN |
| `/settings` | `SettingsPage` | Yes | Should load SPA entrypoint | Unauthenticated to `/login` | Current | Company-settings update route | UNKNOWN |

Routes and route-to-component mappings are defined in `routeTree.ts`. `artifacts/rentrix/src/routeTree.ts:61-85`; `artifacts/rentrix/src/routeTree.ts:87-115` Route files re-export current runtime components from `artifacts/rentrix/src/features` and `artifacts/rentrix/src/app`. `artifacts/rentrix/src/routes/_protected.properties.tsx:1`; `artifacts/rentrix/src/routes/_protected.contracts.tsx:1`; `artifacts/rentrix/src/routes/_protected.settings.tsx:1`

## `/accounting` note

The active `/accounting` route redirects to `/financials`. `artifacts/rentrix/src/routeTree.ts:82` The accounting route component export exists, but it is not wired into the active route definition; the page itself returns `null`. `artifacts/rentrix/src/routes/_protected.accounting.tsx:1`; `artifacts/rentrix/src/features/accounting/accounting-page.tsx:1-3`

## Deep-link conclusion

Root config supports SPA deep links at CODE_PRESENT level via a catch-all rewrite. `vercel.json:6-8` Preview/Production HTTP and browser deep-link refresh remain UNKNOWN because deployment inspection and browser access were unavailable.
