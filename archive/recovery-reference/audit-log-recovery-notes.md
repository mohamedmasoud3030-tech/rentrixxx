# Audit Log Recovery Notes

These notes preserve only the useful behavior and test intent needed to rebuild a
read-only Audit Log pilot in the current Rentrix architecture. They are reference-only
and must not be imported into runtime modules.

## Read-only page behavior to preserve

- Show an Arabic Audit Log page for monitoring system operations.
- Render rows in a table with: timestamp, username or actor, action, entity or table,
  entity identifier, and note or structured details.
- Search locally by entity identifier and note/details text.
- Filter locally by user and action, with an explicit reset-filters control.
- Derive available user and action filter values from returned rows.
- Show a clear empty state when no rows match the current filters.
- Use current loading, empty, and recoverable error states from the active application.
- Keep the first pilot bounded and read-only. A sensible initial row limit is 200 until
  current pagination requirements are verified.

## Presentation intent

- Format timestamps using the current application formatter rather than restoring a
  legacy helper.
- Action categories may receive distinct visual treatment, but the implementation must
  use the current design system and accessibility conventions.
- Do not copy legacy UI primitives. Rebuild with the active components under
  `artifacts/rentrix/src/components/`.

## Test intentions worth preserving

- Verify row-to-DTO mapping and null or unknown values.
- Verify search, user filtering, action filtering, and reset behavior.
- Verify loading, empty, and recoverable error states.
- Verify permission gating so non-admin users cannot access the admin Audit Log UI.
- Verify any actor identifier handling against the live schema; non-UUID actors such as
  `system` may need to remain in structured details while `user_id` stays nullable.
- Verify large, circular, or unexpected before/after payloads cannot crash audit handling
  if structured details are exposed later.

## Explicitly prohibited restoration

Do not restore or expose any snapshot creation, snapshot listing, backup restore, or
system rollback controls from the removed legacy page. The first Audit Log pilot is
read-only only.

Do not restore `useApp`, `AppContext`, `dataService`, local database flows, legacy
router patterns, legacy modal primitives, or executable source from removed recovery
trees.

## Current implementation mapping

Rebuild the feature against the active architecture:

- Supabase client: `artifacts/rentrix/src/integrations/supabase/client.ts`
- Current auth and permission boundaries: `artifacts/rentrix/src/app/auth.tsx` and active
  protected-route conventions
- Feature-local target: `artifacts/rentrix/src/features/audit/`
- Route target: `artifacts/rentrix/src/routes/_protected.audit-log.tsx`
- Current UI primitives: `artifacts/rentrix/src/components/`
- Error normalization: `artifacts/rentrix/src/lib/supabase-error.ts`

Before implementation, verify the actual live audit table or view name, columns, RLS,
RPCs, actor representation, and supported ordering. If no safe read model exists,
implement an unsupported or empty state rather than fabricating data.
