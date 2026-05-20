# Rentrix old-but-gold — P1-C UI Components Foundation

## Status

**Phase:** P1-C  
**Status:** first safe primitive batch ported  
**Visual rule:** components are ported from `legacy-src` as feature/code slices, then lightly adjusted toward the Figma visual direction from `FIGMA_VISUAL_DIRECTION.md`.

## Source and target

| Source | Target | Rule |
|---|---|---|
| `artifacts/rentrix/legacy-src/components/ui` | `artifacts/rentrix/src/components/ui` | Port only missing primitives; do not duplicate existing primitives. |
| Figma Paperpillar UI Kit | Rentrix visual direction | Figma is the final visual target. Legacy is not the visual target. |

## Current production primitives already existed before this batch

- `button.tsx`
- `card.tsx`
- `input.tsx`
- `textarea.tsx`
- `table.tsx`
- `dialog.tsx`
- `select.tsx`
- `skeleton.tsx`
- `status-badge.tsx`

These were not overwritten.

## Ported in this batch

| Component | Source | Target | Notes |
|---|---|---|---|
| Tabs | `legacy-src/components/ui/tabs.tsx` | `src/components/ui/tabs.tsx` | Ported with larger rounded Figma-aligned trigger/list styling. |
| Tooltip | `legacy-src/components/ui/tooltip.tsx` | `src/components/ui/tooltip.tsx` | Ported with rounded tooltip surface and stronger text weight. |
| Separator | `legacy-src/components/ui/separator.tsx` | `src/components/ui/separator.tsx` | Ported as neutral primitive. |
| Scroll Area | `legacy-src/components/ui/scroll-area.tsx` | `src/components/ui/scroll-area.tsx` | Ported as neutral primitive. |
| Popover | `legacy-src/components/ui/popover.tsx` | `src/components/ui/popover.tsx` | Ported with rounded card-like popover surface. |
| Accordion | `legacy-src/components/ui/accordion.tsx` | `src/components/ui/accordion.tsx` | Ported with RTL-friendly text alignment and stronger trigger hierarchy. |
| Sheet | `legacy-src/components/ui/sheet.tsx` | `src/components/ui/sheet.tsx` | Ported with softened overlay, rounded control affordances, and overflow support. |
| Dropdown Menu | `legacy-src/components/ui/dropdown-menu.tsx` | `src/components/ui/dropdown-menu.tsx` | Ported with rounded menu items and logical RTL spacing. |

## Deferred components

These are still available in `legacy-src` and should be considered in later safe batches:

### Good next candidates

- `calendar.tsx`
- `command.tsx`
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

- `chart.tsx` — check Recharts integration and current dashboard/reporting needs first.
- `drawer.tsx` — current app shell already has a custom mobile drawer; avoid conflicts.
- `sidebar.tsx` — current app shell already has a production sidebar; do not replace blindly.
- `toaster.tsx`, `toast.tsx`, `sonner.tsx` — current app already uses `sonner`; avoid duplicate toast systems.
- `modal.tsx` — current app already has `dialog.tsx`; avoid duplicate modal abstraction.
- `page-primitives.tsx`, `page-states.tsx`, `empty.tsx`, `app-card.tsx` — useful later for page redesign, but should be aligned with Figma direction first.

## Safety rules applied

- No imports from `legacy-src` at runtime.
- No existing production primitives were overwritten.
- No routes/pages were redesigned in this batch.
- No Supabase/auth/RLS/schema/financial logic was touched.
- RTL-friendly logical spacing was used where practical (`ps`, `pe`, `ms`).

## Validation note

This batch was added through repository file operations. A local `typecheck`/`build` was not available from this tool context. The next Codex/CI step must run:

```bash
pnpm --filter @workspace/rentrix typecheck
pnpm --filter @workspace/rentrix build
```

If any Tailwind animation utility or Radix dependency issue appears, fix only the affected primitive without changing application behavior.

## Next step

Run CI/typecheck/build for this batch. If clean, continue with a second primitive batch:

1. `checkbox.tsx`
2. `radio-group.tsx`
3. `switch.tsx`
4. `progress.tsx`
5. `avatar.tsx`
6. `pagination.tsx`
7. `breadcrumb.tsx`
8. `alert.tsx`

Keep `calendar.tsx` and `command.tsx` for a separate focused batch because they are more likely to affect forms/date-pickers/search flows.
