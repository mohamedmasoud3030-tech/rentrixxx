# Secure Operator Runbook

Purpose: record the minimum safe environment ownership evidence needed for the
Rentrix constrained beta without committing secrets, access tokens, database
passwords, connection strings, anon keys, service-role keys, or customer data.

Scope: read-only identification and handoff for the intended Vercel and Supabase
targets. This runbook is not approval to mutate production, replay migrations,
change RLS, edit auth hooks, rotate secrets, or expose deferred routes.

Last repository-side update: 2026-06-07.

## Safety rules

- Store full secrets only in the owning platform secret store or approved
  password manager; never in Git, issue comments, pull requests, logs, or chat.
- Record identifiers in redacted form unless the identifier is already intended
  to be public operational metadata.
- Treat any Supabase ref discovered from local `.temp` files as a candidate only;
  it is not proof of ownership, target intent, or mutation approval.
- Use read-only platform access for identification work. Production mutation
  requires explicit human approval and a narrow reviewed PR or runbook entry.
- Stop after the first authentication or permission blocker and report the exact
  missing access rather than trying undocumented connector paths.

## Ownership registry

| Surface | Current recorded owner | Required evidence | Current status |
| --- | --- | --- | --- |
| Vercel project | BLOCKED - not verified in repository evidence | Project name, project ID, team/account owner, production URL, preview URL pattern, active production commit SHA, and redacted env target summary | No `.vercel/project.json` was present in the checkout during the 2026-06-06 audit. No authenticated Vercel CLI identity was available. |
| Supabase project | BLOCKED - not verified in repository evidence | Project ref, project name, organization owner, region, database access path, auth configuration owner, and backup owner | Candidate ref `nnggcnpcuomwfuupupwg` was recovered from local Supabase pooler metadata in the 2026-06-06 audit, but remains unconfirmed. |
| Runtime Supabase env vars | PARTIAL - shell name evidence only | Presence of `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the intended deployment, values verified out-of-band and not printed | On 2026-06-07, the current shell exposed these variable names only. Values were not printed and do not prove platform ownership. |
| Beta operator identity | BLOCKED - not verified in repository evidence | Approved ADMIN test account, allowed login method, and role claim source verified against live auth | Repository expects `ADMIN`, `MANAGER`, and `USER` roles from `app_metadata.user_role`; live account claims remain unverified. |

## Supabase target classification

| Classification | Project ref | Allowed use | Prohibited use | Evidence |
| --- | --- | --- | --- | --- |
| Intended constrained-beta production | UNKNOWN | None until a human owner confirms the exact ref and read-only access verifies live state | Any migration replay, RLS/auth/RPC change, data repair, or beta launch decision | Live project access was blocked in the 2026-06-06 constrained-beta audit. |
| Candidate from local metadata | `nnggcnpcuomwfuupupwg` | Read-only confirmation only after approved Supabase access is available | Treating it as canonical, mutating it, or using it as launch proof | Recovered from `supabase/.temp/pooler-url`; full connection string was not recorded. |
| Preview or staging | UNKNOWN | Migration replay proof only after preview ownership and target isolation are verified | Repairing production by implication or using preview success as proof of production drift resolution | Preview access is blocked until the live failed migration state is identified. |
| Any other Supabase ref | UNAPPROVED | None | Any use for constrained-beta verification or mutation | No alternate refs are approved in current repository evidence. |

## Vercel identity evidence

Record these fields from authenticated Vercel access before constrained-beta
release checks proceed. Redact IDs where the team policy requires it, but keep
enough stable characters for operators to distinguish environments.

| Field | Status | Notes |
| --- | --- | --- |
| Authenticated Vercel user/team | BLOCKED | No authenticated CLI session was available during the 2026-06-06 audit. |
| Project name and project ID | BLOCKED | No `.vercel/project.json` exists in the checkout. |
| Production deployment URL | BLOCKED | Requires authenticated Vercel project/deployment access. |
| Active production commit SHA | BLOCKED | Repository HEAD is not proof of the deployed production SHA. |
| Preview deployment URL pattern | BLOCKED | Required before browser/manual operational QA. |
| Deployment env target summary | BLOCKED | Record only variable names and redacted target classification, not values. |

## Read-only verification sequence

1. Confirm the Vercel account/team and project through authenticated read-only
   access.
2. Record the active production commit SHA and preview URL pattern without
   printing secret environment values.
3. Confirm the intended Supabase project ref through authenticated management or
   database read-only access.
4. Run the repository-side migration evidence preflight:

   ```bash
   pnpm supabase:migration-evidence
   ```

   This captures the local canonical migration chain, redacts secret values, and
   reports the exact authenticated Supabase access blocker when live read-only
   migration-state evidence is unavailable.
5. Query migration history, schema/catalog, RPC definitions/grants, auth hook
   registration, RLS policies, logs, advisors, and backup posture read-only.
6. If `MIGRATIONS_FAILED` is confirmed, write a safe replay plan against a
   preview branch before any production migration repair.
7. Keep deferred routes hidden from constrained-beta navigation until live schema
   and authorization support is verified.

## Connector blocker report template

Use this format when a platform operation cannot proceed:

```text
Integration: <Vercel | Supabase | GitHub | other>
Operation: <read-only operation attempted>
Category: <authentication | permission | temporary transport | unsupported | invalid input>
Repeated call: <no | once using the same documented action>
Next action: <specific access, approval, or identifier required>
```

## Current next blocker

As of 2026-06-07, the next v0.1 roadmap item is partially unblocked:

**Cleared:**
- ✅ Live Supabase project confirmed `ACTIVE_HEALTHY`
- ✅ Migration list retrieved successfully
- ✅ Database schema and RLS verified
- ✅ Auth and RPC catalogs inspected
- ✅ Security advisor findings documented
- ✅ `custom_access_token_hook` applied via connector

**Still blocked:**
- ⏸️ Manual Supabase Dashboard registration of custom auth hook (required for JWT role injection)
- ⏸️ Remaining RPC migrations to apply (3 critical ones needed)
- ⏸️ Vercel deployment verification (connector read-only access blocked)

**For next continuation:** Read `docs/ai/CURRENT_EXECUTION_CONTEXT.md` first. Historical migration reconciliation evidence is archived at `docs/archive/v01/migration-reconciliation-status.md` and contains:
- Complete drift inventory
- RPC inventory (what exists vs what's missing)
- Exact next steps (4 ordered actions)
- Test verification checklist
