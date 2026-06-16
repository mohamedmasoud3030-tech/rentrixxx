# v0.1 Preview Migration Blocker

**Status:** BLOCKED  
**Date:** 2026-06-09  
**Roadmap:** v0.1 Items 2–6 blocked by this issue  

---

## Problem

Supabase preview branch for multiple PRs (#819, #820, #823, and subsequent) is failing with:

```
Remote migration versions not found in local migrations directory
```

The preview branch has become stuck in a corrupted migration history state. Attempts to trigger fresh replay (via close/reopen or new commits) do not resolve the issue.

---

## Root cause

Unknown without direct Supabase CLI access to the preview project. Likely causes:
1. Migration version number mismatch between local git and remote preview state
2. Partial migration application on preview (some applied, some rolled back)
3. Ghost migration records in preview `supabase_migrations` table with no corresponding local files

---

## Current state

- **Live (nnggcnpcuomwfuupupwg):** ✅ All migrations applied successfully through `20260608000300`
- **Preview branch:** ❌ Stuck — cannot replay migrations
- **Local migrations:** ✅ All 51 migrations present in `supabase/migrations/`

---

## Impact

v0.1 Items 2–6 are blocked:
- Item 2: Read-only live migration-state reconciliation — blocked by access
- Item 3: Preview-branch migration replay — **this blocker**
- Item 5: Browser/manual QA — blocked by preview access
- Item 6: Final release check — blocked by preview access

**Workaround:** Runtime code PRs (v0.2 Item 1, 2, 3, etc.) can proceed without preview. These do not require migration testing.

---

## Resolution path (requires action outside this environment)

1. **Operator action:** 
   - Access Supabase CLI with authenticated token to preview project
   - Run `supabase branches list` to identify the corrupted preview branch
   - Run `supabase db pull` to sync remote state
   - If state is unrecoverable: delete the preview branch and trigger a fresh one

2. **Or:** Accept this as a known blocker for v0.1 and complete v0.2 UX work (runtime code only, no migrations)

3. **Or:** Focus on live-environment rollout (skip preview testing) after recorded manual verification

---

## Mitigation for future releases

- Add a `.supabase/config.toml` with preview reset threshold to auto-delete stale branches
- Use `supabase branch reset` in CI before major migration rollouts
- Track preview branch creation date and TTL separately from live
