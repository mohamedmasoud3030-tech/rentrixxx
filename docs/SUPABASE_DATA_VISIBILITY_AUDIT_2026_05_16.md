# Supabase Data Visibility Audit — 2026-05-16

## Executive summary

This is a documentation-only audit for Issue #503. No runtime source, Supabase schema, migration, RLS, Vercel configuration, seed data, or legacy UI code was changed.

The current Rentrix app is a Vite/TanStack/React Query app that reads Supabase directly through one client module: `artifacts/rentrix/src/integrations/supabase/client.ts`. That client requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build/runtime. If the deployed bundle was built with a Supabase URL pointing at a preview/empty project, or if Vercel production env vars differ from the project containing the stored data, every page can legitimately show empty states after login even while data exists in another Supabase project.

Most current reads apply `deleted_at is null`. Several pages additionally apply `status`, `type`, search, date range, pagination, and authenticated RLS checks. The schema currently read by the app is the newer `properties`, `units`, `people`, `contracts`, `invoices`, `payments`, and `expenses` model. Legacy data may still be invisible if it lives in older tables such as `tenants`, `receipts`, `maintenance_records`, owner/balance/ledger tables, or in legacy column names not selected by the current services.

Most likely cause if **all** pages show empty states after successful login: the deployed Vercel build is connected to the wrong Supabase project or a preview/empty Supabase branch, followed by RLS/auth session mismatch. Frontend filters are more likely when only one module is empty.

## Current Supabase client path

- Client path: `artifacts/rentrix/src/integrations/supabase/client.ts`
- Required env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Client options observed:
  - `db.schema = public`
  - Auth session persistence enabled
  - Token auto-refresh enabled
  - URL session detection enabled
  - Auth storage key: `rentrix-auth-session`
- Failure mode: the module throws `Missing Supabase environment variables` if either env var is missing.
- Supporting env helper also validates the same two env vars in `artifacts/rentrix/src/lib/env.ts`, but the active Supabase client reads `import.meta.env` directly.
- CSP allows Supabase connections broadly through `https://*.supabase.co` and `wss://*.supabase.co`; it does not pin a single project ref.

## Production / preview Supabase project refs observed

### Production likely project

The repository does not contain production Vercel env values. The only static project ref found in repo artifacts is in `.migration-backup/.env.example`:

- `nnggcnpcuomwfuupupwg` via `VITE_SUPABASE_URL=https://nnggcnpcuomwfuupupwg.supabase.co`

Recent Supabase bot comments also mention `nnggcnpcuomwfuupupwg` as the connected project for PRs that were ignored because no `supabase` directory changes were detected. Therefore, production is **likely** intended to use `nnggcnpcuomwfuupupwg`, but this must be verified in Vercel Production environment variables and in the deployed browser network requests.

### Recent preview / connected refs from PR comments

Fetched from public GitHub issue/PR comments on 2026-05-16:

| Ref | Where observed | Meaning to verify |
| --- | --- | --- |
| `nnggcnpcuomwfuupupwg` | PR #497 and PR #502 Supabase bot ignored comments | Connected Supabase project for PR checks with no Supabase directory changes; likely production/base project candidate. |
| `crfwjldshjmedrpjgxea` | PR #498 Supabase bot preview branch comment | Preview Branch project for `codex/add-financial-integrity-hardening-plan`. |
| `twgofzagfqprqvitdnkv` | PR #501 Supabase bot preview branch comment | Preview Branch project for `codex/add-financial-integrity-hardening-plan-fq5hj4`. |

Do not assume the deployed production app uses any of these until Vercel env and browser network requests prove the actual `*.supabase.co` host.

## Current table/service map

