# Supabase Compatibility Split Plan After PR #568

## Why PR #568 must not be merged as-is

PR #568 combines multiple independent compatibility concerns into one high-risk migration. The combined migration includes patterns that are likely to fail Sonar/Supabase quality gates (security posture and migration-risk concerns), including `SECURITY DEFINER`, dynamic SQL execution patterns, broad grants, and destructive shape changes. Based on current stabilization policy, it should remain blocked and be replaced by safe forward-only split migrations.

## Split map of PR #568 concerns

The original #568 concern set is split into independent slices:

1. `public.profiles.role` compatibility
2. `public.serials` table-shape compatibility
3. `increment_serial(serial_column text)` compatibility
4. `void_receipt_atomic(...)` compatibility
5. `post_receipt_atomic(jsonb)` assertion compatibility

## This PR scope (first safe slice only)

This PR implements only **`public.profiles.role` compatibility** via a new forward-only migration:

- checks whether `public.profiles` exists; no-op if missing
- adds `role text not null default 'USER'` only when column is missing
- normalizes null role values to `'USER'`
- adds `profiles_role_check` only when missing (`role IN ('ADMIN', 'USER')`)
- validates the constraint when present and not yet validated

Out-of-scope in this PR:

- `serials` table changes
- `increment_serial` function changes
- `void_receipt_atomic` changes
- `post_receipt_atomic` assertion changes

## Deferred remaining slices and risk levels

1. **serials table-shape compatibility** — **Medium-High risk** (schema/data-shape compatibility and migration ordering risk)
2. **increment_serial compatibility** — **High risk** (function semantics and possible dynamic SQL pressure)
3. **void_receipt_atomic compatibility** — **High risk** (transactional financial behavior and permission model sensitivity)
4. **post_receipt_atomic assertion** — **Medium-High risk** (runtime assertion contract and RPC caller compatibility)

## Validation commands run

- `pnpm --filter @workspace/rentrix typecheck`
- `pnpm --filter @workspace/rentrix build`
- `supabase migration list` (if CLI available)
- `supabase db lint` (if CLI available)

## Current recommendation for PR #568

Keep PR #568 **blocked**, or close it as **superseded** once replacement compatibility slices are merged.
