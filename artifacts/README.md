# Rentrix Artifacts Map

This directory contains the active application package and optional support artifacts.

## Canonical runtime

```text
artifacts/rentrix/
```

This is the deployed Rentrix web application. Treat its TanStack Router, React Query, Supabase, RTL, i18n, and PWA architecture as canonical.

## Optional support artifacts

```text
artifacts/mockup-sandbox/
artifacts/rentrix-promo/
```

These packages support preview, visual exploration, or promotional work. They are not part of the canonical production runtime and remain outside the root pnpm workspace.

Rules:

- Do not add them to production builds without a reviewed decision.
- Do not treat their routing, state, or dependencies as authoritative for the main app.
- Port useful UI selectively and verify accessibility, RTL, mobile behavior, and runtime compatibility.

## Historical recovery code

```text
artifacts/rentrix/legacy-src/
```

This is retained as a recovery source only. It is not deployed code.

Do not restore legacy `react-router-dom`, `AppContext`, `useApp`, `dataService`, local database flows, or broad legacy barrels into the active application. Adapt only the smallest useful implementation after verifying current schema and architecture boundaries.