| Table | Current readers | Key filters / joins / notes |
| --- | --- | --- |
| `properties` | `property-service.ts`, `dashboardService.ts`, `financialReportsService.ts`, `receiptService.ts`, `ownerService.ts`, `FinancialsPage` through `useProperties` | Most reads use `deleted_at is null`; list page supports search on `title`, `address`, `owner_name`, status filter, and pagination; dashboard counts all visible properties; financial/receipt contexts load by ids; financials expense form loads first 100 visible properties. |
| `units` | `unit-service.ts`, `dashboardService.ts`, `financialReportsService.ts`, `receiptService.ts`, `tenantWorkspaceService.ts`, maintenance form through `useUnits` | Uses `deleted_at is null`; `listUnitsByProperty` requires exact `property_id`; dashboard vacant units require `status = available`; joins often hydrate by `unit_id`. |
| `people` | `people-service.ts`, `tenantWorkspaceService.ts`, `financialReportsService.ts`, `receiptService.ts`, contract joins, owner services | Uses `deleted_at is null`; people list supports search on `full_name`, `phone`, `email`, `national_id`, `type` filter, pagination; tenant workspace hard-filters `type = tenant`; owner flows expect owner relationships and/or `type = owner`. |
| `contracts` | `contractService.ts`, `tenantWorkspaceService.ts`, `dashboardService.ts`, `financialReportsService.ts`, `receiptService.ts`, reports/dashboard hooks | Uses `deleted_at is null`; contract list may filter by `status`; dashboard active/expiring counts require `status = active` and date windows; tenant workspace chooses an active contract first; invoice generation RPC reads active contracts. |
| `invoices` | `invoiceService.ts`, `tenantWorkspaceService.ts`, `dashboardService.ts`, `financialReportsService.ts`, `receiptService.ts`, arrears/report hooks | Uses `deleted_at is null`; invoice page defaults to `status = unpaid`, implemented as `status = issued` and `paid_amount = 0`; other filters include `partial`, `paid`, `overdue`, search by id/status; dashboard overdue count requires `status = overdue`; report services apply date ranges and receivable statuses. |
| `payments` | `invoiceService.ts`, `receiptService.ts`, `financialReportsService.ts`, payment hooks/RPC write path | Uses `deleted_at is null`; receipts list defaults to latest 25 payments; financial reports apply `payment_date` range; invoice detail requires `invoice_id`. |
| `expenses` | `expenseService.ts`, `financialReportsService.ts`, dashboard financial RPC | Uses `deleted_at is null`; expense list can filter `property_id`, `category`, `expense_date >= from`, `expense_date <= to`; report preview defaults to current month; dashboard RPC totals current month expenses. |

## Filters and empty states that can hide data

### Cross-cutting filters

1. `deleted_at is null` is applied to almost every list/detail/context query. Soft-deleted legacy rows remain present in SQL counts but invisible to the app.
2. RLS policies are for role `authenticated`; anon requests should not see table rows. If login/session is missing, expired, or pointed at a different project, table queries can return empty/unauthorized results.
3. Exact enum/status values matter. Rows with non-current legacy statuses cannot exist in the enum columns without migration/coercion, but data in old text columns or old tables will be ignored.
4. Pagination can hide rows on later pages; properties and people list pages default to page size 10.
5. Search filters use escaped `ilike` terms and can hide otherwise visible rows until cleared.
6. Date filters in financial reports and dashboard widgets can hide rows outside the current month or selected range.

### Page-specific filters / empty states

- Properties page: search, status, page, page size, and `deleted_at is null`; empty state says no properties and suggests changing filters or adding first property.
- People page: search, type, page, page size, and `deleted_at is null`; tenant pages additionally require `people.type = tenant`.
- Contracts page: service-level status filter plus client-side search over id, tenant name, unit number, and property title; dashboard and reports frequently use only active contracts.
- Invoices page: defaults to `unpaid`, which maps to `status = issued` and `paid_amount = 0`; paid, partial, overdue, or draft invoices are hidden unless the user switches the filter to all or the matching status.
- Receipts section: reads only non-deleted `payments`, capped by a default limit of 25; related invoice/contract/property/unit/person context also requires non-deleted linked rows.
- Expenses section: the current financials page passes empty expense filters for the main expense list, but report previews use current-month ranges.
- Dashboard: shows counts for all visible properties/units, but active contracts, expiring contracts, vacant units, and overdue invoices are all status/date-filtered.
- Reports: default date window is the current month; payment and expense totals use date ranges; arrears uses receivable statuses and an as-of date.

