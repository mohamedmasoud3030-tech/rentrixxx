# Rentrix old-but-gold — P1-C UI Components Foundation

## Status

**Phase:** P1-C  
**Status:** deferred after quality-gate failure  
**Reason:** direct shadcn/Radix-style primitive ports caused SonarCloud quality-gate failures, especially duplication on new code.  
**Visual rule:** Figma Paperpillar remains the target visual direction, but UI primitives must now be reintroduced only through small focused PRs with CI/Sonar checks.

## What happened

A first primitive batch was attempted from:

```txt
artifacts/rentrix/legacy-src/components/ui
```

into:

```txt
artifacts/rentrix/src/components/ui
```

The batch included primitives such as tabs, tooltip, separator, scroll-area, popover, accordion, sheet, and dropdown-menu. The approach was functionally valid but too similar to existing shadcn/Radix code patterns and triggered SonarCloud gate failures:

- high duplication on new code
- security hotspots
- reliability/security rating degradation

## Immediate rollback/defer action

The direct primitive batch is no longer considered complete.

### Removed from `src/components/ui`

- `tabs.tsx`
- `tooltip.tsx`
- `separator.tsx`
- `scroll-area.tsx`

### Deferred as temporary placeholders until a focused PR re-port

- `popover.tsx`
- `accordion.tsx`
- `sheet.tsx`
- `dropdown-menu.tsx`

These placeholders must not be used by production pages. Re-port or delete them in the next focused cleanup PR after typecheck/build/Sonar verification.

## Current production primitives that remain valid

These existed before the attempted P1-C batch and were not overwritten:

- `button.tsx`
- `card.tsx`
- `input.tsx`
- `textarea.tsx`
- `table.tsx`
- `dialog.tsx`
- `select.tsx`
- `skeleton.tsx`
- `status-badge.tsx`

## New rule for UI component recovery

Do **not** bulk-copy shadcn/Radix primitives from legacy.

Future UI recovery must follow this sequence:

1. Pick one component or one tiny related pair only.
2. Confirm it is needed by a real page/feature.
3. Prefer generating a minimal local wrapper over copying the full legacy file.
4. Avoid matching shadcn boilerplate line-for-line when it causes Sonar duplication.
5. Keep Figma visual direction in `FIGMA_VISUAL_DIRECTION.md` as the styling target.
6. Run:

```bash
pnpm --filter @workspace/rentrix typecheck
pnpm --filter @workspace/rentrix build
```

7. Wait for SonarCloud before adding the next component.

## Deferred components

### Safe only as focused future PRs

- `tabs.tsx`
- `tooltip.tsx`
- `separator.tsx`
- `scroll-area.tsx`
- `popover.tsx`
- `accordion.tsx`
- `sheet.tsx`
- `dropdown-menu.tsx`
- `checkbox.tsx`
- `radio-group.tsx`
- `switch.tsx`
- `progress.tsx`
- `avatar.tsx`
- `pagination.tsx`
- `breadcrumb.tsx`
- `alert.tsx`
- `form.tsx`

### Requires extra review

- `calendar.tsx` — date picker behavior and RTL need focused testing.
- `command.tsx` — search/combobox behavior needs focused testing.
- `chart.tsx` — check Recharts integration and current dashboard/reporting needs first.
- `drawer.tsx` — current app shell already has a custom mobile drawer; avoid conflicts.
- `sidebar.tsx` — current app shell already has a production sidebar; do not replace blindly.
- `toaster.tsx`, `toast.tsx`, `sonner.tsx` — current app already uses `sonner`; avoid duplicate toast systems.
- `modal.tsx` — current app already has `dialog.tsx`; avoid duplicate modal abstraction.
- `page-primitives.tsx`, `page-states.tsx`, `empty.tsx`, `app-card.tsx` — useful later for page redesign, but should be aligned with Figma direction first.

## Separate blocker: Supabase Preview

The Supabase failure is separate from P1-C UI work:

```txt
Remote migration versions not found in local migrations directory.
```

Handle this through a dedicated migration-history PR or by finishing the existing Supabase compatibility PR. Do not mix Supabase migration fixes with UI component ports.

## Next required step

Before continuing UI work:

1. Ensure the current main branch is green again after the rollback/defer commits.
2. Fix Supabase migration-history separately.
3. Fix any remaining Sonar issues separately.
4. Resume UI components only as one-component PRs.
