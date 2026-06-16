# Wave 1C — Auth and RLS Hardening Plan

> Historical snapshot — verify against `docs/ai/CURRENT_EXECUTION_CONTEXT.md` before acting.

## Scope

Documentation-only hardening plan for authentication, authorization, JWT role issuance, route guards, table privileges, RPC execution grants, and Row Level Security.

No runtime code was changed. No Supabase migration was applied. No production data was mutated. No live Vercel or Supabase setting was changed.

## Environment boundary

The Supabase connector was discovered and used read-only against the intended live project only:

- project name: `RENTRIX EGY (live)`
- project ref: `nnggcnpcuomwfuupupwg`
- region: `ap-southeast-1`
- project status: `ACTIVE_HEALTHY`

Do not use:

- project name: `rentrix (V2)`
- project ref: `ktmizdznbdwvalmmfvfc`

The default Supabase `main` branch was returned with `preview_project_status = ACTIVE_HEALTHY` and branch status `MIGRATIONS_FAILED`. This is a release risk. It does not prove that the current runtime is broken, but it prevents a clean rollout claim until the exact failed migration state is identified and replayed safely outside production.

The Vercel connector listed:

- team: `m7mdms3d`
- project name: `rentrix`
- project ID: `prj_O97BqIkagZFLqyUvuoeUbgOQYu6F`

Vercel project-detail and deployment-list reads were blocked by the connector safety layer. Production deployment SHA and redacted environment targeting remain unverified.

## Live Security Advisor warnings

The read-only Supabase Security Advisor returned these warnings:

- `public.sync_payment_reference_fields` has a mutable function search path.
- `public.increment_serial(serial_column text)` is a signed-in callable `SECURITY DEFINER` function.
- `public.is_admin_or_manager()` is a signed-in callable `SECURITY DEFINER` function.
- `public.is_app_user()` is a signed-in callable `SECURITY DEFINER` function.
- Auth leaked-password protection is disabled.

The callable helper findings require least-privilege review. They are not proof that a helper is exploitable, and Wave 1C does not mutate grants or live settings.

## Live Performance Advisor observations

The read-only Supabase Performance Advisor returned observations including:

- unindexed FKs `contracts_property_id_app_fkey` and `contracts_renewed_from_id_app_fkey`;
- historical unused-index signals including `idx_properties_organization_id` and `idx_units_organization_id`.

Do not drop indexes based only on advisor output. Index removal requires workload evidence and a separate reviewed PR.

## Remaining blocked reads

The documented connector actions for Supabase migration list, table inventory, SQL catalog, auth logs, and Postgres logs were blocked by the connector safety layer. No undocumented alternate write or access path was used.

## Repository evidence reviewed

- `artifacts/rentrix/src/features/auth/permissions.ts`
- `artifacts/rentrix/src/features/auth/permissions.test.ts`
- `artifacts/rentrix/src/features/auth/route-guards.ts`
- `artifacts/rentrix/src/hooks/use-auth.tsx`
- `artifacts/rentrix/src/services/auth-service.ts`
- `artifacts/rentrix/src/routeTree.ts`
- `supabase/migrations/20260503140000_custom_access_token_hook.sql`
- `supabase/migrations/20260516110000_harden_post_receipt_authorization.sql`
- `supabase/migrations/20260604020300_add_record_invoice_payment_atomic_facade.sql`
- `docs/CONSTRAINED_BETA_LAUNCH_AUDIT_2026_06_06.md`
- `docs/stabilization/14-backend-read-only-verification.md`

## Current frontend authorization contract

The active frontend recognizes exactly three roles:

```text
ADMIN
MANAGER
USER
```

The role is read from:

```text
session.user.app_metadata.user_role
```

`permissions.ts` normalizes known roles and fails closed for unknown roles, missing users, missing IDs, and missing authorization context. Route visibility and route access are denied when the required permission is absent.

`route-guards.ts` redirects unauthorized sessions to `/`. `routeTree.ts` separately redirects unauthenticated sessions to `/login`.

The current tests explicitly verify:

- authorized known roles are granted only mapped permissions;
- unauthorized known roles are denied;
- unknown roles are denied;
- malformed or missing metadata fails closed;
- the authorization helper does not query Supabase or mutate data directly;
- the active helper does not restore legacy `AppContext`, `useApp`, or `react-router-dom` patterns.

## Current JWT role issuance expectation

The repository migration `20260503140000_custom_access_token_hook.sql` defines:

```text
public.custom_access_token_hook(event jsonb)
```

Expected behavior:

1. read `public.profiles.role` for the authenticating user;
2. fall back to `USER` when no profile row exists;
3. inject `app_metadata.user_role` into the JWT claims;
4. pin `search_path`;
5. grant execution only to `supabase_auth_admin`;
6. revoke execution from `PUBLIC`.

The migration itself states that dashboard or management-API registration is required after applying the SQL function. Repository presence of the function is not proof that the hook is enabled in the intended live project.

## Threat model for constrained beta

The constrained beta must be safe against:

