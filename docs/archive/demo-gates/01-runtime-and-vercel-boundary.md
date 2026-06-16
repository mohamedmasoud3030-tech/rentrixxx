# Runtime And Vercel Boundary

Evidence level: CODE_PRESENT unless otherwise stated.

## Workspace boundary

| Question | Finding | Evidence |
| --- | --- | --- |
| Canonical runtime package | `@workspace/rentrix` under `artifacts/rentrix` | The workspace includes `artifacts/rentrix`. `pnpm-workspace.yaml:6-9`; the package name is `@workspace/rentrix`. `artifacts/rentrix/package.json:1-5` |
| Root build command | `pnpm run build` | Root `vercel.json` sets `buildCommand` to `pnpm run build`. `vercel.json:1-4` |
| Root build script behavior | Recursive build for workspace packages with build scripts | Root `package.json` defines `build` as `pnpm -r --if-present run build`. `package.json:10-15` |
| Runtime build script | `vite build --config vite.config.ts` | `artifacts/rentrix/package.json:6-14` |
| Vite root | `artifacts/rentrix` | Vite config sets `root` to `import.meta.dirname`. `artifacts/rentrix/vite.config.ts:52-61` |
| Build output | `artifacts/rentrix/dist/public` | Root Vercel output is `artifacts/rentrix/dist/public`, and Vite writes `dist/public` relative to `artifacts/rentrix`. `vercel.json:1-4`; `artifacts/rentrix/vite.config.ts:60-62` |

## Vercel config precedence

| File | Role from repository root | Evidence | Decision |
| --- | --- | --- | --- |
| `vercel.json` | Authoritative when Vercel deploys from repository root | It defines root install, build, output, rewrites, and headers. `vercel.json:1-32` | AUTHORITATIVE_FROM_ROOT |
| `artifacts/rentrix/vercel.json` | Package-local config only if the Vercel project root is changed to `artifacts/rentrix` | It defines only `dist/public` and a local rewrite, with no root build/install boundary. `artifacts/rentrix/vercel.json:1-9` | NO_INDEPENDENT_EFFECT_FROM_ROOT |

## Deep-link hosting support

Root Vercel config contains a catch-all rewrite to `/index.html`; direct browser navigation to SPA routes should not hosting-404 when this root config is used. `vercel.json:6-8`

## CI versus Vercel runtime drift

| Surface | Node/runtime evidence | Assessment |
| --- | --- | --- |
| CI | GitHub Actions setup-node uses Node 22. `.github/workflows/ci.yml:21-26` | CODE_PRESENT |
| Local audit environment | `node --version` returned `v24.15.0`. | LOCAL_VALIDATED |
| Vercel | No `.vercel/project.json`, `vercel` executable, token, or deployment inspection metadata was available. Command `command -v vercel` returned empty; command `find . -maxdepth 3 -type f -path './.vercel/*'` returned no files. | UNKNOWN |

Conclusion: CI uses Node 22 while the local audit shell used Node 24.15.0. Vercel Node runtime is UNKNOWN, so any CI-versus-Vercel Node drift is UNVERIFIED rather than proven harmless.
