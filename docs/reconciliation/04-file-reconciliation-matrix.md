# 04 - File-Level Reconciliation Matrix

The machine-readable file-level matrix is in `04-file-reconciliation-matrix.csv`. It matches historical files by purpose, not only by identical path.

## Classification counts

| Classification | Count | Meaning |
| --- | ---: | --- |
| KEEP_NEW | 12 | Keep current runtime implementation; historical file should not be ported. |
| PORT_OLD | 2 | Historical shared component can be ported with small current-style adaptation when first needed. |
| MERGE | 13 | Extract selected logic/UX into current implementation. |
| REWRITE_ADAPTER | 12 | Historical behavior is useful but must be rewritten behind current router/auth/Supabase/services. |
| REFERENCE_ONLY | 9 | Use as design/schema/behavior reference only. |
| DISCARD | 5 | Do not port because it conflicts with current architecture or audit constraints. |

## Cross-cutting rules for every port

| Rule | Reason |
| --- | --- |
| Do not import from `.migration-backup/` or `legacy-src/` in runtime. | Recovery sources are not app bundle sources. |
| Do not import historical barrels (`services/index.ts`, `hooks/index.ts`, design-system barrel) directly. | They pull deprecated architecture and create barrel-export risk. |
| Replace `useApp`, `AppContext`, `dataService`, and React Router hooks with current adapters. | Current runtime shell is canonical. |
| Preserve current Supabase client and env diagnostics. | Baseline tests rely on non-crashing incomplete-env behavior. |
| Treat write-capable finance/accounting/repair flows as blocked until schema and permission verification. | Avoid unsafe financial writes and data mutation. |
