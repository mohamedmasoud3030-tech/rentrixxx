# Migration Baseline Reconciliation

Date: 2026-06-16

## Why the old migrations were replaced

`supabase/migrations/` previously contained 101 files, including remote-applied stubs, replay patches, duplicate fixes, and historical schema fragments. The chain had become a migration-history artifact rather than a reliable description of the database required by the current app.

This baseline is not a blind squash. It was rebuilt from current code reality:

- active app code under `artifacts/rentrix/src/`;
- direct Supabase `.from(...)`, `.rpc(...)`, storage, and generated type usage;
- current execution docs and code-reality audit;
- historical migrations only as reference for domain rules, RPC behavior, grants, and security fixes.

This destructive-reset approach is acceptable only because the current live Supabase data is test/demo data. It must not be reused for a customer or production database with data that needs preservation.

## Code-required DB contract summary

| Surface | Active feature | Required contract |
| --- | --- | --- |
| `users` | auth, JWT role hook, governance | Supabase-auth-linked user profile with `ADMIN`, `MANAGER`, `USER`, active/status flags, RLS self/admin reads, admin writes. |
| `company_settings` | settings, company formatting | Singleton settings row with company identity, locale/currency/timezone, prefixes, notification flags, logo URL. |
| `owners`, `property_owners` | owners hub, owner detail, property ownership | Owner identity/contact fields; property-owner relationship with ownership percentage, primary flag, start/end dates, FKs to properties/owners. |
| `properties` | properties, reports, owners, receipts | Title/type/address/status/value/notes, timestamps, soft delete, searchable active rows. |
| `units` | units, contracts, receipts, reports | Property FK, unit number/floor/status/rent/notes, soft delete, unique unit number per property. |
| `people` | people, tenants, contracts, receipts | Full name/contact/national ID/type/address/notes, soft delete; tenant records are `type='tenant'`. |
| `contracts` | contracts, renewals, invoices, owners, arrears | Property/unit/tenant FKs, dates, rent, payment cycle, status, renewal link, attachment URL, soft delete, no overlapping active contracts for the same unit. |
| `invoices` | invoices, financials, arrears, reports, payments | Contract FK, issue/due dates, amount/tax/paid amount, status, notes, soft delete, report indexes. |
| `payments` | payment recording, receipts projection, reports | Invoice and contract FKs are required; payment amount/method/date/reference/status/receipt link/creator, soft delete. Standalone payments are blocked. |
| `receipts`, `receipt_allocations` | internal receipt posting, voiding, reconciliation | Receipts are generated from posted payments/RPCs; allocations link receipts to invoices; status/void timestamps and request IDs support auditability. |
| `expenses` | expenses and reports | Property FK, category, amount, date, description, attachment URL, soft delete. |
| `maintenance_records` | maintenance | Optional property/unit FKs, work/status/priority/cost/schedule fields, attachment URL, soft delete. |
| `audit_log` | audit log | Read-only audit stream for authorized admins with timestamps, actor/entity/action/details fields. |
| `financial_operation_idempotency` | financial RPC idempotency | Internal table keyed by `(operation_name, request_id)` with no browser direct access. |
| `accounts`, `journal_entries` | payment RPC accounting support | Minimal internal chart entries for cash `1111` and receivable `1201`, plus journal rows for atomic posting support. No ledger UI is exposed. |
| `contract_balances`, `owner_balances` | financial reconciliation support | Derived balance cache tables used by triggers/views, not manually edited by app UI. |
| `v_balance_reconciliation`, `v_balance_reconciliation_drift` | data integrity/security advisor | Invoker-safe views over contracts/invoices/payments for balance drift checks. |
| Storage bucket `attachments` | file attachment field | Public attachment bucket must exist in the target Supabase project; the frontend uploads through `supabase.storage.from('attachments')`. |

## RPC and function contract

| Function/RPC | Caller | Grant model | Security requirements |
| --- | --- | --- | --- |
| `record_invoice_payment_atomic(payload jsonb)` | browser payment form | `authenticated` only | `SECURITY DEFINER`, safe `search_path`, `auth.uid()` required, admin/manager role required, validates invoice/request/amount, idempotent. |
| `renew_contract_atomic(old_contract_id uuid, new_contract_data jsonb)` | browser contract renewal | `authenticated` only | `SECURITY DEFINER`, safe `search_path`, `auth.uid()` required, admin/manager role required, creates replacement contract. |
| `void_receipt_atomic(payload jsonb)` | browser receipt void action | `authenticated` only | `SECURITY DEFINER`, safe `search_path`, validates receipt ID, admin/manager role required. |
| `generate_invoices_from_active_contracts()` | browser invoice generation | `authenticated` only | `SECURITY DEFINER`, safe `search_path`, admin/manager role required, idempotent per active contract/current date. |
| `rpt_financial_summary(p_from date, p_to date)` | dashboard | `authenticated` only | `SECURITY DEFINER`, safe `search_path`, read-only aggregate. |
| `custom_access_token_hook(event jsonb)` | Supabase Auth hook | `supabase_auth_admin` only | Adds `app_metadata.user_role` from `public.users`; Dashboard registration remains an operator step. |
| `post_receipt_atomic(jsonb)`, `find_payment_account_id(text)`, `void_receipt_atomic(uuid,timestamptz,jsonb,jsonb)` | internal helpers | revoked from anon/authenticated | Used by trusted RPCs only. |