## Current schema and likely legacy mismatch

The current canonical schema creates:

- `properties`: `title`, `type`, `address`, `owner_name`, values, `status`, notes, timestamps, `deleted_at`
- `units`: `property_id`, `unit_number`, `floor`, `status`, `rent_amount`, notes, timestamps, `deleted_at`
- `people`: `full_name`, `phone`, `email`, `national_id`, `type`, `address`, notes, timestamps, `deleted_at`
- `contracts`: `property_id`, `unit_id`, `tenant_id`, dates, `rent_amount`, `payment_cycle`, `status`, cancellation/renewal metadata, notes, timestamps, `deleted_at`
- `invoices`: `contract_id`, dates, `amount`, `paid_amount`, `status`, notes, timestamps, `deleted_at`
- `payments`: `invoice_id`, `amount`, `payment_method`, `payment_date`, `reference_number`, timestamps, `deleted_at`
- `expenses`: `property_id`, `category`, `amount`, `expense_date`, `description`, timestamps, `deleted_at`

Potential mismatch signals from migrations/docs:

- Early integrity migrations contain guarded references to older/adjacent tables such as `owners`, `tenants`, `receipts`, `receipt_allocations`, `journal_entries`, balance tables, `maintenance_records`, `lands`, `missions`, `budgets`, notifications, profiles, organizations, memberships, and subscriptions.
- Current app list pages for the audited tables do not read legacy `tenants` as a separate table; tenants are now `people` rows with `type = tenant`.
- Current receipt UI reads `payments` as canonical posted receipts; it does not read a legacy `receipts` table.
- Current owner work is a newer relationship foundation; older owner data in `owner_name` only or a legacy `owners` table may not appear in owner relationship views until mapped.
- Current services select current snake_case columns only. Legacy display fields, camelCase columns, alternate table names, or records without current FK chains will not appear in the new services.

Therefore, yes: old data can exist in Supabase while the current app shows empty states if the old data is in tables/columns that the current services do not query, or if it was not migrated into the canonical tables with current `deleted_at`, enum, and FK expectations.

## Common root causes

1. **Wrong Supabase project/env**: Vercel Production `VITE_SUPABASE_URL` points at an empty preview branch or a different Supabase project than the one containing the data.
2. **Preview branch drift**: PR preview comments show multiple Supabase refs; Vercel preview/production may be comparing different projects.
3. **Empty current tables**: Data exists elsewhere, but `public.properties`, `public.units`, `public.people`, `public.contracts`, `public.invoices`, `public.payments`, and `public.expenses` are empty in the deployed app's project.
4. **Soft deletes**: Rows exist, but all have `deleted_at is not null`.
5. **RLS/auth mismatch**: Tables are RLS-enabled and hardened to authenticated users; requests without a valid session in the same project cannot see rows.
6. **Status/type mismatch**: Page defaults hide data, especially invoice default `unpaid`, tenant `type = tenant`, active contract dashboard filters, and current-month reports.
7. **Legacy schema mismatch**: Data lives in `tenants`, `receipts`, `owners`, old maintenance tables, ledger/balance tables, or legacy field names that current code never reads.
8. **Stale deployment**: Production deploy was built before env/project changes or before recent merges.
9. **Foreign-key orphaning / context loss**: A visible payment may not hydrate receipt context if its invoice/contract/property/unit/person link is missing or soft-deleted.
10. **Browser cache/session project mix**: `rentrix-auth-session` may hold a session from a different Supabase project if project URLs changed during testing; logout/clear storage and re-login is required.

## Manual SQL diagnostics

Run these manually in the Supabase SQL Editor for the project you believe production should use, and again for any preview/project ref suspected from Vercel or GitHub comments.

