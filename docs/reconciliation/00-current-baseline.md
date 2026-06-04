# 00 - Current Runtime Baseline

Audit date: 2026-06-04.

## Git baseline

| Command | Result |
| --- | --- |
| `git status --short` | clean before audit documentation was created |
| `git branch --show-current` | `work` |
| `git rev-parse HEAD` | `101d5db4a11429492e8fafba61edcb38c27000a5` |

## Validation suite

All requested current-runtime validation commands were run before inspecting recovery candidates. No source, schema, deployment, or production-service changes existed before these commands.

| Command | Exit code | Duration | Warning summary | Error summary | Affected files | Pre-existing failure? |
| --- | ---: | ---: | --- | --- | --- | --- |
| `pnpm --filter ./artifacts/rentrix run typecheck` | 0 | 45s | Node emitted `[DEP0169]` for `url.parse()` via toolchain. | None. | TypeScript project under `artifacts/rentrix/tsconfig.json`. | No failure; passed before audit work. |
| `pnpm --filter ./artifacts/rentrix run lint` | 0 | 40s | Node emitted `[DEP0169]` for `url.parse()` via toolchain. Script is currently TypeScript no-emit, not ESLint. | None. | TypeScript project under `artifacts/rentrix/tsconfig.json`. | No failure; passed before audit work. |
| `pnpm --filter ./artifacts/rentrix run typecheck:test` | 0 | 32s | Node emitted `[DEP0169]` for `url.parse()` via toolchain. | None. | TypeScript test project under `artifacts/rentrix/tsconfig.test.json`. | No failure; passed before audit work. |
| `pnpm --filter ./artifacts/rentrix test` | 0 | 25s | Node emitted `[DEP0169]`; tests for payments, units, and expenses logged `Supabase environment is incomplete. Runtime diagnostics will be shown in UI.` | None. | 7 Vitest files, 22 tests. | No failure; passed before audit work. |
| `pnpm --filter ./artifacts/rentrix run build` | 0 | 56s | Node emitted `[DEP0169]`; Vite emitted `Generated an empty chunk: "react-vendor"`; PWA generated service worker assets. | None. | Vite production bundle under `artifacts/rentrix/dist/public`. | No failure; passed before audit work. |

## Baseline conclusion

The deployable runtime in `artifacts/rentrix/` is a passing baseline. Reconciliation should preserve it unless a specific file-level comparison proves that a historical implementation should be selectively adapted into the current architecture.

