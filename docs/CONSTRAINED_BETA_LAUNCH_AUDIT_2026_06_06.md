# Constrained Beta Launch Audit - 2026-06-06

Scope: access-bound read-only launch audit against the intended Rentrix Vercel and Supabase environments. No production or staging data was mutated. No migrations, RLS, auth, RPC, runtime, deployment settings, or environment variables were changed. No full secrets, tokens, passwords, connection strings, or anon keys were printed or recorded.

Workflow: Repository audit from `.ai/workflows/README.md`.

## Executive result

Recommendation: **NO-GO** for constrained beta.

Reason: the access-bound verification could not authenticate to Vercel or Supabase with credentials already available in the execution environment. The repository provides important expected configuration, migration, RPC, auth, RLS, and navigation evidence, but live platform state remains **BLOCKED**. The Supabase project ref `nnggcnpcuomwfuupupwg` was recovered only as a candidate from `supabase/.temp/pooler-url`; it could not be confirmed as the intended constrained-beta source of truth without Supabase management or database access.

## Required return summary

| Required item | Result |
| --- | --- |
| Exact verified Vercel project | **BLOCKED** - no `.vercel/project.json`, no relevant `VERCEL_*` shell variables, and no authenticated Vercel CLI session. |
| Exact verified Supabase project ref | **BLOCKED** - candidate `nnggcnpcuomwfuupupwg` was recovered from local Supabase pooler metadata, but was not confirmed as the intended beta target. |
| Active production commit SHA | **BLOCKED** - no live Vercel deployment metadata was accessible. Repository HEAD during this audit was `f0b601dfb36d7af354995a35f96e71f266419d9e`, but that is not proof of the active production deployment. |
| Migration drift summary | **BLOCKED** - repository has 43 migration files; live `supabase_migrations.schema_migrations` was not accessible, so applied/missing/extra migration drift could not be determined. |
| Schema drift summary | **BLOCKED** - repository schema/types/migrations define expected tables, constraints, indexes, triggers, and RLS, but live catalog queries were unavailable. |
| RPC security summary | **BLOCKED live**; repository expects guarded authenticated RPCs with `SECURITY DEFINER`, fixed `search_path`, and public/anon execute revocation for the requested functions. Live owners, grants, definitions, helper dependencies, and RLS interaction could not be inspected. |
| Auth/RLS summary | **BLOCKED live**; repository expects `ADMIN`, `MANAGER`, and `USER` roles from `app_metadata.user_role`, plus a custom access-token hook backed by `public.profiles.role`. Live login methods, hook registration, token issuance, beta accounts, anonymous denial, and table RLS posture could not be verified. |
| Beta navigation classification | **NO-GO**; optional/recovered surfaces should be hidden or deferred until live schema and auth evidence exists. |
| Remaining blockers | P0 live Vercel access, P0 live Supabase access, P0 confirmation of intended beta targets, P0 live migration/schema/RPC/auth/RLS/log/advisor/backup evidence. |
| Final recommendation | **NO-GO**. |

## Redacted environment evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Local Vercel project link | BLOCKED | `rg --files --hidden ... -g '.vercel/**'` found no `.vercel/project.json`. |
| Local environment files | BLOCKED | `rg --files --hidden ... -g '.env*'` found no active `.env*` files in the checkout. |
| Shell deployment/database variables | BLOCKED | A name-only scan for Vercel, Supabase, Vite Supabase, database, and Postgres variables returned no matches. |
| Vercel CLI authentication | BLOCKED | `CI=1 pnpm dlx vercel@latest whoami` reported no existing credentials and then failed during login discovery/network reachability; no project, deployment URL, project ID, production commit, environment variables, or target classification was available. |
| Supabase CLI authentication | BLOCKED | `CI=1 pnpm dlx supabase@latest projects list` failed because no `SUPABASE_ACCESS_TOKEN` or login session was available. |
| Supabase local config | BLOCKED | No `supabase/config.toml` was present. Only migrations and `.temp` metadata were present. |
| Supabase candidate metadata | PARTIAL | `supabase/.temp/pooler-url` yielded candidate project ref `nnggcnpcuomwfuupupwg` and host fragment `aws-1-ap-southeast-1.pooler.supabase.com`; the full connection string was not printed and the ref remains unverified. |
| Supabase local version hints | PARTIAL | `.temp` files indicate Postgres `17.6.1.084`, GoTrue `v2.189.0`, and Supabase CLI latest `v2.95.4`; these are not proof of the intended beta target. |