- anonymous reads or writes to operational tables;
- authenticated direct table writes that bypass guarded RPCs;
- browser execution of internal helper functions;
- stale JWTs that omit or contain invalid role claims;
- privilege escalation through editable profile role fields;
- route visibility being mistaken for backend authorization;
- RLS policy drift between repository migrations and live schema;
- `SECURITY DEFINER` functions with unpinned `search_path`;
- accidental rollout against the prohibited Supabase project.

## Hardening principles

1. **Backend authorization is authoritative.** Frontend route guards are user-experience controls, not security boundaries.
2. **Fail closed.** Missing or unknown roles must not inherit elevated access.
3. **Least privilege.** Browser clients may execute only approved browser-facing RPC facades.
4. **Immutable posted history.** Posted financial rows must not be silently editable or deletable.
5. **Explicit environment targeting.** Every rollout checklist must state the intended and prohibited Supabase refs.
6. **Preview first.** Validate SQL and policy behavior on a Supabase Preview Branch before any live rollout request.

## Required authenticated read-only inspection before Wave 2

Run these checks only against `RENTRIX EGY (live)` / `nnggcnpcuomwfuupupwg` with read-only access:

| Priority | Area | Required evidence |
| --- | --- | --- |
| P0 | Failed migration state | Identify the exact failed branch migration, capture replay evidence, and prove a safe Preview Branch replay. |
| P0 | Project identity | Supabase project metadata confirms ref `nnggcnpcuomwfuupupwg`; operator verifies Vercel production env targets the same ref. |
| P0 | Auth methods | Enabled login methods, email/password posture, signup policy, password-reset behavior, leaked-password protection, and any provider configuration. |
| P0 | Access-token hook | Hook enabled state, exact hook URI, function owner, grants, `SECURITY DEFINER`, fixed `search_path`, and invocation behavior. |
| P0 | Role source | `public.profiles.role` column type, allowed values, nullability, defaults, write policies, and whether ordinary users can modify their own role. |
| P0 | JWT issuance | Fresh login tokens for approved beta-safe ADMIN, MANAGER, and USER test accounts contain the expected `app_metadata.user_role`; unknown or missing roles fail closed. |
| P0 | Core RLS inventory | `relrowsecurity`, `relforcerowsecurity`, grants, and policies for properties, units, people, contracts, invoices, payments, receipts or receipt allocations, expenses, profiles, and idempotency storage. |
| P0 | Anonymous denial | Anonymous select/insert/update/delete and RPC execution attempts are denied across beta-facing surfaces. |
| P0 | Authenticated mutation paths | Direct browser writes that should go through guarded RPCs are denied; approved reads remain available. |
| P0 | RPC grants | Catalog of routine owners, signatures, grants, `SECURITY DEFINER`, fixed `search_path`, and dependency chains for browser-facing and internal functions. |
| P1 | Logs and advisors | Auth, API, Postgres, RLS, and RPC error patterns; security advisor findings; performance advisor findings; backup posture. |

## Preview Branch validation matrix

Before any live rollout, prove at minimum:

| Actor | Expected result |
| --- | --- |
| Anonymous client | Cannot read or mutate beta-facing operational tables; cannot execute guarded RPCs. |
| USER | Can access only explicitly approved basic surfaces; cannot open privileged routes; cannot mutate roles; cannot execute internal helpers. |
| MANAGER | Can access only mapped manager surfaces; cannot read ADMIN-only audit data unless explicitly granted; cannot mutate roles. |
| ADMIN | Can access approved privileged surfaces; still cannot bypass posted-payment immutability rules. |
| Auth hook caller | `supabase_auth_admin` can execute the custom hook; browser roles cannot execute it. |
| Payment browser client | Can execute the approved payment facade only; direct payment mutation and internal-helper execution are denied. |

## Required Wave 2 order

After authenticated read-only evidence exists, split changes into narrow reviewed PRs in this order:

1. **Migration replay reconciliation** — identify the exact failed branch migration and prove Preview Branch replay.
2. **Mutable search-path hardening** — pin `search_path` for `sync_payment_reference_fields` and review adjacent helpers.
3. **RPC least-privilege cleanup** — remove signed-in execution from internal `SECURITY DEFINER` helpers unless an explicit API contract proves it is required.
4. **Hook registration verification and role-source lockdown** — verify the access-token hook and ensure `public.profiles.role` cannot be self-escalated.
5. **Core-table RLS reconciliation** — align repository policies and grants with actual live tables and operations.
6. **Financial immutability enforcement** — deny silent update/delete of posted payments and document reversal-and-replacement handling.
7. **Leaked-password protection** — enable the auth setting through an explicitly reviewed live-settings change.
8. **Beta-account verification and observation** — run ADMIN, MANAGER, and USER smoke tests with fresh JWTs, then inspect logs and advisors after rollout.

## Explicit non-goals

- No production migration application from Wave 1C.
- No production data cleanup.
- No Vercel or Supabase configuration mutation.
- No multi-tenancy reintroduction.
- No accounting-ledger expansion.
- No claim that frontend route guards replace RLS.

## Verification performed

- Repository source review.
- Supabase project-list read.
- Supabase branch-inventory read.
- Supabase security-advisor read.
- Supabase performance-advisor read.
- Vercel team and project-list reads.

Blocked reads were recorded exactly and were not retried through undocumented alternatives.
