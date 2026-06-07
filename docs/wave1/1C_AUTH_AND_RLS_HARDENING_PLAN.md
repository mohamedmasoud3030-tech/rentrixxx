# Wave 1C — Auth and RLS Hardening Plan

## Scope

Documentation-only hardening plan for authentication, authorization, JWT role issuance, route guards, table privileges, RPC execution grants, and Row Level Security.

No runtime code was changed. No Supabase migration was applied. No production data was mutated. No live Vercel or Supabase setting was changed.

## Environment boundary

The intended live Supabase project is operator-confirmed as:

- project name: `RENTRIX EGY (live)`
- project ref: `nnggcnpcuomwfuupupwg`

Do not use:

- project name: `rentrix (V2)`
- project ref: `ktmizdznbdwvalmmfvfc`

The current execution session exposes the GitHub connector only. Supabase and Vercel connector namespaces are not available in-session. Live auth configuration, hook registration, SQL catalog state, RLS policies, table grants, routine grants, logs, advisors, and backup posture remain blocked. This plan does not claim live verification.

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
| P0 | Project identity | Supabase project metadata confirms ref `nnggcnpcuomwfuupupwg`; operator verifies Vercel production env targets the same ref. |
| P0 | Auth methods | Enabled login methods, email/password posture, signup policy, password-reset behavior, and any provider configuration. |
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

## Planned Wave 2 implementation slices

After authenticated read-only evidence exists, split changes into narrow reviewed PRs:

1. **Hook registration verification and role-source lockdown** — ensure the live hook is enabled and profile roles cannot be self-escalated.
2. **Core-table RLS reconciliation** — align repository policies with actual live tables and operations.
3. **RPC least-privilege cleanup** — revoke browser execution from internal helpers and retain only approved facades.
4. **Financial immutability enforcement** — deny silent update/delete of posted payments and document reversal-and-replacement handling.
5. **Beta-account verification pack** — approved ADMIN, MANAGER, and USER smoke tests with fresh JWTs.
6. **Post-rollout observation** — inspect logs and advisors after the reviewed rollout window.

## Explicit non-goals

- No production migration application from Wave 1C.
- No production data cleanup.
- No Vercel or Supabase configuration mutation.
- No multi-tenancy reintroduction.
- No accounting-ledger expansion.
- No claim that frontend route guards replace RLS.

## Verification performed

Documentation-only source review. No live command was executed against Supabase or Vercel because those connector namespaces are unavailable in this session.