## Vercel target

| Required verification | Result | Evidence |
| --- | --- | --- |
| Project name and project ID | BLOCKED | No authenticated Vercel project metadata was available. |
| Preview deployment URL | BLOCKED | No authenticated Vercel deployment metadata was available. |
| Production deployment URL | BLOCKED | No authenticated Vercel deployment metadata was available. |
| Active production commit SHA | BLOCKED | No authenticated Vercel deployment metadata was available. |
| Environment classification | BLOCKED | No live Vercel project or deployment metadata was available. |
| Build command | PASS repository expectation | Root `vercel.json` declares `pnpm run build`; root `package.json` delegates to recursive workspace builds; `artifacts/rentrix/package.json` builds with `vite build --config vite.config.ts`. |
| Install command | PASS repository expectation | Root `vercel.json` declares `pnpm install --frozen-lockfile`. |
| Output directory | PASS repository expectation | Root `vercel.json` declares `artifacts/rentrix/dist/public`; app-local `artifacts/rentrix/vercel.json` declares `dist/public` if the project root is `artifacts/rentrix`. |
| SPA rewrite | PASS repository expectation | Root and app-local Vercel configs rewrite `/(.*)` to `/index.html`. |
| Security headers | PASS repository expectation | Root `vercel.json` declares CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`. |
| `VITE_SUPABASE_URL` targeting | BLOCKED | Runtime code requires it through the env layer, but no local/deployment env source or Vercel env access was available. Full values were not exposed. |
| `VITE_SUPABASE_ANON_KEY` targeting | BLOCKED | Runtime code requires it through the env layer, but no local/deployment env source or Vercel env access was available. Full values were not exposed. |

## Supabase target

| Required verification | Result | Evidence |
| --- | --- | --- |
| Project ref and environment classification | BLOCKED | Candidate `nnggcnpcuomwfuupupwg` is not confirmed as the intended constrained-beta target. No Supabase project metadata was accessible. |
| Migration history versus repository | BLOCKED | Repository has 43 migration files. Live migration history was not accessible. |
| Required live tables, columns, constraints, indexes, triggers, and RLS state | BLOCKED | Repository migrations/types define expected surfaces; live catalog could not be queried. |
| Live distinct `units.status` values | BLOCKED | Requires read-only SQL access to the intended target database. |
| Canonical `units.status` constraint definition | PASS repository expectation, BLOCKED live | `20260603094500_normalize_units_status_contract.sql` defines `units_status_canonical_check` as `check (status::text in ('available', 'occupied', 'maintenance', 'reserved'))` and validates it. Live presence/definition could not be confirmed. |

## Contract integrity

| Required verification | Result | Evidence |
| --- | --- | --- |
| Live overlap guard exists | BLOCKED | Repository migration `20260514062000_contract_overlap_guard.sql` defines `public.prevent_active_contract_overlap()` and trigger `contracts_prevent_active_overlap`; live trigger/function presence could not be confirmed. |
| Create path cannot overlap active contracts | PASS repository expectation, BLOCKED live | The repository trigger runs before insert or update on `unit_id`, `start_date`, `end_date`, `status`, and `deleted_at` and raises on overlapping active date ranges for the same unit. Live behavior was not exercised. |
| Update path cannot overlap active contracts | PASS repository expectation, BLOCKED live | Same trigger covers updates to the guarded columns. Live behavior was not exercised. |
| Renewal path cannot overlap active contracts | PASS repository expectation, BLOCKED live | `renew_contract_atomic(uuid, jsonb)` inserts into `public.contracts`, so the repository overlap trigger should protect renewals; live function and trigger behavior could not be tested. |
| `renew_contract_atomic` cannot bypass occupancy protection | PASS repository expectation, BLOCKED live | The repository RPC copies `property_id`, `unit_id`, and `tenant_id` server-side from the original contract and inserts a new contract, relying on trigger-level overlap protection. Live trigger execution under SECURITY DEFINER could not be confirmed. |

## RPC catalog

| RPC | Repository expectation | Live result |
| --- | --- | --- |
| `record_invoice_payment_atomic` | `20260604020300_add_record_invoice_payment_atomic_facade.sql` defines `record_invoice_payment_atomic(payload jsonb)` as `SECURITY DEFINER` with `set search_path = public, pg_temp`, validates authenticated user/payment payload, builds receipt/allocation/journal payloads, delegates to `post_receipt_atomic(jsonb)`, and revokes public/anon execution while granting authenticated execution. | BLOCKED - live signature, owner, grants, definition, helper dependencies, SECURITY DEFINER state, fixed search_path, and RLS interaction could not be inspected. |
| `post_receipt_atomic` | Repository migrations define guarded versions, including `post_receipt_atomic(uuid, numeric, public.payment_method, date, text)` with auth checks, amount validation, invoice locking, payment insert, invoice status update, public/anon revoke, and authenticated grant; later hardening also references `post_receipt_atomic(jsonb)`. | BLOCKED - live overloaded signatures, owners, grants, definitions, helper dependencies, SECURITY DEFINER state, fixed search_path, and RLS interaction could not be inspected. |
| `renew_contract_atomic` | `20260604020400_reconcile_renew_contract_atomic.sql` defines `renew_contract_atomic(old_contract_id uuid, new_contract_data jsonb)` as `SECURITY DEFINER` with `set search_path = public, pg_temp`, requires `auth.uid()`, validates dates/amount, locks the old contract, copies stable relational fields server-side, inserts a new contract, updates the old contract to a terminal status, revokes public/anon execution, and grants authenticated execution. | BLOCKED - live signature, owner, grants, definition, helper dependencies, SECURITY DEFINER state, fixed search_path, and trigger/RLS interaction could not be inspected. |
| `rpt_financial_summary` | Repository migrations/types expect a financial summary RPC. Hardening migrations reference `rpt_financial_summary(integer, integer)` and `rpt_financial_summary(date, date)` for execute grant cleanup. Frontend generated types currently expose `{ month: number; year: number }` returning collected/overdue/expense/net revenue fields. | BLOCKED - live signature drift between repository migrations and generated types could not be resolved without live function catalog access. |

Live diff against repository expectations: **BLOCKED**. No live `pg_proc`, `pg_get_functiondef`, `pg_roles`, `information_schema.routine_privileges`, `pg_depend`, policy, or RLS interaction evidence was accessible.

## Authentication and authorization

| Required verification | Result | Evidence |
| --- | --- | --- |
| Enabled login methods | BLOCKED | Requires Supabase project auth config access. |
| Custom access-token-hook registration | BLOCKED | Migration creates `public.custom_access_token_hook(event jsonb)` and documents required dashboard/API registration, but live project-level enablement and URI could not be verified. |
| Authoritative role source | PASS repository expectation, BLOCKED live | Repository hook reads `public.profiles.role`; frontend authorization reads `user.app_metadata.user_role`. Live profile contents and token claims could not be inspected. |
| `app_metadata.user_role` issuance | BLOCKED | Requires live token/account inspection. |
| Approved beta-safe ADMIN account | BLOCKED | Requires approved Supabase auth/admin access or beta test credentials already available in environment; none were available. |
| Approved beta-safe MANAGER account | BLOCKED | Same blocker. |
| Approved beta-safe USER account | BLOCKED | Same blocker. |
| Anonymous denial behavior | BLOCKED | Requires live anonymous API/RLS checks against the intended target. |
| RLS posture for beta-facing tables | BLOCKED | Repository migrations enable RLS on core surfaces and later harden policies, but live `pg_class.relrowsecurity`, `pg_policy`, grants, and anonymous/authenticated behavior were not accessible. |

## Operational evidence

| Required verification | Result | Evidence |
| --- | --- | --- |
| Supabase logs | BLOCKED | Requires Supabase dashboard/API access. |
| Security advisors | BLOCKED | Requires Supabase dashboard/API access. |
| Performance advisors | BLOCKED | Requires Supabase dashboard/API access. |
| Backup posture | BLOCKED | Requires Supabase dashboard/API access. |
| Repeated Auth/API/Postgres/RLS/RPC errors | BLOCKED | No live logs were accessible. |

## Optional and recovered surfaces

| Surface | Classification | Evidence |
| --- | --- | --- |
| maintenance | HIDE_FROM_BETA_NAV | Repository contains a mutating maintenance workspace, but live schema/RLS was not verified and the surface is not constrained to read-only. |
| audit log | HIDE_FROM_BETA_NAV | Route exists, but the repository service returns an unavailable state because the live audit schema is unverified. |
| lands | HIDE_FROM_BETA_NAV | Route exists, but the repository service returns an unavailable state because no safe lands table is documented in the current verified schema. |
| leads | HIDE_FROM_BETA_NAV | Route exists, but the repository service returns an unavailable state because no safe leads/CRM table is documented in the current verified schema. |
| commissions | HIDE_FROM_BETA_NAV | Route exists, but the repository service returns an unavailable state because no separate commissions table is documented. |
| communication | HIDE_FROM_BETA_NAV | Route exists, but the repository service returns an unavailable state and intentionally sends no messages or provider calls. |
| system/governance | HIDE_FROM_BETA_NAV | Route exists and is role-gated in the frontend, but live auth/RLS and governance source support were not verified. |
| data integrity | HIDE_FROM_BETA_NAV | Route exists and reads core tables, but live schema/RLS and beta account authorization were not verified. |

## Required fixes ranking

| Priority | Fix | Scope |
| --- | --- | --- |
| P0 launch blocker | Provide authenticated read-only Vercel access for the intended beta project | Confirm project name, project ID, preview/production URLs, active production commit SHA, environment classification, redacted Supabase env targeting, build/install/output settings, rewrite, and headers. |
| P0 launch blocker | Provide authenticated read-only Supabase project/database access for the intended beta target | Confirm whether `nnggcnpcuomwfuupupwg` is the target; inspect migration history, schema/catalog, live `units.status` values, canonical status constraint, overlap trigger, RPC catalog, auth config, RLS posture, logs, advisors, and backups. |
| P0 launch blocker | Resolve any live drift discovered by the access-bound audit | Do not implement in this docs PR; split schema/RPC/RLS/auth/runtime fixes into separate narrow PRs after live evidence exists. |
| P1 constrained-beta improvement | Record canonical environment ownership in a secure operator runbook | Store project IDs/refs and environment classification in a redacted, access-controlled place rather than relying on `.temp` metadata. |
| P1 constrained-beta improvement | Hide optional/recovered nav surfaces for beta until verified | Maintenance, audit log, lands, leads, commissions, communication, system/governance, and data integrity should not be exposed to beta users until live support and authorization are verified. |
| Deferred | Feature expansion | Do not add new features before live launch evidence passes and single-office/non-ledger product boundaries remain intact. |

## PASS / FAIL / BLOCKED matrix

| Area | Result | Finding |
| --- | --- | --- |
| Repository active app boundary | PASS | `artifacts/rentrix/` is the active app per repository instructions and active package/config files. |
| Repository Vercel build/install/output/rewrite/header expectations | PASS | Root and app-local Vercel configuration provide expected static SPA deployment settings. |
| Repository migration inventory | PASS | 43 migration files are present under `supabase/migrations/`. |
| Repository unit-status canonical expectation | PASS | Repository migration defines canonical stored values `available`, `occupied`, `maintenance`, and `reserved`. |
| Repository contract overlap expectation | PASS | Repository migration defines a trigger-level active contract overlap guard. |
| Repository auth role expectation | PASS | Frontend recognizes only `ADMIN`, `MANAGER`, and `USER`, sourced from `app_metadata.user_role`. |
| Live Vercel target | BLOCKED | No authenticated Vercel metadata was available. |
| Live Supabase target | BLOCKED | Candidate ref was recovered but not confirmed; no authenticated Supabase metadata or SQL access was available. |
| Live migration/schema/RPC/auth/RLS/log/advisor/backup evidence | BLOCKED | Required live evidence could not be queried safely with available credentials. |
| Launch readiness | FAIL | Required launch verification could not be completed; constrained beta remains NO-GO. |

## Verification commands run

```bash
pwd
rg --files -g 'AGENTS.md' -g 'docs/CONSTRAINED_BETA_LAUNCH_AUDIT_2026_06_06.md' -g 'docs/ai/README.md' -g 'docs/ai/product-scope.md' -g 'docs/ai/domain-rules.md' -g 'docs/ai/engineering-policy.md' -g 'docs/ai/release-policy.md' -g 'docs/decisions/README.md' -g '.ai/workflows/README.md'
sed -n '1,240p' AGENTS.md
sed -n '1,260p' docs/CONSTRAINED_BETA_LAUNCH_AUDIT_2026_06_06.md
sed -n '1,220p' docs/ai/README.md
sed -n '1,220p' docs/ai/product-scope.md
sed -n '1,260p' docs/ai/domain-rules.md
sed -n '1,260p' docs/ai/engineering-policy.md
sed -n '1,220p' docs/ai/release-policy.md
sed -n '1,220p' docs/decisions/README.md
sed -n '1,220p' .ai/workflows/README.md
rg --files -g '!node_modules' -g '!artifacts/rentrix/node_modules'
rg --files artifacts/rentrix -g '!node_modules'
rg --files --hidden -g '!node_modules' -g '!artifacts/rentrix/node_modules' -g '.vercel/**' -g '.env*' -g 'supabase/**' -g '**/.temp/**' -g 'vercel.json' -g 'package.json' -g 'pnpm-workspace.yaml'
find . -name AGENTS.md -print
find artifacts/rentrix -maxdepth 2 -type f | sort
find supabase/.temp -maxdepth 1 -type f -print
python3 - <<'PY'
import os, re, pathlib
patterns = re.compile(r'(VERCEL|SUPABASE|VITE_SUPABASE|DATABASE_URL|PGHOST|PGUSER|PGPASSWORD|PGDATABASE|PGPORT|POSTGRES)', re.I)
print('matching environment variable names:')
for k in sorted(os.environ):
    if patterns.search(k):
        print(k)
