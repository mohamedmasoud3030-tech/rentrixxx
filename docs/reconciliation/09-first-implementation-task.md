# 09 - Recommended First Implementation Task

## Recommendation

Implement a read-only Audit Log pilot in the current architecture.

## Reference note

Use `archive/recovery-reference/audit-log-recovery-notes.md` as the only reference note for this task.

Build the feature with the current TanStack Router, Supabase client, auth boundary, permission helpers, UI primitives, and error handling.

## Current files to reuse

- `artifacts/rentrix/src/integrations/supabase/client.ts`
- `artifacts/rentrix/src/app/auth.tsx`
- `artifacts/rentrix/src/routes/_protected.tsx`
- `artifacts/rentrix/src/components/ui/card.tsx`
- `artifacts/rentrix/src/components/ui/table.tsx`
- `artifacts/rentrix/src/components/empty-state.tsx`
- `artifacts/rentrix/src/components/ui/skeleton.tsx`
- `artifacts/rentrix/src/lib/supabase-error.ts`

## Target paths

- `artifacts/rentrix/src/features/audit/audit-log-service.ts`
- `artifacts/rentrix/src/features/audit/use-audit-log.ts`
- `artifacts/rentrix/src/features/audit/audit-log-page.tsx`
- `artifacts/rentrix/src/features/audit/audit-log-service.test.ts`
- `artifacts/rentrix/src/features/audit/audit-log-page.test.tsx`
- `artifacts/rentrix/src/routes/_protected.audit-log.tsx`

## Required behavior

1. Read rows through a read-only Supabase service.
2. Support local search and user/action filtering.
3. Use current UI primitives.
4. Keep the pilot read-only.
5. Add an admin permission gate.
6. Use current loading, empty, and recoverable error states.
7. Verify the actual read model before implementation. Use a safe unsupported or empty state when no safe read model exists.

## Validation commands

1. `pnpm --filter ./artifacts/rentrix run typecheck`
2. `pnpm --filter ./artifacts/rentrix run lint`
3. `pnpm --filter ./artifacts/rentrix run typecheck:test`
4. `pnpm --filter ./artifacts/rentrix test`
5. `pnpm --filter ./artifacts/rentrix run build`
