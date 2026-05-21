# PR #567 Decomposition Report (against latest `main` snapshot)

Date: 2026-05-20

## Scope and method

- Base used: current latest local `main` snapshot available in this workspace (`HEAD` at commit `8b53ccc`).
- PR #567 branch/diff is not present locally as a Git ref in this environment, so this report uses:
  - the explicitly listed change themes from task context,
  - current repository state inspection,
  - related docs/history in this repo.

## Decomposition matrix

| Change from #567 | Status | Why | Recommended split PR order | Risk | Files involved (expected/observed) |
|---|---|---|---|---|---|
| PWA manifest icon sizes | **already done** | `public/manifest.json` already includes `192x192` and `512x512` png entries (any + maskable), so preferred first slice is already present on latest main. | N/A (no new PR needed for this slice) | Low | `artifacts/rentrix/public/manifest.json` |
| Expense service error propagation | **keep (separate future PR)** | Still potentially useful, but should be isolated because behavior/error-contract changes can impact multiple callers. Not implemented in this run by rule. | PR-1 after manifest decision | Medium | likely under `artifacts/rentrix/src/**/expense*` and consumers |
| Auth sign-out/session UX | **defer** | UX/session flow can be high-blast-radius and may overlap route/session guards; must be scoped and reviewed independently. Not part of manifest-only first slice. | PR-2 (only after explicit product scope) | Medium-High | likely auth/session modules and protected-route shell |
| App-shell recovery modules cleanup | **defer** | Cleanup changes are frequently mixed with behavior shifts; defer until a no-functional-change cleanup PR can be validated independently. | PR-3 | Medium | app-shell/layout/recovery related modules |
| Arrears two-year lookback | **keep (separate future PR)** | Business-rule/data-window logic may affect reports and totals; should be isolated with targeted tests and explicit stakeholder sign-off. | PR-4 | Medium-High | arrears report/query service modules |
| Supabase RPC auth guard migrations | **defer (high risk)** | Migration/auth-guard changes are security-sensitive. Must avoid stale migration reuse and avoid introducing `SECURITY DEFINER` unless strictly required and documented. | PR-5 (DB-focused, dedicated review) | High | `artifacts/rentrix/supabase/migrations/*` (expected) |

## First-slice implementation decision for this run

- Preferred first slice was **PWA manifest icon sizes only if still needed**.
- On latest main, manifest icon sizes are already correct.
- Therefore **no code changes to runtime files were made**; only this decomposition report is added.

## Recommendation on PR #567

- **Do not merge PR #567 as-is**.
- **Close PR #567 as superseded** by latest main + planned split PRs.
- Re-open only narrowly scoped, independent follow-up PRs for still-useful items (expense propagation, arrears lookback, and any DB/auth-guard work with dedicated security review).
