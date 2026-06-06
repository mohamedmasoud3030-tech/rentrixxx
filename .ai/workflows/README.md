# Rentrix Agent Workflows

Choose one workflow before editing. Keep each task narrow.

## Repository audit

Use for broad inspection without feature work.

1. Inspect the repository root with `rg --files`.
2. Map active code, legacy code, migrations, RLS, routes, services, tests, env variables, and build scripts.
3. Classify findings as blocker, safe cleanup, restore candidate, deferred item, or verified healthy area.
4. Do not delete risky files or add features.
5. Run the applicable verification commands and report exact blockers.

## Safe bug fix

1. Reproduce or trace the defect from actual code.
2. Identify the smallest root cause.
3. Modify the narrowest safe surface.
4. Add or update a targeted regression test.
5. Run typecheck, lint, tests, and build.
6. Review the final diff for unrelated changes.

## Frontend page completion

1. Confirm the route is active.
2. Compare existing implementation with stronger legacy candidates only when useful.
3. Complete the page using current TanStack Router, React Query, i18n, RTL, and component patterns.
4. Check Arabic RTL, English LTR, mobile layout, empty states, loading states, and error states.
5. Do not introduce placeholder labels or new product scope.

## Supabase migration or RLS review

1. Read the active schema and migration chain.
2. Map affected tables and domain invariants.
3. Review RLS for authenticated and privileged paths.
4. Keep migrations conservative and versioned.
5. Add business-rule coverage where applicable.
6. Run the approved local database validation flow when available.

## Release check

1. Read `docs/ai/release-policy.md`.
2. Run the full verification gate.
3. Review routes, active pages, database boundaries, mobile behavior, RTL, LTR, and PWA behavior affected by the change.
4. Return exact results, blockers, changed files, and commit SHA.