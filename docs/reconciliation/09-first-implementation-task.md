# 09 - Recommended First Implementation Task

## Recommendation

Implement a read-only Audit Log pilot in the current architecture.

## Why this should be first

It is small, useful, reversible, and validates the selective-porting workflow without starting with financial writes. The historical page has clear behavior (filter/search audit rows) but also clearly demonstrates the required adaptation seam (`useApp`, legacy UI, and snapshot restore controls). A read-only port proves that old UI behavior can be translated into current TanStack Router, current auth/permissions, current Supabase diagnostics, and feature-local services without restoring deprecated architecture.

## Exact historical files to inspect

| File | Use |
| --- | --- |
| `.migration-backup/src/ui/AuditLog.tsx` | Primary behavior and UI reference. |
| `.migration-backup/src/services/audit/AuditTrail.ts` | Optional audit formatting/service behavior reference. |
| `.migration-backup/src/components/shared/ConfirmActionModal.tsx` | Reference only; do not enable restore actions in first task. |
| `.migration-backup/src/utils/helpers.ts` | Reference `formatDateTime` only if current formatters lack equivalent. |
| `artifacts/rentrix/legacy-src/services/audit/AuditTrail.test.ts` | Reference test intent if useful. |

## Exact current files to reuse

| File | Use |
| --- | --- |
| `artifacts/rentrix/src/integrations/supabase/client.ts` | Supabase client; preserve diagnostics behavior. |
| `artifacts/rentrix/src/app/auth.tsx` | Current auth/role source. |
| `artifacts/rentrix/src/routes/_protected.tsx` and route conventions | TanStack route placement. |
| `artifacts/rentrix/src/components/ui/card.tsx` | Current card primitive. |
| `artifacts/rentrix/src/components/ui/table.tsx` | Current table primitive. |
| `artifacts/rentrix/src/components/empty-state.tsx` | Empty state. |
| `artifacts/rentrix/src/components/ui/skeleton.tsx` | Loading state. |
| `artifacts/rentrix/src/lib/supabase-error.ts` | Error normalization. |

## Exact target paths

| Path | Purpose |
| --- | --- |
| `artifacts/rentrix/src/features/audit/audit-log-service.ts` | Read-only Supabase query and DTO mapper. |
| `artifacts/rentrix/src/features/audit/use-audit-log.ts` | Query hook and feature query key. |
| `artifacts/rentrix/src/features/audit/audit-log-page.tsx` | Current-style page. |
| `artifacts/rentrix/src/features/audit/audit-log-service.test.ts` | Mapping/error tests. |
| `artifacts/rentrix/src/features/audit/audit-log-page.test.tsx` | Loading/empty/filter/error state tests if test setup permits. |
| `artifacts/rentrix/src/routes/_protected.audit-log.tsx` | Protected TanStack route, admin gated. |

## Expected adaptations

1. Replace `useApp().db.auditLog` with a read-only Supabase service.
2. Replace React state over legacy arrays with query result filtering/search in the page or hook.
3. Replace legacy `Card`, `Modal`, and `ConfirmActionModal` with current UI primitives.
4. Omit `createSnapshot`, `restoreBackup`, and snapshot list controls entirely in the first PR.
5. Add an admin permission gate using current auth/permission helper.
6. Use current loading, empty, and recoverable error states.
7. Verify actual audit table name/columns before implementing; if no table exists, implement a safe unsupported/empty state instead of fabricating data.

## Tests to add

| Test | Purpose |
| --- | --- |
| Service mapper test | Validates row-to-DTO mapping and unknown/null handling. |
| Service error test | Ensures Supabase errors flow through current error handler. |
| Page empty state test | Confirms no audit rows shows safe empty state. |
| Page filter test | Confirms user/action/search filters are local and deterministic. |
| Permission test | Confirms non-admin users cannot access admin audit UI, if current test harness exposes auth state. |

## Validation commands

Run the same baseline commands after implementation:

1. `pnpm --filter ./artifacts/rentrix run typecheck`
2. `pnpm --filter ./artifacts/rentrix run lint`
3. `pnpm --filter ./artifacts/rentrix run typecheck:test`
4. `pnpm --filter ./artifacts/rentrix test`
5. `pnpm --filter ./artifacts/rentrix run build`

## Rollback instructions

Revert the single Audit Log PR. The rollback should remove only the new audit route, audit feature folder, and tests. Because the first task must not alter shared runtime shell behavior beyond a small permission helper, rollback should not affect existing demo features.

