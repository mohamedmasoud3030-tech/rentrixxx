# Constrained Beta Launch Audit - 2026-06-06

Scope: read-only launch audit against the intended Rentrix Vercel and Supabase environments. No production or staging data was mutated. No migrations, RLS, auth, RPC, runtime, or deployment settings were changed.

Workflow: Repository audit from `.ai/workflows/README.md`.

## Executive result

Recommendation: **NO-GO** for constrained beta until the intended live Vercel and Supabase targets are authenticated and verified.

Reason: the repository contains important launch configuration and schema/RPC evidence, but this checkout has no `.vercel/project.json`, no local `.env*`, no `supabase/config.toml`, no relevant `VERCEL_*`, `SUPABASE_*`, `VITE_SUPABASE_*`, `DATABASE_URL`, or `PG*` shell variables, and no authenticated Vercel/Supabase CLI session. Live platform state, live schema inventory, auth settings, advisors, logs, backups, and beta account availability are therefore **BLOCKED**, not verified.

## Redacted environment evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Local Vercel project link | BLOCKED | `rg --files --hidden ... -g '.vercel/**'` found no `.vercel/project.json`. |
| Local environment files | BLOCKED | `rg --files --hidden ... -g '.env*'` found no active `.env*` files in the checkout. |
| Shell deployment/database variables | BLOCKED | The redacted environment-variable scan for Vercel, Supabase, Vite Supabase, database, and Postgres variables returned no matches. |
| Vercel CLI authentication | BLOCKED | `CI=1 pnpm dlx vercel@latest whoami` reported no existing credentials, then failed during login discovery/network reachability. No deployment data was available. |
| Supabase CLI authentication | BLOCKED | `CI=1 pnpm dlx supabase@latest projects list` failed with missing `SUPABASE_ACCESS_TOKEN` or login session. |
| Supabase local config | BLOCKED | No `supabase/config.toml` was present in `rg --files --hidden`; only migrations and `.temp` metadata were present. |

## PASS / FAIL / BLOCKED matrix

| Area | Result | Finding |
| --- | --- | --- |
| Vercel intended project | BLOCKED | No local Vercel link or authenticated Vercel access was available. |
| Vercel deployment URL | BLOCKED | No live deployment metadata was accessible. |
| Vercel active commit SHA | BLOCKED | No live deployment metadata was accessible. |
| Vercel build command | PASS | Root `vercel.json` declares `pnpm run build`. |
| Vercel install command | PASS | Root `vercel.json` declares `pnpm install --frozen-lockfile`. |
| Vercel output directory | PASS | Root `vercel.json` declares `artifacts/rentrix/dist/public`; app-local `vercel.json` declares `dist/public` only if the project root is `artifacts/rentrix`. |
| SPA rewrite | PASS | Root and app-local Vercel configs both rewrite `/(.*)` to `/index.html`. |
| Security headers | PASS | Root `vercel.json` declares CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. |
| `VITE_SUPABASE_URL` presence and targeting | BLOCKED | Runtime code requires it, but no local/deployment env source or Vercel env access was available. Full values were not exposed. |
| `VITE_SUPABASE_ANON_KEY` presence and targeting | BLOCKED | Runtime code requires it, but no local/deployment env source or Vercel env access was available. Full values were not exposed. |
| Supabase project ref | BLOCKED | No `supabase/config.toml`, project link, access token, or database URL was available. |
| Supabase environment classification | BLOCKED | Cannot classify production/staging without project metadata. |
| Applied migration history versus repository | BLOCKED | Repository migration list is known; live `supabase_migrations.schema_migrations` was not accessible. |
| Required live tables and columns | BLOCKED | Repository types/migrations define expected surfaces; live schema could not be queried. |
| Live `units.status` distinct values | BLOCKED | Requires read-only SQL access to the target database. |
| Canonical unit-status constraint presence | BLOCKED | Repository migration exists; live constraint could not be verified. |
| Required RPC existence/signatures | BLOCKED | Repository migrations/types define expected RPCs; live function catalog could not be queried. |
| RPC grants, owners, `SECURITY DEFINER`, `search_path`, RLS interaction | BLOCKED | Repository migrations show intended posture; live catalog/policy metadata could not be queried. |
| Auth method configuration | BLOCKED | Requires Supabase project auth config access. |
| Access-token hook status | BLOCKED | Migration defines a hook function and manual registration requirement; project-level hook enablement could not be verified. |
| `app_metadata.user_role` claims | BLOCKED | Code expects this claim; live token/account inspection was unavailable. |
| ADMIN, MANAGER, USER beta accounts | BLOCKED | Requires Supabase auth/admin access or approved test credentials. |
| Supabase logs | BLOCKED | Requires Supabase dashboard/API access. |
| Supabase advisors | BLOCKED | Requires Supabase dashboard/API access. |
| Supabase backup posture | BLOCKED | Requires Supabase dashboard/API access. |
| Maintenance/audit/lands/leads/commissions/communication/system/data-integrity live support | BLOCKED | Routes and some migrations exist; live schemas were not accessible. |
| Proven launch-blocking failure | FAIL | Live environment access was unavailable, so required launch evidence could not be produced. |

