# Project Audit — 2026-03-29

## Scope
A full technical pass was run on the active web system (React + Vite + Supabase), covering:
- source code reachability and orphan files
- package/runtime dependencies
- service integrations and data flow
- build health after cleanup

## Key Findings
1. The active runtime is web-only and does not reference any desktop or Electron path.
2. A set of files was fully orphaned (not reachable from `src/index.tsx`).
3. Two non-runtime directories were tracked in the repository and not used by production runtime:
   - `attached_assets/` (chat attachment leftovers)
   - `artifacts/mockup-sandbox/` (isolated design sandbox)

## Cleanup Applied
### Deleted orphan source files (unreachable from app entry)
- `src/components/print/PrintPageLayout.tsx`
- `src/components/print/SignatureBlock.tsx`
- `src/components/print/layout/BottomNav.tsx`
- `src/components/ui/KpiCard.tsx`
- `src/hooks/useDebouncedSave.ts`
- `src/hooks/useMemoizedData.ts`
- `src/pages/print/PrintContract.tsx`
- `src/pages/print/PrintReceipt.tsx`

### Deleted non-runtime directories
- `attached_assets/`
- `artifacts/mockup-sandbox/`

## Integrity Checks
- Re-ran a reachability scan after cleanup: no orphan source files remained (excluding `src/vite-env.d.ts`, which is expected ambient typing).
- Production build completed successfully.

## Result
The repository now better matches the currently running web product: fewer dead files, smaller maintenance surface, clearer architecture boundaries, and clean build status.
