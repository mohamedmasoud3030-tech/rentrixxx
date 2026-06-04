# Local Validation Results

Evidence level: LOCAL_VALIDATED.

All required current-runtime validation commands completed with exit code 0 on `@workspace/rentrix`.

| Command | Exit code | Duration | Affected package | Result type | Warnings / diagnostics |
| --- | ---: | ---: | --- | --- | --- |
| `pnpm --filter ./artifacts/rentrix run typecheck` | 0 | 16s | `@workspace/rentrix` | TypeScript no-emit | Node emitted `[DEP0169]` `url.parse()` deprecation warning before script output. |
| `pnpm --filter ./artifacts/rentrix run lint` | 0 | 16s | `@workspace/rentrix` | TypeScript no-emit, not ESLint | The lint script is `tsc -p tsconfig.json --noEmit`, so this is not an ESLint result. `artifacts/rentrix/package.json:10-14`; Node emitted `[DEP0169]`. |
| `pnpm --filter ./artifacts/rentrix run typecheck:test` | 0 | 13s | `@workspace/rentrix` | Test TypeScript no-emit | Node emitted `[DEP0169]`. |
| `pnpm --filter ./artifacts/rentrix test` | 0 | 10s | `@workspace/rentrix` | Vitest targeted suite | 7 files and 22 tests passed. Recoverable Supabase incomplete-environment diagnostics appeared in payment, units, and expenses test modules. |
| `pnpm --filter ./artifacts/rentrix run test:financials` | 0 | 14s | `@workspace/rentrix` | Vitest financial suite | 15 files and 53 tests passed. Recoverable Supabase incomplete-environment diagnostics appeared in expenses, invoices, payments, and expenses-page test modules. |
| `pnpm --filter ./artifacts/rentrix run build` | 0 | 22s | `@workspace/rentrix` | Vite production build | Vite emitted `Generated an empty chunk: "react-vendor"`; build completed in 15.33s and generated PWA files. |

## Validation conclusion

The current runtime passes the local validation suite at LOCAL_VALIDATED level. The lint result must be described as TypeScript no-emit only, because the package-local `lint` script is not ESLint. `artifacts/rentrix/package.json:10-14`
