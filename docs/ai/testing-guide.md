# Rentrix Testing Guide

Tests should protect business behavior, not only rendered pages.

## Expectations

- Add a focused regression test for bug fixes when practical.
- Add business-rule tests when contract, invoice, payment, receipt, balance, arrears, expense, report, or route behavior changes.
- Keep route and navigation parity coverage active when changing visible or deferred modules.
- Check Arabic RTL and English LTR behavior for changed user-facing pages.
- Check responsive behavior for changed operational pages.
- Record browser or device limitations honestly. Do not claim screenshots, PWA, print, or mobile verification that did not run.

## Targeted verification during implementation

Run the smallest relevant test set while editing, then run the applicable full gate before handoff.

Examples:

```bash
pnpm --filter ./artifacts/rentrix exec vitest run --config vite.config.ts <targeted-test-files>
pnpm --filter ./artifacts/rentrix run typecheck:test
```

## Full runtime pull-request gate

GitHub Actions currently runs:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
```

When a local checkout exists, also run:

```bash
git diff --check
rg "useApp|AppContext|dataService|react-router-dom" artifacts/rentrix/src -n || true
```

## Documentation-only and agent-guidance pull requests

For docs-only changes:

- review the diff for stale references and contradictions;
- confirm no runtime file changed;
- run `git diff --check` when a local checkout exists;
- use pull-request CI as the source of truth when local checkout is unavailable.

## Database, auth, RPC, or RLS changes

Also run the repository-approved Supabase validation flow when the required local or preview environment is available. Keep validation preview-first. Do not claim live verification unless it actually ran against the approved target.

## Reporting

Report every command with its actual result. Distinguish clearly between:

```text
passed
failed
blocked
not run because outside scope
not run because environment unavailable
```
