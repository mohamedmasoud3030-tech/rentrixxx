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

Applied a behavior-preserving cleanup limited to this file:
- extracted `shouldRedirectToLogin(pathname)` helper
- switched auth event flow to `switch (event)`
- consolidated mounted loading-clear path via `stopLoadingIfMounted`
- preserved sign-out/session semantics from PR #577

## Supabase issue found
Hosted Supabase Preview failure output is not directly available in this environment.

From repository context and prior stabilization docs, the active failure class remains migration-history continuity ("remote migration versions not found in local migrations directory") and was already partially addressed by historical placeholder restoration in PR #573.

Current decision:
- PR #568 should remain **blocked pending hosted check evidence** unless a new exact missing migration version is reported.
- If Supabase Preview reports additional missing version(s), add forward-only no-op migration file(s) for exact version(s) with body:

```sql
SELECT 1;
```

No broad GRANT/SECURITY DEFINER/RLS toggles should be introduced for this fix class.

## Files changed
- `artifacts/rentrix/src/hooks/use-auth.tsx`
- `docs/CURRENT_GATE_FAILURES_2026_05_20.md`

## PR #568 disposition
- **Keep blocked** until hosted Supabase Preview + SonarCloud checks return green, or update with exact forward-only migration marker(s) if Supabase provides missing version identifiers.

## Validation commands run
- `pnpm --filter @workspace/rentrix typecheck`
- `pnpm --filter @workspace/rentrix build`