```sql
select current_database();
select current_schema();
select 'properties' as table_name, count(*) from public.properties
union all select 'units', count(*) from public.units
union all select 'people', count(*) from public.people
union all select 'contracts', count(*) from public.contracts
union all select 'invoices', count(*) from public.invoices
union all select 'payments', count(*) from public.payments
union all select 'expenses', count(*) from public.expenses;
select 'properties_visible' as table_name, count(*) from public.properties where deleted_at is null
union all select 'units_visible', count(*) from public.units where deleted_at is null
union all select 'people_visible', count(*) from public.people where deleted_at is null
union all select 'contracts_visible', count(*) from public.contracts where deleted_at is null
union all select 'invoices_visible', count(*) from public.invoices where deleted_at is null
union all select 'payments_visible', count(*) from public.payments where deleted_at is null
union all select 'expenses_visible', count(*) from public.expenses where deleted_at is null;
select type, count(*) from public.people where deleted_at is null group by type order by type;
select status, count(*) from public.invoices where deleted_at is null group by status order by status;
select status, count(*) from public.properties where deleted_at is null group by status order by status;
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Additional optional diagnostics for this audit:

```sql
-- Prove whether auth/RLS should allow current logged-in users.
select auth.uid() as current_auth_uid;

-- Compare total rows vs current app visibility for status/type-sensitive screens.
select status, deleted_at is null as visible_by_deleted_filter, count(*)
from public.contracts
group by status, deleted_at is null
order by status, visible_by_deleted_filter desc;

select status, paid_amount = 0 as unpaid_zero_paid, deleted_at is null as visible_by_deleted_filter, count(*)
from public.invoices
group by status, paid_amount = 0, deleted_at is null
order by status, unpaid_zero_paid desc;

select status, deleted_at is null as visible_by_deleted_filter, count(*)
from public.units
group by status, deleted_at is null
order by status, visible_by_deleted_filter desc;

-- Detect likely legacy tables that current audited services do not list from.
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'tenants', 'owners', 'receipts', 'receipt_allocations', 'maintenance_records',
    'journal_entries', 'account_balances', 'owner_balances', 'contract_balances', 'tenant_balances'
  )
order by table_name;

-- Check FK-chain health for current list/detail hydration.
select count(*) as invoices_without_visible_contract
from public.invoices i
left join public.contracts c on c.id = i.contract_id and c.deleted_at is null
where i.deleted_at is null and c.id is null;

select count(*) as payments_without_visible_invoice
from public.payments p
left join public.invoices i on i.id = p.invoice_id and i.deleted_at is null
where p.deleted_at is null and i.id is null;
```

## Vercel env verification checklist

1. In Vercel Project Settings → Environment Variables, inspect Production values for:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Confirm `VITE_SUPABASE_URL` host exactly matches the intended Supabase project ref, for example `https://nnggcnpcuomwfuupupwg.supabase.co` if that is the real production project.
3. Check Preview and Development env scopes separately. A preview ref such as `crfwjldshjmedrpjgxea` or `twgofzagfqprqvitdnkv` should not be used for production unless intentionally promoted.
4. Redeploy production after env changes. Vite exposes `VITE_*` values at build time; changing Vercel env without a fresh deployment can leave the deployed bundle stale.
5. In the deployed app browser DevTools → Network, filter for `supabase.co` and record the request host. It must match the intended project ref.
6. In browser DevTools → Application → Local Storage, inspect `rentrix-auth-session`. Clear it, reload, and log in again after any project/env switch.
7. Compare a page query response in Network with SQL Editor counts for the same project. If SQL has rows but network returns zero rows, investigate filters/RLS. If network host is different, investigate Vercel env.
8. Verify the deployed commit SHA/build time in Vercel matches the branch containing PR #498 and PR #502 merges.
9. Confirm the root `vercel.json` build command/output directory are the ones used by production (`pnpm run build`, `artifacts/rentrix/dist/public`).
10. Confirm no separate Vercel project is serving an older deployment or different environment set.

## RLS/auth verification checklist

