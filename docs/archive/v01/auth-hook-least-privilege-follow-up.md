# v0.1 Auth Hook Least-Privilege Follow-Up

**Status:** PREVIEW BLOCKED — repository fix prepared, not applied to production  
**Date:** 2026-06-07  
**Roadmap:** v0.1 Item 4 — Auth, RLS, and RPC least-privilege reconciliation  
**Target verified read-only:** `RENTRIX EGY (live)` / `nnggcnpcuomwfuupupwg`  
**Prohibited target:** `rentrix (V2)` / `ktmizdznbdwvalmmfvfc`

---

## Why this follow-up exists

The continuation handoff in `docs/v01/migration-reconciliation-status.md` listed three critical RPC migrations for later rollout. Before applying them, a fresh read-only Supabase verification was performed against the intended live project only.

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

## Automatic Preview Branch status

Opening PR #814 triggered the configured Supabase GitHub integration and automatically created an isolated Preview Branch:

```text
Git branch:   fix/v01-auth-hook-least-privilege
Project ref:  atvunstmszfpzgkfzuvf
Parent ref:   nnggcnpcuomwfuupupwg
```

The latest Supabase bot update reported:

```text
Database:       ✅
Services:       ✅
APIs:           ✅
Configurations: ⚠️ Service health check failed
Migrations:     ⏸️ paused
Seeding:        ⏸️ paused
Edge Functions: ⏸️ paused
```

The new lockdown migration has therefore **not yet been validated on preview**. Do not treat repository presence or Preview Branch creation as proof that the migration applied successfully.

---

## Rollout boundary

Do **not** apply this migration directly to production from this PR.

The repository release policy remains preview-first for migrations, auth boundaries, RLS, and RPC changes. Production mutation still requires an explicitly reviewed rollout step after preview evidence exists.

---

## Required Preview Branch validation

Before any production rollout request:

- [x] Create an isolated Supabase Preview Branch through the configured GitHub integration.
- [ ] Inspect the Preview Branch workflow logs through an approved path.
- [ ] Resolve the `Service health check failed` configuration blocker.
- [ ] Resume Preview Branch migration execution.
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
Integration: Supabase GitHub integration
Operation: Preview Branch configuration stage for atvunstmszfpzgkfzuvf
Category: unresolved service-health verification failure
Repeated call: integration reruns automatically on branch commits
Next action: inspect approved Preview Branch workflow logs and isolate the configuration health failure
```

---

## Next recommended item

Keep PR #814 in draft state. Inspect the Preview Branch workflow logs for `atvunstmszfpzgkfzuvf`, resolve the configuration health blocker, then collect fresh Preview Branch migration and Security Advisor evidence before requesting any production rollout.
