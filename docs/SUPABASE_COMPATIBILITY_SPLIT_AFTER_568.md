# Supabase Compatibility Split (post-568)

## Context
Hosted Supabase preview replays can execute migration `20260519120000_p0_harden_rls_user_scoped.sql` before earlier compatibility helpers are present. In that replay order, the migration failed with:

- `relation "public.users" does not exist`

## Fix Applied
The migration `supabase/migrations/20260519120000_p0_harden_rls_user_scoped.sql` now contains an inline, idempotent precondition immediately after `begin;` that:

1. creates `public.users` when missing (`create table if not exists`), and
2. ensures required columns used by policy helpers are present (`role`, `status` via `add column if not exists`).

This removes reliance on any separate precondition migration during hosted replay.

## Notes
- This change is Supabase-only and does not touch frontend/UI code.
- Keep `20260520020000_profiles_role_compatibility.sql` in the migration sequence (if present in downstream branches/environments).
