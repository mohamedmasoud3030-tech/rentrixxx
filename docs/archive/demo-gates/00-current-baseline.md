# Demo Gates Current Baseline

Evidence level: LOCAL_VALIDATED for git commands; CODE_PRESENT for repository files.

## Git baseline

| Check | Result | Evidence |
| --- | --- | --- |
| Starting branch before audit branch | `work` | Command `git branch --show-current` returned `work`. |
| Audit branch | `codex/verify-rentrix-demo-gates` | Command `git switch -c codex/verify-rentrix-demo-gates` succeeded. |
| Latest base SHA | `43408c00a8c7e49e96ff2ef1842a55644f86630d` | Command `git rev-parse HEAD` returned this SHA before documentation edits. |
| Working tree before docs | clean | Command `git status --short` returned no tracked changes before creating `docs/demo-gates/`. |
| Current local Node | `v24.15.0` | Command `node --version` returned `v24.15.0`. |
| Current local pnpm | `10.11.1` | Command `pnpm --version` returned `10.11.1`; root package also pins pnpm 10.11.1. `package.json:6-8` |

## Recent history

Command `git log --oneline -n 12` returned:

```text
43408c0 docs(reconciliation): add full repository reconciliation audit reports (#782)
101d5db fix: reconcile demo payment and renewal database contracts (#780)
672047c docs(release): add v0.1 phase handoff
d530397 fix(db): record applied live operational compatibility
205ecbd fix(settings): hide local-only user management (#779)
1351e77 fix(settings): hide local-only user management
97cd9d8 fix(db): normalize units status contract (#778)
a79d791 feat(ui): complete operational route surfaces (#777)
bce33cb feat(ui): polish app layout and login experience
6f7fdbe fix: normalize legacy unit status casing (#774)
862ce33 ci: harden Rentrix validation workflow (#773)
37ab4b5 test: cover route recovery semantics (#772)
```

## Scope confirmation

This audit created documentation under `docs/demo-gates/` only. No application source, migration, function, SQL, Vercel, CI, package-manager, router, auth-provider, Supabase client, RLS, environment variable, or production/staging data changes were made.
