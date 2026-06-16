# Route Smoke Matrix

Recorded on: 2026-06-05

## Evidence summary

- Static route source: `artifacts/rentrix/src/routeTree.ts`.
- Navigation source: `artifacts/rentrix/src/layouts/app-nav-items.ts`.
- Automated parity evidence: `artifacts/rentrix/src/layouts/app-nav-items.test.ts` verifies required route registration, nav/quick-link target parity, guarded nav permission parity, duplicate nav prevention, explicit unavailable module routes, and invalid-route fallback registration.
- Browser automation status: unavailable locally. `command -v chromium`, `command -v chromium-browser`, `command -v google-chrome`, and `command -v playwright` returned no executable path in this container.

## Matrix

| Route | Route exists | Wrapper/source | Navigation source | Permission | Guard and refresh notes | UI state notes | RTL/mobile notes | Blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/login` | Yes | `_auth.login.tsx` | Direct auth route | Public unauthenticated | Redirects away when a session exists | Login state depends on auth provider | Arabic/RTL static only | Manual auth smoke required |
| `/` | Yes | `_protected.index.tsx` | Main nav | Authenticated | Protected parent redirects to `/login` without session | Dashboard cards use current queries | Arabic/RTL static only | Manual populated smoke required |
| `/properties` | Yes | `_protected.properties.tsx` | Main nav | Authenticated | Protected parent | List states covered by current page patterns | Arabic/RTL static only | Manual CRUD smoke required |
| `/properties/new` | Yes | `_protected.properties.new.tsx` | Quick link | Authenticated | Protected parent | Form validation available | Arabic/RTL static only | Manual create smoke required |
| `/properties/$propertyId` | Yes | `_protected.properties.$propertyId.tsx` | In-app links | Authenticated | Protected parent and param route | Detail recovery depends on query state | Arabic/RTL static only | Manual direct refresh required |
| `/properties/$propertyId/edit` | Yes | `_protected.properties.$propertyId.edit.tsx` | In-app links | Authenticated | Protected parent and param route | Form hydration depends on query state | Arabic/RTL static only | Manual direct refresh required |
| `/units` | Yes | `_protected.units.tsx` | Main nav | Authenticated | Protected parent | Unit status normalization tests exist | Arabic/RTL static only | Live status drift verification required |
| `/people` | Yes | `_protected.people.tsx` | Main nav | Authenticated | Protected parent | List/search states use current service | Arabic/RTL static only | Manual smoke required |
| `/people/new` | Yes | `_protected.people.new.tsx` | Quick link | Authenticated | Protected parent | Form validation available | Arabic/RTL static only | Manual create smoke required |
| `/people/$personId/edit` | Yes | `_protected.people.$personId.edit.tsx` | In-app links | Authenticated | Protected parent and param route | Edit hydration depends on query state | Arabic/RTL static only | Manual direct refresh required |
| `/tenants` | Yes | `_protected.tenants.tsx` | Main nav | Authenticated | Protected parent | Tenant list boundary retained | Arabic/RTL static only | Manual smoke required |
| `/owners` | Yes | `_protected.owners.tsx` | Main nav | `owners.hub.view` | Route guard matches nav permission | Owner bundle tests exist | Arabic/RTL static only | Production claims verification required |
| `/owners-hub` | Yes | `_protected.owners-hub.tsx` | Main nav | `owners.hub.view` | Route guard matches nav permission | Read-focused hub boundary | Arabic/RTL static only | Production claims verification required |
| `/owners/$ownerId` | Yes | `_protected.owners.$ownerId.tsx` | In-app links | `owners.detail.view` | Direct guard present | Detail depends on owner service | Arabic/RTL static only | Production claims verification required |
| `/lands` | Yes | `_protected.lands.tsx` | Main nav | `lands.view` | Route guard matches nav permission | Explicit unavailable/read-safe state | Arabic/RTL static only | Live schema verification required |
| `/leads` | Yes | `_protected.leads.tsx` | Main nav | `leads.view` | Route guard matches nav permission | Explicit unavailable/read-safe state | Arabic/RTL static only | Live schema/product decision required |
| `/contracts` | Yes | `_protected.contracts.tsx` | Main nav | Authenticated | Protected parent | Loading/error/empty tests and unit-option tests exist | Arabic/RTL static only | Occupancy overlap backend blocker |
| `/contracts/new` | Yes | `_protected.contracts.new.tsx` | Quick link | Authenticated | Protected parent | Unit/property/availability submit guard added | Arabic/RTL static only | Occupancy overlap backend blocker |
| `/contracts/$contractId` | Yes | `_protected.contracts.$contractId.tsx` | In-app links | Authenticated | Protected parent and param route | Detail recovery/error tests exist | Arabic/RTL static only | Manual direct refresh required |
| `/contracts/$contractId/edit` | Yes | `_protected.contracts.$contractId.edit.tsx` | In-app links | Authenticated | Protected parent and param route | Linked unavailable unit hydration allowed only for current edit unit | Arabic/RTL static only | Manual direct refresh required |
| `/financials` | Yes | `_protected.financials.tsx` | Main nav | Authenticated | Protected parent | Invoice/payment/receipt workspace states tested by feature tests | Arabic/RTL static only | RPC security audit required |
| `/invoices` | Yes | `_protected.invoices.tsx` | Main nav | Authenticated | Protected parent | Invoice list/detail states tested | Arabic/RTL static only | Manual smoke required |
| `/receipts` | Yes | Direct `ReceiptsPage` import in `routeTree.ts` | Reports receipt links via query string | Authenticated | Protected parent; no separate route wrapper file | Payment-backed receipt id path retained | Arabic/RTL static only | Manual print smoke required |
| `/expenses` | Yes | `_protected.expenses.tsx` | Main nav | Authenticated | Protected parent | Expense page tests exist | Arabic/RTL static only | Manual create/edit smoke required |
| `/arrears` | Yes | `_protected.arrears.tsx` | Main nav | Authenticated | Protected parent | Arrears zero/error states covered by financial tests | Arabic/RTL static only | Manual as-of smoke required |
| `/reports` | Yes | `_protected.reports.tsx` | Main nav | Authenticated | Protected parent | CSV injection test added | Arabic/RTL static only | Manual export smoke required |
| `/maintenance` | Yes | `_protected.maintenance.tsx` | Main nav | Authenticated | Protected parent | Service now throws load/mutation failures; tests added | Arabic/RTL static only | Live schema verification required |
| `/commissions` | Yes | `_protected.commissions.tsx` | Main nav | `commissions.view` | Route guard matches nav permission | Explicit unavailable/read-safe state | Arabic/RTL static only | Product/schema decision required |
| `/communication` | Yes | `_protected.communication.tsx` | Main nav | `communication.view` | Route guard matches nav permission | Explicit unavailable/read-safe state; no sends | Arabic/RTL static only | External provider decision required |
| `/system` | Yes | `_protected.system.tsx` | Main nav | `system.view` | Route guard matches nav permission | Governance tests exist | Arabic/RTL static only | RPC/security production audit required |
| `/audit-log` | Yes | `_protected.audit-log.tsx` | Main nav | `audit.view` | Route guard matches nav permission | Read-only/unavailable state when schema cannot be verified | Arabic/RTL static only | Live audit-log schema required |
| `/data-integrity` | Yes | `_protected.data-integrity.tsx` | Main nav | `integrity.view` | Route guard matches nav permission | Safe unavailable/data-integrity states tested | Arabic/RTL static only | Production data verification required |
| `/change-password` | Yes | `_protected.change-password.tsx` | Main nav | `auth.password.change` | Route guard matches nav permission | Change-password tests exist | Arabic/RTL static only | Manual auth smoke required |
| `/settings` | Yes | `_protected.settings.tsx` | Main nav | `settings.manage` | Route guard matches nav permission | Persisted company settings tests exist | Arabic/RTL static only | Production claims verification required |
| `/accounting` | Yes | Redirect route in `routeTree.ts` | Not in nav | Authenticated | Redirects to `/financials` | Accounting-grade module intentionally not wired | Arabic/RTL static only | Deferred advanced module |
| Invalid route fallback | Yes | `notFoundComponent: NotFoundPage` | Not applicable | Not applicable | Root fallback registered | Static only | Browser/manual refresh required | Browser automation unavailable |