1. Confirm the user can log in against the same Supabase project used by the deployed network requests.
2. Confirm RLS policies exist for audited tables and are assigned to `authenticated`.
3. Confirm each audited table has a policy equivalent to `authenticated_manage_<table>` and checks `(select auth.uid()) is not null`.
4. In SQL Editor, inspect `pg_policies` using the required query above.
5. Test as the same app user/session, not just with SQL Editor service/admin privileges. SQL Editor may bypass RLS depending on role/context.
6. If table counts are non-zero but app returns zero with HTTP 200, compare anon vs authenticated session headers in Network.
7. If app returns 401/403 or PostgREST errors, capture the exact status/message before changing code.
8. Remember that PR #498 hardened receipt/payment authorization; payment writes are relevant to receipts but should not hide read-only rows unless auth/session is wrong.

## Legacy schema mismatch checklist

Use this checklist before importing or planting any legacy data:

- Are properties in `public.properties` with `title`, `type`, `address`, and `deleted_at is null`?
- Are units in `public.units` with valid `property_id`, `unit_number`, and `deleted_at is null`?
- Are tenants represented as `public.people` rows with `type = tenant`, not only in `public.tenants`?
- Are owners represented as expected by the current owner relationship foundation, not only as `properties.owner_name` or a legacy `owners` table?
- Are contracts in `public.contracts` with valid `property_id`, `unit_id`, `tenant_id`, active/current statuses, and `deleted_at is null`?
- Are invoices in `public.invoices` with current enum statuses: `draft`, `issued`, `partial`, `paid`, `overdue`, `void`?
- Are receipts represented as `public.payments`, not only as a legacy `receipts` table?
- Are expense dates stored in `expense_date`, not an old date column name?
- Are old timestamp columns normalized to `timestamptz` where required by migrations?
- Are rows linked through the current FK chain so joins can hydrate property/unit/person context?

## Recommended next actions in order

1. **Identify the live project ref from the deployed browser network requests** (`*.supabase.co`) and write it down.
2. **Verify Vercel Production env vars** for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; redeploy if they are changed.
3. **Run the required SQL diagnostics** in the project ref observed in production network requests.
4. **Run the same SQL diagnostics** in any project that the user believes contains the stored data.
5. If production project has zero current-table rows but another project has rows, fix Vercel env/project selection before touching app code.
6. If production project has rows but visible counts are zero, inspect `deleted_at`, RLS/auth, and current user session.
7. If visible counts are non-zero but one page is empty, clear page filters and compare the exact service filters listed above.
8. If current canonical tables are empty but legacy tables have data, plan a separate legacy data mapping/import PR after documenting source tables/columns. Do not import data in this audit.
9. If RLS policies or auth behavior are wrong, open a focused RLS/auth PR with tests and explicit migration review. Do not change RLS in this audit.
10. Only after the project/env/schema source of truth is proven should PR-C, legacy UI planting, or UI recovery continue.

## Direct answers to Issue #503 questions

1. **Env vars required:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Production likely project:** likely `nnggcnpcuomwfuupupwg`, based on `.migration-backup/.env.example` and recent Supabase bot connected-project comments, but this is not proven until Vercel Production env and browser network requests are checked.
3. **Preview refs in recent comments:** `crfwjldshjmedrpjgxea`, `twgofzagfqprqvitdnkv`; connected/ignored comments also mention `nnggcnpcuomwfuupupwg`.
4. **Tables current app reads:** audited current reads include `properties`, `units`, `people`, `contracts`, `invoices`, `payments`, and `expenses`; adjacent modules also read `maintenance_requests`, owner relationship tables, settings, and report RPCs, but those are outside this focused visibility map.
5. **Filters that may hide data:** `deleted_at`, `status`, `type`, date ranges, search terms, pagination, FK hydration, auth session, and RLS.
6. **Does current schema match legacy data?** Not necessarily. Current schema is a newer canonical model and may not match older separate `tenants`, `owners`, `receipts`, ledger/balance, or maintenance tables/columns.
7. **Could old data be in unread tables/columns?** Yes. Existing data can be present in Supabase but invisible if not migrated into current canonical tables and FK/enum columns.
8. **SQL to run manually:** included in the Manual SQL diagnostics section.
9. **Browser/Vercel checks:** included in the Vercel env verification checklist.
10. **Most likely cause if every page is empty after login:** wrong Supabase project/env or a stale deployment using an empty preview/current project; second most likely is auth/RLS/session mismatch.
