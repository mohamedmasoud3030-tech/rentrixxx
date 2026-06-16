# Supabase Environment And Migration Evidence

Evidence levels: CODE_PRESENT for repository evidence; UNKNOWN/BLOCKED for unavailable metadata and live database checks.

## Runtime environment variables

The current runtime reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `artifacts/rentrix/src/lib/env.ts:1-2` Missing values are converted to invalid placeholders and tracked by `isConfigured` rather than crashing at module load. `artifacts/rentrix/src/lib/env.ts:4-8` The Supabase client logs a recoverable diagnostic when incomplete. `artifacts/rentrix/src/integrations/supabase/client.ts:5-7`

## Environment metadata access

| Check | Result | Evidence |
| --- | --- | --- |
| Vercel CLI | ENV_METADATA_ACCESS_UNAVAILABLE | Command `command -v vercel` returned empty. |
| Supabase CLI | ENV_METADATA_ACCESS_UNAVAILABLE | Command `command -v supabase` returned empty. |
| Vercel project link | ENV_METADATA_ACCESS_UNAVAILABLE | Command `find . -maxdepth 3 -type f -path './.vercel/*'` returned no files. |
| Supabase config | ENV_METADATA_ACCESS_UNAVAILABLE | `supabase/config.toml` is absent; command `find . -maxdepth 3 -type f '( -path ./supabase/* )'` listed migrations/temp files only. |
| Secret env | No usable deployment/database credentials discovered | Command `env | rg -n "VERCEL|SUPABASE|DATABASE|POSTGRES|PGHOST|PGDATABASE|PGUSER|PGPASSWORD|GITHUB|GH_|VITE_SUPABASE"` found only `GH_PAGER`, masked. |

Preview and Production variable presence, project refs, and configured/missing values are UNKNOWN.

## Required migration presence

| Migration | Present in Git? | Repository evidence |
| --- | --- | --- |
| `20260603094500_normalize_units_status_contract.sql` | yes | Defines canonical values and historical `rented` alias behavior. `supabase/migrations/20260603094500_normalize_units_status_contract.sql:1-17`; `supabase/migrations/20260603094500_normalize_units_status_contract.sql:19-49` |
| `20260604020000_reconcile_demo_entity_id_defaults.sql` | yes | Sets missing ID defaults for demo-critical tables when present. `supabase/migrations/20260604020000_reconcile_demo_entity_id_defaults.sql:1-34` |
| `20260604020100_reconcile_payment_reference_compatibility.sql` | yes | Adds/syncs `reference_number` and `payment_reference`. `supabase/migrations/20260604020100_reconcile_payment_reference_compatibility.sql:1-37` |
| `20260604020200_reconcile_contract_serial_helper.sql` | yes | Adds `serials`, `increment_serial`, and contract-number trigger support. `supabase/migrations/20260604020200_reconcile_contract_serial_helper.sql:1-94` |
| `20260604020300_add_record_invoice_payment_atomic_facade.sql` | yes | Adds browser-safe payment facade and idempotency table. `supabase/migrations/20260604020300_add_record_invoice_payment_atomic_facade.sql:1-13` |
| `20260604020400_reconcile_renew_contract_atomic.sql` | yes | Present in `supabase/migrations/` per command `rg --files supabase/migrations`. |

## Units status contract

The normalization migration documents canonical stored values `available`, `occupied`, `maintenance`, and `reserved`; it accepts `rented` only as a historical incoming alias and maps it to `occupied`. `supabase/migrations/20260603094500_normalize_units_status_contract.sql:1-3`; `supabase/migrations/20260603094500_normalize_units_status_contract.sql:28-42` It adds and validates `units_status_canonical_check`. `supabase/migrations/20260603094500_normalize_units_status_contract.sql:99-117`

## Live migration application status

DATABASE_MIGRATION_APPLICATION_STATUS_UNKNOWN. No read-only Supabase migration-history tooling or database connection was available, so this audit did not run migration-history queries, `public.units` aggregates, or `pg_constraint` checks. The required safe SQL queries remain pending under separate approved read-only access:

```sql
select lower(trim(status::text)) as normalized_status, count(*)
from public.units
group by lower(trim(status::text))
order by normalized_status;
```

```sql
select conname
from pg_constraint
where conrelid = 'public.units'::regclass
  and conname = 'units_status_canonical_check';
```
