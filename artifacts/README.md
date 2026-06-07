# Rentrix Artifacts Map

This directory contains the active application package and optional support artifacts.

## Canonical runtime

```text
artifacts/rentrix/
```

This is the deployed Rentrix web application. Treat its TanStack Router, React Query, Supabase, RTL, i18n, and PWA architecture as canonical.

## Optional support artifacts

```text
artifacts/rentrix-promo/
```

The promo project supports promotional work. It is not part of the canonical production runtime and remains outside the root pnpm workspace.

Rules:

- Do not add it to production builds without a reviewed decision.
- Do not treat its routing, state, or dependencies as authoritative for the main app.
- Port useful UI selectively only after verifying accessibility, RTL, mobile behavior, and runtime compatibility.

## Recovery references

```text
archive/recovery-reference/
```

Broad historical recovery code was removed. Only concise recovery notes are retained outside `artifacts/` for reference-only maintenance.

Do not restore legacy `react-router-dom`, `AppContext`, `useApp`, `dataService`, local database flows, or broad legacy barrels into the active application. Adapt only the smallest useful note after verifying current schema and architecture boundaries.
