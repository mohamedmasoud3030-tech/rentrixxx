# Current Gate Failures — 2026-05-20

## Scope
Stabilization-only pass on current `main` snapshot in this workspace:
- SonarCloud follow-up in `artifacts/rentrix/src/hooks/use-auth.tsx`
- Supabase Preview failure diagnosis constraints and migration-history posture

## Sonar issues found
Because this environment has no Git remote configured, direct hosted SonarCloud issue payload (rule keys + line numbers) was not retrievable from CI.

Local code inspection of `artifacts/rentrix/src/hooks/use-auth.tsx` identified likely Sonar-trigger patterns matching the recent auth-flow changes:
- nested conditional flow in `onAuthStateChange`
- duplicated loading-state handling branches
- repeated redirect guard logic shape
- use of `window` instead of `globalThis`
- use of the `void` operator for redirect navigation

Applied a behavior-preserving cleanup limited to this file:
- extracted `shouldRedirectToLogin(pathname)` helper
- added `redirectToLogin()` using `globalThis.location`
- switched auth event flow to `switch (event)`
- consolidated mounted loading-clear path via `stopLoadingIfMounted`
- removed `void window.location.assign(...)`
- preserved sign-out/session semantics from PR #577

## Supabase issue found
Hosted Supabase Preview failure output is not directly available in this environment.

From repository context and prior stabilization docs, the active failure class remains migration-history continuity ("remote migration versions not found in local migrations directory") and was already partially addressed by historical placeholder restoration in PR #573.

Current decision:
- PR #568 must **not** be merged as-is.
- PR #568 currently contains a broad corrective SQL migration with `SECURITY DEFINER` functions and dynamic `EXECUTE format(...)` logic, which is likely to keep Sonar/Supabase gates red.
- If Supabase Preview reports additional missing version(s), add forward-only no-op migration file(s) for exact version(s) with body:

```sql
SELECT 1;
```

No broad GRANT/SECURITY DEFINER/RLS toggles should be introduced for migration-history fixes.

## Files changed
- `artifacts/rentrix/src/hooks/use-auth.tsx`
- `docs/CURRENT_GATE_FAILURES_2026_05_20.md`

## PR #568 disposition
- **Keep blocked / do not merge as-is.**
- Replace #568 with smaller forward-only compatibility PRs only after hosted Supabase Preview reports concrete blockers.
- Recommended split order if still needed:
  1. `profiles.role` compatibility only.
  2. `serials` table-shape compatibility only.
  3. `increment_serial` compatibility only, with a focused Sonar review because it may require controlled dynamic SQL.
  4. `void_receipt_atomic` signature only, only if callers require it.
  5. `post_receipt_atomic` assertion only, only if Preview proves a mismatch.

## Validation commands run
- `pnpm --filter @workspace/rentrix typecheck`
- `pnpm --filter @workspace/rentrix build`