print('supabase temp derived identifiers:')
p=pathlib.Path('supabase/.temp/pooler-url')
if p.exists():
    s=p.read_text().strip()
    refs=sorted(set(re.findall(r'([a-z0-9]{20})', s)))
    hosts=sorted(set(re.findall(r'([a-z0-9.-]*supabase[a-z0-9.-]*)', s)))
    print('project-ref-like values:', ', '.join(refs) if refs else 'none')
    print('supabase host-like fragments:', ', '.join(hosts) if hosts else 'none')
for f in ['supabase/.temp/postgres-version','supabase/.temp/gotrue-version','supabase/.temp/cli-latest']:
    p=pathlib.Path(f)
    if p.exists():
        print(f + ': ' + p.read_text().strip()[:80])
PY
CI=1 pnpm dlx vercel@latest whoami
CI=1 pnpm dlx supabase@latest projects list
sed -n '1,220p' vercel.json
sed -n '1,220p' artifacts/rentrix/vercel.json
sed -n '1,220p' package.json
sed -n '1,220p' artifacts/rentrix/package.json
sed -n '1,100p' artifacts/rentrix/src/integrations/supabase/client.ts
sed -n '1,80p' artifacts/rentrix/src/features/auth/permissions.ts
rg -n 'units_status|status.*vacant|status.*occupied|no_overlap|overlap|prevent.*overlap|renew_contract_atomic|record_invoice_payment_atomic|post_receipt_atomic|rpt_financial_summary|custom_access_token_hook|security definer|set search_path|grant execute|revoke execute|enable row level security|force row level security|create policy|drop policy' supabase/migrations artifacts/rentrix/src/types/database.ts artifacts/rentrix/src -g '!node_modules'
sed -n '1,160p' supabase/migrations/20260603094500_normalize_units_status_contract.sql
sed -n '1,180p' supabase/migrations/20260514062000_contract_overlap_guard.sql
sed -n '40,220p' supabase/migrations/20260604020400_reconcile_renew_contract_atomic.sql
sed -n '1,220p' supabase/migrations/20260604020300_add_record_invoice_payment_atomic_facade.sql
sed -n '1,120p' supabase/migrations/20260516110000_harden_post_receipt_authorization.sql
sed -n '1,120p' supabase/migrations/20260510055847_fix_get_financial_summary_function.sql
sed -n '1,120p' supabase/migrations/20260503140000_custom_access_token_hook.sql
sed -n '1,120p' artifacts/rentrix/src/layouts/app-nav-items.ts
sed -n '1,140p' artifacts/rentrix/src/features/lands/services/lands-service.ts
sed -n '1,140p' artifacts/rentrix/src/features/leads/services/leads-service.ts
sed -n '1,140p' artifacts/rentrix/src/features/commissions/services/commissions-service.ts
sed -n '1,140p' artifacts/rentrix/src/features/communication/services/communication-service.ts
sed -n '1,140p' artifacts/rentrix/src/features/maintenance/maintenance-page.tsx
sed -n '1,140p' artifacts/rentrix/src/features/audit/services/audit-log-service.ts
rg --files supabase/migrations | sort | wc -l
git status --short
git branch --show-current
git rev-parse HEAD
```
