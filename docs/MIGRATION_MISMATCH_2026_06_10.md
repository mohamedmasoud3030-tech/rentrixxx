# Supabase Migration Mismatch — 2026-06-10

## Problem

**Remote Supabase** has applied real migrations (71 total versions tracked)  
**Local `supabase/migrations/`** has 14 placeholder files (`-- noop` only)

Example stub files:
```
20260427102326_rentrix_complete_production_setup.sql → -- noop
20260509080848_fix_contracts_rls_policy.sql → -- noop
20260510055726_fix_owner_settlements_status_column.sql → -- noop
... 11 more
```

## Why This Breaks

1. **Vercel deployment** runs `supabase db push` which checks if local migration versions match remote
2. Local versions say "-- noop" (nothing to do)
3. Remote already has schema from real migrations
4. CLI sees mismatch → blocks deployment with: `Remote migration versions not found in local migrations directory`

## Root Cause

These stubs were created when:
- Migrations were being skipped or rolled back during development
- `supabase start --no-seed` was used to reset local state
- The actual migration SQL content wasn't saved back to the repo

## Solution (Choose One)

### Option A: Sync Remote to Local (Recommended)
Pull the actual migration content from remote Supabase:

```bash
# 1. Download remote migration history
supabase db pull --schema-only

# 2. Commit the real migrations
git add supabase/migrations/
git commit -m "sync: pull actual migrations from remote Supabase"

# 3. Verify all noop files are replaced with real SQL
```

### Option B: Remove Noop Stubs + Reset Local
If you want a clean slate:

```bash
# 1. Delete all noop files from local
rm supabase/migrations/202605*.sql

# 2. Keep only migrations that have real SQL content
# (check: any file > 100 bytes is real, < 20 bytes is noop)

# 3. Re-initialize local from remote
supabase db pull

# 4. Commit
git add supabase/migrations/
git commit -m "fix: remove noop stubs and sync with remote"
```

### Option C: Create Noop Migrations for Remote (Not Recommended)
Replace all noop stubs with real SQL pulled from remote — this is what Option A does better.

## Verification

After fixing, check:

```bash
# All files should be > 100 bytes (real SQL), not 8 bytes (noop)
find supabase/migrations -name "*.sql" -exec wc -c {} + | awk '$1 < 20 {print $0 " ← NOOP STUB"}'

# Should return empty (no stubs)
```

## Impact on Rentrix

- **Code changes** in `artifacts/rentrix/` are independent and safe
- **DB schema** on remote Supabase is live and correct
- **Local dev** cannot sync migrations until this is resolved
- **Vercel deployment** will fail on `supabase db push`

## Next Steps

1. Run `supabase db pull` from the project root
2. Review the migrations that come back
3. Commit them: `git add supabase/migrations/ && git commit -m "sync: restore remote migrations"`
4. Merge the PR after fixing this

---

**Status:** Requires immediate attention before production deploy  
**Type:** Infrastructure / DevOps  
**Severity:** High (blocks CI/CD)
