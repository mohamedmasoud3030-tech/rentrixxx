# 07 - Demo Gap Analysis

## Demo classification

| Feature | Classification | Already demo-ready? | Needs selective porting? | Needs adapter work? | Requires database verification? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| login | DEMO_BLOCKER | Yes | No | No | Supabase auth env for staging | Must validate sign-in/sign-out and refresh. |
| dashboard | DEMO_REQUIRED | Yes | No | No | Summary data availability | Current route is baseline. |
| properties | DEMO_REQUIRED | Yes | No | No | Properties/ownership tables | Current CRUD should remain. |
| units | DEMO_REQUIRED | Yes | No | No | Units table | Current tested feature. |
| owners | DEMO_REQUIRED | Yes | No | No | Owners/links | Current owners feature. |
| tenants | DEMO_REQUIRED | Yes | No | No | People table tenant type | Current tenants page. |
| contracts | DEMO_REQUIRED | Yes | No | No | Contracts/units/people | Current list/detail/form. |
| invoices | DEMO_REQUIRED | Mostly | Optional merge | No for current | Invoices/payments | Keep current for demo; old UI optional. |
| payments | DEMO_REQUIRED | Yes | No | No | Payment/receipt tables | Current tests passed. |
| receipts | DEMO_REQUIRED | Yes | No | No | Receipts table | Current tests passed. |
| maintenance | DEMO_REQUIRED | Yes | No | No | Maintenance table | Current tests present. |
| reports | DEMO_USEFUL | Yes | No | No | Report queries | Useful but not blocker if data sparse. |
| permissions | DEMO_BLOCKER | Partial | No | Yes | Auth roles | Validate role-safe routes in staging. |
| Vercel deployment | DEMO_BLOCKER | Config exists | No | No | Env vars | Do not change config; validate deploy. |
| refresh-safe routes | DEMO_BLOCKER | Expected via Vercel/current router | No | No | Vercel rewrite | Validate deep links. |
| sign-out/sign-in | DEMO_BLOCKER | Auth exists | No | No | Supabase auth | Manual staging smoke. |
| loading states | DEMO_REQUIRED | Yes in core pages | No | No | N/A | Current skeletons/empty states exist. |
| empty states | DEMO_REQUIRED | Yes in core pages | No | No | N/A | Demo should include empty-account behavior. |
| recoverable error states | DEMO_REQUIRED | Mostly | No | Maybe | Supabase diagnostics | Current incomplete-env diagnostics are intentional. |
| audit log | DEMO_USEFUL | No | Yes | Yes | `auditLog` table | Good pilot but not demo blocker. |
| change password | DEMO_USEFUL | No explicit route | Yes | Yes | Auth provider state | Useful for admin onboarding. |
| owners hub | DEMO_USEFUL | No | Yes | Yes | Owner aggregate tables | Useful client wow, not blocker. |
| accounting/general ledger | POST_DEMO | No | Yes | Yes | Accounts/journal schema | Do not block demo. |
| lands/leads/communication/commissions | POST_DEMO | No | Yes | Yes | Feature tables | Defer until after core demo. |
| smart assistant/property map | DEFER | No | No immediate | Yes | AI/map/env/data exposure | Must not block demo. |

## Shortest safe path

The shortest safe staging demo is to keep the current runtime shell and validate real behavior for login, refresh-safe protected routes, dashboard, properties, units, owners, tenants, contracts, invoices/payments/receipts, expenses, maintenance, reports, settings, loading states, empty states, recoverable Supabase diagnostics, and sign-out/sign-in. Optional selective porting before demo should be limited to a read-only AuditLog pilot only if the audit table exists and permissions can be verified without financial writes.

## Demo blockers

1. Staging Supabase auth/env must be configured and verified.
2. Protected/deep routes must refresh successfully on Vercel without changing config.
3. Permissions must prevent unauthorized access to protected/admin/finance routes.
4. Core CRUD/read paths must operate against staging data without relying on historical `db` or mock data.