## Repository configuration evidence

| Surface | Repository evidence | Result |
| --- | --- | --- |
| Active app | `AGENTS.md` and package evidence identify `artifacts/rentrix/` as the active app. | PASS |
| Build | Root Vercel build delegates to root `pnpm run build`; root package recursively builds workspace packages; `@workspace/rentrix` uses `vite build --config vite.config.ts`. | PASS |
| Install | Root Vercel install command is frozen pnpm install. | PASS |
| Output | Root Vercel output is `artifacts/rentrix/dist/public`; app Vite output is `dist/public` under `artifacts/rentrix`. | PASS |
| SPA hosting | Root and app-local Vercel configs include the catch-all rewrite. | PASS |
| Headers | Root Vercel config includes CSP and basic anti-clickjacking/content/referrer headers. | PASS |
| Supabase env names | `artifacts/rentrix/src/lib/env.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; `artifacts/rentrix/src/integrations/supabase/client.ts` creates the browser client from those values. | PASS for code, BLOCKED for deployed values. |

## Expected schema inventory from repository evidence

This is **not** a live schema inventory. It is the repository-side expected inventory used to scope the blocked live check.

| Table/surface | Expected columns or support | Repository evidence result | Live result |
| --- | --- | --- | --- |
| `properties` | `id`, `title`, `type`, `address`, `owner_name`, `purchase_value`, `current_value`, `status`, `notes`, timestamps, `deleted_at` | PASS | BLOCKED |
| `units` | `id`, `property_id`, `unit_number`, `floor`, `status`, `rent_amount`, `notes`, timestamps, `deleted_at`; unique property/unit number | PASS | BLOCKED |
| `people` | `id`, `full_name`, `phone`, `email`, `national_id`, `type`, `address`, `notes`, timestamps, `deleted_at` | PASS | BLOCKED |
| `owners` | `id`, `full_name`, display/contact/tax/address/notes fields, `is_active`, timestamps | PASS | BLOCKED |
| `property_owners` | `property_id`, `owner_id`, ownership percentage, primary flag, effective dates | PASS | BLOCKED |
| `contracts` | `property_id`, `unit_id`, `tenant_id`, dates, `rent_amount`, `payment_cycle`, `status`, renewal/cancellation support, timestamps, `deleted_at` | PASS | BLOCKED |
| `invoices` | `contract_id`, issue/due dates, `amount`, `paid_amount`, `status`, notes, timestamps, `deleted_at` | PASS | BLOCKED |
| `payments` | `invoice_id`, `amount`, `payment_method`, `payment_date`, `reference_number`, `payment_reference`, timestamps, `deleted_at` | PASS | BLOCKED |
| `receipts` | `id`, `no`, `contract_id`, `date_time`, `channel`, `amount`, `ref`, `notes`, `status`, `created_at`, `request_id`, `tenant_id` | PASS | BLOCKED |
| `receipt_allocations` | `receipt_id`, `invoice_id`, `amount`, `created_at`, `tenant_id` | PASS | BLOCKED |
| `expenses` | `property_id`, `category`, `amount`, `expense_date`, `description`, timestamps, `deleted_at` | PASS | BLOCKED |
| `maintenance_requests` | `property_id`, `unit_id`, `title`, `description`, `priority`, `status`, `assigned_to`, `cost`, `resolved_at`, timestamps, `deleted_at` | PASS | BLOCKED |
| `company_settings` | singleton company/legal/tax/contact/address/currency/locale/timezone/logo/prefix fields | PASS | BLOCKED |
| `profiles` | Access-token hook migration expects `public.profiles.role`; generated runtime types do not include `profiles`. | PARTIAL / RISK | BLOCKED |
| Audit-related tables | `financial_audit_log` is referenced by receipt RPC migrations; `audit_log` policies are referenced in RLS hardening; generated runtime types do not model them. | PARTIAL / RISK | BLOCKED |
| Idempotency tables | `financial_operation_idempotency` exists in migrations and is used by `post_receipt_atomic` and `record_invoice_payment_atomic`. | PASS | BLOCKED |
| `serials` | Contract serial helper migration creates `serials` and `increment_serial`. | PASS | BLOCKED |
| `lands` | RLS hardening references `lands`; active route/permission exists; no generated runtime table type. | PARTIAL / RISK | BLOCKED |
| `leads` | RLS hardening references `leads`; active route/permission exists; no generated runtime table type. | PARTIAL / RISK | BLOCKED |
| `commissions` | RLS hardening references `commissions`; active route/permission exists; no generated runtime table type. | PARTIAL / RISK | BLOCKED |
| Communication | Active route/permission exists; RLS hardening references notification/communication-adjacent tables, but generated runtime types do not model a canonical communication schema. | PARTIAL / RISK | BLOCKED |
| System/governance | Active system/audit/integrity routes exist; RLS hardening references governance/system-adjacent tables; generated runtime types do not model all surfaces. | PARTIAL / RISK | BLOCKED |
| Data integrity | Active read-only audit service exists; live support cannot be verified without database access. | PARTIAL / RISK | BLOCKED |

## Unit status contract

Repository result: PASS. `supabase/migrations/20260603094500_normalize_units_status_contract.sql` defines canonical stored values `available`, `occupied`, `maintenance`, and `reserved`, maps historical incoming `rented` to `occupied`, and adds a canonical check constraint when `units.status` is text-backed.

Live result: BLOCKED. The required live queries were not possible:

```sql
select status, count(*) from public.units group by status order by status;
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.units'::regclass and conname ilike '%status%';
```

## Required RPC inventory

| RPC | Repository signature/posture | Helpers called or related | Repository result | Live result |
| --- | --- | --- | --- | --- |
| `record_invoice_payment_atomic` | `public.record_invoice_payment_atomic(payload jsonb) returns jsonb`, `SECURITY DEFINER`, `set search_path = public, pg_temp`, grants to `authenticated`. | `find_payment_account_id`, `post_receipt_atomic`, `financial_operation_idempotency`. | PASS | BLOCKED |
| `post_receipt_atomic` | Current repository history contains legacy and JSONB signatures; latest receipt serial migration defines `public.post_receipt_atomic(jsonb) returns jsonb`, revokes public, grants authenticated/service_role. | `financial_operation_idempotency`, `financial_audit_log`, receipt/allocations writes. | PASS / NEED_LIVE_DIFF | BLOCKED |
| `renew_contract_atomic` | Latest migration defines `public.renew_contract_atomic(old_contract_id uuid, new_contract_data jsonb) returns jsonb`, `SECURITY DEFINER`, `set search_path = public, pg_temp`, grants authenticated. | `contract_status_label`. | PASS | BLOCKED |
| `rpt_financial_summary` | Repository type expects `{ month: number; year: number }`; security hardening migrations grant authenticated and revoke public/anon. | None identified in current generated type. | PASS / NEED_LIVE_DIFF | BLOCKED |
| Helpers | `contract_status_label`, `find_payment_account_id`, `increment_serial`, `assign_contract_number_from_serials`, `sync_payment_reference_columns`, `normalize_unit_status_contract`, `is_app_user`, `is_admin_or_manager`. | Various triggers/RPCs. | PASS | BLOCKED |

Live catalog checks still required:

```sql
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid), p.prosecdef, p.proowner::regrole, p.proconfig
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('record_invoice_payment_atomic','post_receipt_atomic','renew_contract_atomic','rpt_financial_summary');
```

## Migration application matrix

Repository contains these migrations. Live application status is **BLOCKED** for every row because the target database migration history could not be queried.

| Migration | In repo | Applied live |
| --- | --- | --- |
| `20260427102326_rentrix_complete_production_setup.sql` | PASS | BLOCKED |
| `20260427102343_rentrix_complete_production_setup.sql` | PASS | BLOCKED |
| `20260503120000_consolidate_schema_integrity.sql` | PASS | BLOCKED |
| `20260503140000_custom_access_token_hook.sql` | PASS | BLOCKED |
| `20260503160000_atomic_receipt_serial.sql` | PASS | BLOCKED |
| `20260509080848_fix_contracts_rls_policy.sql` | PASS | BLOCKED |
| `20260509080930_fix_views_security_invoker.sql` | PASS | BLOCKED |
| `20260510055726_fix_owner_settlements_status_column.sql` | PASS | BLOCKED |
| `20260510055736_fix_duplicate_rls_policies.sql` | PASS | BLOCKED |
| `20260510055756_fix_recalculate_all_balances_function.sql` | PASS | BLOCKED |
| `20260510055826_fix_contract_balances_updated_at_trigger.sql` | PASS | BLOCKED |
| `20260510055847_fix_get_financial_summary_function.sql` | PASS | BLOCKED |
| `20260510055859_fix_contracts_no_auto_generate.sql` | PASS | BLOCKED |
| `20260510055912_fix_unit_status_trigger_function.sql` | PASS | BLOCKED |
| `20260510060659_fix_missing_columns_and_views.sql` | PASS | BLOCKED |
| `20260510060714_fix_api_routes_404.sql` | PASS | BLOCKED |
| `20260510061147_fix_audit_log_generated_columns.sql` | PASS | BLOCKED |
| `20260513120000_core_real_estate_schema.sql` | PASS | BLOCKED |
| `20260513150000_phase_2b_contract_renewal.sql` | PASS | BLOCKED |
| `20260513190000_phase_3_financial_engine.sql` | PASS | BLOCKED |
| `20260513210000_phase_4_reports_maintenance.sql` | PASS | BLOCKED |
| `20260514011230_fix_all_security_advisors.sql` | PASS | BLOCKED |
| `20260514060000_fix_post_receipt_rpc_args.sql` | PASS | BLOCKED |
| `20260514061000_contract_integrity_guards.sql` | PASS | BLOCKED |
| `20260514062000_contract_overlap_guard.sql` | PASS | BLOCKED |
| `20260514063000_payment_immutability_guard.sql` | PASS | BLOCKED |
| `20260514110000_security_rls_hardening.sql` | PASS | BLOCKED |
| `20260515120000_company_settings.sql` | PASS | BLOCKED |
| `20260515130000_owner_relationship_foundation.sql` | PASS | BLOCKED |
| `20260515200000_validate_contract_integrity_constraints.sql` | PASS | BLOCKED |
| `20260516110000_harden_post_receipt_authorization.sql` | PASS | BLOCKED |
| `20260518102000_harden_rpc_execution_and_advisor_indexes.sql` | PASS | BLOCKED |
| `20260518105500_harden_rpc_execution_retry.sql` | PASS | BLOCKED |
| `20260518134500_harden_remaining_function_advisors.sql` | PASS | BLOCKED |
| `20260519023157_remote_history_placeholder.sql` | PASS | BLOCKED |
| `20260519120000_p0_harden_rls_user_scoped.sql` | PASS | BLOCKED |
| `20260603094500_normalize_units_status_contract.sql` | PASS | BLOCKED |
| `20260604012000_sync_live_operational_contracts.sql` | PASS | BLOCKED |
| `20260604020000_reconcile_demo_entity_id_defaults.sql` | PASS | BLOCKED |
| `20260604020100_reconcile_payment_reference_compatibility.sql` | PASS | BLOCKED |
| `20260604020200_reconcile_contract_serial_helper.sql` | PASS | BLOCKED |
| `20260604020300_add_record_invoice_payment_atomic_facade.sql` | PASS | BLOCKED |
| `20260604020400_reconcile_renew_contract_atomic.sql` | PASS | BLOCKED |

## Auth and beta account status

Repository result: PARTIAL. The frontend authorization layer recognizes only `ADMIN`, `MANAGER`, and `USER` from `user.app_metadata.user_role`. The custom access-token hook migration creates `public.custom_access_token_hook(event jsonb)`, reads `public.profiles.role`, injects `app_metadata.user_role`, grants execution to `supabase_auth_admin` when present, and states that the hook must also be registered in the Supabase project auth configuration.

Live result: BLOCKED. Auth providers, email/password state, hook enablement URI, role-claim issuance, and ADMIN/MANAGER/USER beta account availability require Supabase project/auth access.

## Logs, advisors, and backups

Result: BLOCKED. No Supabase management access was available to inspect logs, security/performance advisors, PITR, scheduled backups, backup retention, or restore test posture.

## Required follow-up PRs

| Priority | Follow-up | Scope |
| --- | --- | --- |
| P0 | Add an access-bound read-only launch evidence PR | Provide intended Vercel project metadata, deployment URL, active commit SHA, redacted production/preview env targeting, Supabase project ref/classification, migration history, live schema inventory, RPC catalog/grants, RLS posture, auth settings, logs/advisors/backups, and beta account verification. No mutations. |
| P0 | Resolve any live drift found by the access-bound audit | Only after evidence exists; split schema/RPC/RLS/auth/runtime fixes into narrow PRs. |
| P1 | Reconcile generated database types with live-supported governance/commercial surfaces | Ensure `profiles`, audit tables, lands, leads, commissions, communication, system/governance, and data-integrity support are intentionally typed or explicitly documented as unavailable. |
| P1 | Harden documentation for environment ownership | Record the canonical Vercel project, Supabase project ref, and environment classification in a redacted operator-only launch note or approved secure runbook. |
| Deferred | Feature expansion | Defer new features until live beta launch evidence passes and product boundaries remain single-office, Arabic-first, and non-ledger. |

## Verification commands run

```bash
rg --files --hidden -g '!node_modules' -g '!artifacts/rentrix/node_modules' -g '!.git' -g '.env*' -g '.vercel/**' -g 'supabase/config.toml' -g 'supabase/.temp/**' -g 'CLAUDE.md' -g 'docs/**'
env | sort | rg -n '^(VERCEL|SUPABASE|VITE_SUPABASE|DATABASE_URL|PG|POSTGRES|REACT_APP|NEXT_PUBLIC)' | sed -E 's/(=).*/=<redacted>/'
CI=1 pnpm dlx vercel@latest whoami
CI=1 pnpm dlx supabase@latest projects list
rg --files supabase/migrations | sort
rg -n 'create table|create or replace function|security definer|grant execute|revoke execute|record_invoice_payment_atomic|post_receipt_atomic|renew_contract_atomic|rpt_financial_summary' supabase/migrations artifacts/rentrix/src/types/database.ts artifacts/rentrix/src
```
