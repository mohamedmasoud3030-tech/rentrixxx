# 02 - Architecture Comparison

## Recommendation table

| Concern | Current runtime | Historical source | Classification | Recommended canonical approach |
| --- | --- | --- | --- | --- |
| Package manager | Root `pnpm@10.11.1`, workspace scripts, preinstall guard. | Standalone package with npm engines and multiple lockfiles. | KEEP_CURRENT | Preserve pnpm workspace and avoid importing historical package strategy. |
| Workspace | `artifacts/rentrix` package under root workspace. | `.migration-backup` standalone app. | KEEP_CURRENT | Keep current deployment boundary. |
| Router | TanStack Router file routes. | React Router in `src/App.tsx` and nested finance routes. | KEEP_CURRENT | Preserve TanStack Router; translate old routes into file routes only when porting. |
| Auth provider | Current `app/auth.tsx` and protected route shell. | `AppContext`, `authContext`, `authService`. | KEEP_CURRENT | Do not restore AppContext; expose minimal adapters if historical UI needs auth state. |
| Permissions | Current route/shell checks are narrower and runtime-specific. | Role/capability checks embedded in React Router and `ProtectedRoute`. | WRITE_ADAPTER | Build a small permission mapping before admin/history features. |
| Query client | Current TanStack Query feature hooks. | TanStack Query plus context/dataService patterns. | KEEP_CURRENT | Use current query keys/hooks; do not import legacy query barrels. |
| Supabase client | `integrations/supabase/client.ts` creates typed client and logs diagnostics when env is incomplete. | `config/env.ts` hard-throws on missing env; old service wrappers. | KEEP_CURRENT | Preserve current client and diagnostics behavior. |
| Diagnostics | UI can surface incomplete Supabase env without crashing. | Env helper can throw during module evaluation. | DISCARD | Do not port hard-failing env helper. |
| Error handling | Current feature pages use query error states and shared UI. | ErrorBoundary components and classification helpers exist. | MERGE_SELECTIVELY | Reference old error classification only where it improves current recoverable states. |
| Loading states | Current pages use skeletons and query loading states. | `LoadingSkeleton`, `PageStates`, design-system states. | MERGE_SELECTIVELY | Reuse current skeletons; port old state cards only if needed by adapted pages. |
| Empty states | Current `EmptyState` used across demo routes. | `PageStates`, DS components, page-specific empty text. | MERGE_SELECTIVELY | Keep current `EmptyState`; adapt copy from old pages where useful. |
| UI primitives | Current shadcn-style primitives under `src/components/ui`. | Older primitives plus DS atoms. | MERGE_SELECTIVELY | Avoid duplicate primitive imports; port only missing primitive behavior. |
| Design system | Minimal runtime design-system footprint. | Full atoms/molecules/organisms/tokens. | REFERENCE_ONLY | Do not bulk-import historical DS; use as visual reference. |
| Domain types | Current typed Supabase `Database` plus feature DTOs. | Broad `types.ts`, `domain/*`, context types. | MERGE_SELECTIVELY | Prefer current DB-derived types; adapt old domain logic behind typed DTOs. |
| Services | Feature-local typed services. | Broad `dataService`, finance/accounting/doc services. | WRITE_ADAPTER | Create feature-specific adapters rather than restoring global dataService. |
| Tests | Runtime targeted tests pass. | Broader historical tests exist but assume old app. | MERGE_SELECTIVELY | Port tests only with adapted implementation and current router/test setup. |
| CI | Current repo CI/deployment not part of historical app. | Backup workflows and scripts. | KEEP_CURRENT | Preserve current CI. |
| Vercel | Current `artifacts/rentrix/vercel.json`. | Backup `vercel.json`. | KEEP_CURRENT | Preserve current Vercel config. |
| PWA | Current manifest/offline/Vite PWA build passes. | Old manifest/offline setup. | KEEP_CURRENT | Preserve current PWA config. |

## Architectural conclusion

The current runtime shell is canonical. Historical sources are valuable for feature behavior and UI content, but the old React Router, AppContext/useApp, hard-failing Supabase env helper, broad dataService, old package-manager assumptions, old CI, and old PWA setup should not be restored. The selective-port strategy should translate behavior into current TanStack Router routes, current auth, current Supabase client, current feature services, and current pnpm validation commands.

