# Supabase Migration History Reconciliation (PR #580 blocker)

## Problem
Supabase Preview for PR #580 failed at the migration-history stage with:

- `Remote migration versions not found in local migrations directory`

This happens when the remote project has applied migration versions that do not have a matching local `supabase/migrations/<version>_*.sql` file.

## Remote versions used for reconciliation
Based on the provided Supabase migration history for project `nnggcnpcuomwfuupupwg`:

- 20260427102326
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

## Local migration directory comparison
Checked local files under `supabase/migrations/*.sql` and compared by version prefix.

### Already present locally
- 20260427102326 ✅
- 20260509080848 ✅
- 20260509080930 ✅
- 20260510055726 ✅
- 20260510055736 ✅
- 20260510055756 ✅
- 20260510055826 ✅
- 20260510055847 ✅
- 20260510055859 ✅
- 20260510055912 ✅
- 20260510060659 ✅
- 20260510060714 ✅
- 20260510061147 ✅
- 20260514011230 ✅

### Missing locally before this fix
- 20260519023157 ❌

## Actions taken
1. Searched backup location `.migration-backup/supabase/migrations` for an exact `20260519023157` migration file.
2. No exact original SQL file with that version was found.
3. Added a safe historical placeholder migration file:
   - `supabase/migrations/20260519023157_remote_history_placeholder.sql`
   - SQL body: `SELECT 1;`

## Why this fixes the preview blocker
Supabase preview only needs every remote-applied migration version to have a local file with the same leading version number. By adding `20260519023157_*`, local history now covers that remote version, resolving the history mismatch gate.

## Important scope note
- This reconciliation only addresses migration history/version parity.
- RLS advisor warnings are a separate concern and should be handled only after migration history checks pass.
- This change is Supabase-only; no frontend/UI/app code changes were made.
