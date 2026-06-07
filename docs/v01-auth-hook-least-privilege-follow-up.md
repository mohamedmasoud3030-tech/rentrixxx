# v0.1 Auth Hook Least-Privilege Follow-Up

**Status:** REVIEW REQUIRED — repository fix prepared, not applied to Supabase  
**Date:** 2026-06-07  
**Roadmap:** v0.1 Item 4 — Auth, RLS, and RPC least-privilege reconciliation  
**Target verified read-only:** `RENTRIX EGY (live)` / `nnggcnpcuomwfuupupwg`  
**Prohibited target:** `rentrix (V2)` / `ktmizdznbdwvalmmfvfc`

---

## Why this follow-up exists

The continuation handoff in `docs/v01-migration-reconciliation-status.md` listed three critical RPC migrations for later rollout. Before applying them, a fresh read-only Supabase verification was performed against the intended live project only.

Fresh Security Advisor evidence showed that:

```text
public.custom_access_token_hook(event jsonb)
```

is a `SECURITY DEFINER` function callable through the exposed RPC API by both:

```text
anon
authenticated
```

That is not an approved browser-facing contract. The hook must be callable by the Supabase Auth service role only.

---

## Fresh read-only evidence

The documented connector path returned:

```text
project: RENTRIX EGY (live)
ref:     nnggcnpcuomwfuupupwg
status:  ACTIVE_HEALTHY
```

The default Supabase branch still reports:

```text
MIGRATIONS_FAILED
```

The live migration list includes:

```text
20260607155339 - custom_access_token_hook
```

Table inventory and `branch-action` log reads were attempted through their documented read-only connector actions. Both were blocked by the connector safety layer. No undocumented access path was used.

---

## Repository fix prepared

This follow-up adds:

```text
supabase/migrations/20260607190000_lock_down_custom_access_token_hook_execute.sql
```

The migration:

1. fails closed if `public.custom_access_token_hook(jsonb)` is missing;
2. revokes function execution from `PUBLIC`;
3. revokes function execution from `anon`;
4. revokes function execution from `authenticated`;
5. fails closed if `supabase_auth_admin` is missing;
6. grants function execution only to `supabase_auth_admin`.

This matches the Supabase Custom Access Token Hook guidance for Postgres hooks: grant execution to `supabase_auth_admin` and revoke execution from browser-facing roles.

---

## Rollout boundary

Do **not** apply this migration directly to production from this PR.

The repository release policy remains preview-first for migrations, auth boundaries, RLS, and RPC changes. A Supabase Preview Branch requires a separate cost confirmation and explicit operator approval before creation.

---

## Required Preview Branch validation

Before any production rollout request:

- [ ] Create an approved Supabase Preview Branch after operator cost confirmation.
- [ ] Replay the canonical migration chain and capture the exact failed migration behind `MIGRATIONS_FAILED`.
- [ ] Apply `20260607190000_lock_down_custom_access_token_hook_execute.sql` on preview.
- [ ] Re-run Security Advisor and verify the hook is no longer callable by `anon` or `authenticated`.
- [ ] Verify `supabase_auth_admin` can invoke the hook.
- [ ] Register the Custom Access Token hook in the Supabase Dashboard using:

```text
pg-functions://postgres/public/custom_access_token_hook
```

- [ ] Use fresh ADMIN, MANAGER, and USER login tokens to verify `app_metadata.user_role`.
- [ ] Keep browser clients unable to invoke the hook directly.
- [ ] Inspect the remaining RPC migration chain before applying payment or renewal RPC replacements.
- [ ] Run the relevant CI and database validation gates.

---

## Remaining blockers

```text
Integration: Supabase
Operation: list_tables against intended live project
Category: permission / safety-layer blocker
Repeated call: no
Next action: approved catalog inspection path or Preview Branch validation
```

```text
Integration: Supabase
Operation: branch-action log read against intended live project
Category: permission / safety-layer blocker
Repeated call: no
Next action: approved branch-action log access or Preview Branch replay evidence
```

```text
Integration: Supabase
Operation: Preview Branch creation
Category: approval and cost confirmation required
Repeated call: no
Next action: operator explicitly approves the quoted branch cost before creation
```

---

## Next recommended item

Review this narrow PR. After review, obtain explicit Preview Branch cost approval and perform preview replay before requesting any production migration apply.