## Final migration structure

1. `0001_core_schema.sql`: extensions, active tables, core checks/FKs, base indexes, timestamp and soft-delete conventions, minimal accounting support for payment posting.
2. `0002_rls_policies_and_grants.sql`: RLS enablement, single-office authenticated access model, manager/admin write policies, internal idempotency denial policy, grants.
3. `0003_functions_triggers_and_rpcs.sql`: auth role helpers, Custom Access Token hook, financial RPCs, invoice generation, receipt voiding, dashboard summary RPC, timestamp and unit-status triggers.
4. `0004_financial_integrity_views_and_indexes.sql`: `v_balance_reconciliation`, drift view, financial/reporting indexes, authenticated view grants.
5. `0005_security_advisor_cleanup.sql`: invoker-safe view setting, duplicate idempotency index removal, final grant hardening for browser-facing versus internal RPCs.

## Removed or deferred legacy areas

The baseline intentionally removes schema that is not required by active single-office Rentrix code:

- SaaS multi-tenancy concepts such as organizations, memberships, invitations, and subscriptions.
- General accounting-ledger expansion beyond the minimal internal `accounts` and `journal_entries` needed by payment RPCs.
- Deferred CRM/product-decision tables for `lands`, `leads`, `commissions`, and `communication`; the current routes stay hidden and their services return unavailable read models.
- Historical remote-applied stubs, duplicate patches, preview reconciliation-only migrations, and superseded type-cast or grant repair migrations.
- Duplicate unique index `financial_operation_idempotency_operation_request_uidx`; the composite primary key remains the required idempotency guarantee.

## Security Advisor fixes included

- `public.v_balance_reconciliation` and `public.v_balance_reconciliation_drift` are created with `security_invoker = true`.
- The redundant `financial_operation_idempotency_operation_request_uidx` is dropped and not recreated.
- `financial_operation_idempotency_pkey` is retained.
- App-required authenticated RPC access is preserved for:
  - `record_invoice_payment_atomic(payload jsonb)`;
  - `renew_contract_atomic(old_contract_id uuid, new_contract_data jsonb)`;
  - `void_receipt_atomic(payload jsonb)`;
  - `generate_invoices_from_active_contracts()`.
- Internal helpers remain revoked from `anon` and `authenticated`.
- Browser-facing RPCs validate `auth.uid()`, role, and critical payload fields.

## Generated types

`artifacts/rentrix/src/types/database.ts` was updated by hand to match the new baseline because generating types from the baseline requires a running local Supabase database or project credentials. Docker is unavailable in this environment, and live credentials were intentionally not requested.

After an operator applies the baseline to a reviewed Supabase project, regenerate types from that project or from a local Supabase reset and compare the output before shipping a follow-up if needed.

## Demo live DB reset/adoption plan

Only perform these steps after review and merge, and only for the current demo/test Supabase project.

1. Take a final backup or export of the demo database if any test data should be retained for reference.
2. Confirm the target project is the intended Rentrix demo project, not any customer or production-preservation database.
3. Reset the public schema and migration history using the approved Supabase Dashboard/CLI workflow for the demo project.
4. Apply only these five baseline migrations from `supabase/migrations/`.
5. Register the Custom Access Token hook in Supabase Dashboard: Authentication -> Hooks -> Custom Access Token -> `pg-functions://postgres/public/custom_access_token_hook`.
6. Confirm storage bucket `attachments` exists and matches the attachment upload policy expected by the app.
7. Regenerate `artifacts/rentrix/src/types/database.ts` from the newly reset schema and review the diff.
8. Seed or manually create demo users in `public.users` with `ADMIN`, `MANAGER`, or `USER` roles.
9. Run authenticated browser QA: dashboard, properties, units, people, contracts, invoice generation, payment recording, receipts, void flow, arrears, reports, maintenance, RTL/LTR, mobile navigation.
10. Record the reset evidence and GO/NO-GO result in the release evidence docs.

Do not run this reset against live customer data. This plan is safe only because current data has been classified as test/demo data.
