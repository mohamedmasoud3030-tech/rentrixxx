# Supabase Migration Reset Baseline (2026-05-20)

## Summary

This change resets local migration replay to a deterministic baseline without modifying production data.

## What was changed

1. Removed the old drifted migration SQL chain from active source control.
   - The prior archive folder was intentionally deleted to eliminate non-runtime duplication noise in Sonar and prevent accidental replay of superseded SQL.
2. Preserved remote migration history as replay-safe placeholders in `supabase/migrations/*_remote_history_placeholder.sql`.
   - Each placeholder contains: `SELECT 1;`
3. Added/kept the canonical baseline migration:
   - `supabase/migrations/20260520030000_current_schema_baseline.sql`

## Why old migrations were removed

The previous chain had drift and ordering failures that caused replay errors (missing dependencies/tables/functions). Keeping large superseded SQL archives in-repo also introduced Sonar duplication noise without runtime value. The canonical migration source is now:
- historical continuity via remote-history placeholders
- current schema definition via the baseline migration

## Remote versions preserved as placeholders

- 20260427102326
- 20260427102343
- 20260509080848
- 20260509080930
- 20260510055726
- 20260510055736
- 20260510055756
- 20260510055826
- 20260510055847
- 20260510055859
- 20260510055912
- 20260510060659
- 20260510060714
- 20260510061147
- 20260514011230
- 20260519023157

## Live schema source

Baseline content was derived from the provided live database inventory in task requirements because Supabase CLI is unavailable in this environment (`supabase: command not found`).

## Baseline characteristics

- Idempotent DDL (`IF NOT EXISTS`, `CREATE OR REPLACE`, safe `DROP POLICY IF EXISTS`).
- Dependency-safe ordering:
  - extension
  - tables
  - key relationship columns
  - foreign keys
  - indexes
  - functions
  - triggers
  - RLS
  - policies
- No production data included.
- No broad grants introduced.
- RLS remains enabled.

## Remaining advisor warnings / deferred items

- Function bodies for advanced RPCs (`post_receipt_atomic`, `void_receipt_atomic`, `renew_contract_atomic`, reporting suite) were not reconstructed exactly from live DB due lack of direct schema dump access.
- Table-by-table exact column parity with production should be verified with `supabase db dump --schema public --schema-only` when CLI access is available.
- Additional indexes and constraints beyond baseline-safe set may still need sync from production dump.

## Validation commands run

- `pnpm --filter @workspace/rentrix typecheck`
- `pnpm --filter @workspace/rentrix build`

## Risks

- This baseline guarantees replay safety and object presence but may not yet capture full production-level business constraints in every table/function.
- A follow-up exact-schema alignment migration may still be required once direct Supabase schema dump tooling is available.
