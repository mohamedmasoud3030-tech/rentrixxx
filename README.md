<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Rentrix

Production-ready SaaS for property, contracts, maintenance, and financial operations.

## Local setup

**Prerequisites**
- Node.js 20+
- npm 10+

1. Install dependencies deterministically:
   ```bash
   npm ci
   ```
2. Run preflight checks:
   ```bash
   npm run preflight
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

## Required environment variables

For strict runtime/deployment validation, set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

To enforce strict env checks in preflight:
```bash
PREFLIGHT_STRICT_ENV=1 npm run preflight
```

## CI pipeline contract

CI is expected to run in this order:

```bash
npm ci
npm run preflight
npm run typecheck
npm run lint
npm run test
npm run build
```

This avoids global-tool drift and ensures reproducible installs.

## Tooling dependencies used by scripts

The project scripts rely on local devDependencies, including:
- `typescript` (for `typecheck` / `test:prepare`)
- `vite` (for `dev` / `build`)

## Agent scheduling integration

The Contract Monitoring Agent supports:
- Manual runs with stored execution records
- Scheduled/background runs (lightweight `setInterval` scheduler)
- History retrieval for dashboards/logging

Entry points:
- `src/agents/orchestration/agentScheduler.ts`
- `src/agents/orchestration/contractMonitoringWorkflow.ts`

## Common CI/CD failure scenarios

1. **`tsc` missing in CI**
   - Fix: ensure `typescript` is present in `devDependencies` and lockfile, then run `npm ci`.

2. **Preflight fails for missing binaries**
   - Fix: run `npm ci` first (do not rely on global installs).

3. **Preflight strict env failure**
   - Fix: define `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in CI/deployment secrets.
