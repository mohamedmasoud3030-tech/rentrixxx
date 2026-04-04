# Vercel Multi-Project Setup (Same Repo)

This repository is deployed to multiple Vercel projects from the same GitHub repository.  
That is safe **if each project has a complete and correct environment configuration**.

## Why login can fail in only one project

The frontend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build/runtime to initialize Supabase.

- If either variable is missing/placeholder, the app still renders the login page.
- Supabase client initialization is disabled and authentication cannot succeed.
- The login flow now returns a configuration-specific error message when this happens.

## Required environment variables (all Vercel projects)

At minimum, define these in **each** Vercel project:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional but recommended:

- `VITE_LOG_LEVEL`
- `VITE_RELEASE_VERSION`
- `VITE_ERROR_TRACKER_DSN`

## Recommended production pattern for 3 projects

For `rentrix`, `rentrix-egy`, and `rentrixxx`:

1. Keep one shared codebase (current structure is fine).
2. In each Vercel project, set the **same build command/output**:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Ensure each project has environment variables in all required environments:
   - Production
   - Preview
   - Development (if using Vercel dev)
4. If they are intended to hit different backends, use intentionally different Supabase values and document that mapping.
5. After every env update, trigger a redeploy to invalidate old build artifacts.

## Drift-prevention checklist

Before promoting changes:

1. Run `npm run readiness:strict` locally with intended env values.
2. Compare env values across all 3 Vercel projects.
3. Confirm deployment points to expected branch/commit.
4. Validate login on all three domains with the same test account policy.

## Consolidate to one production project

Use the audit script to compare `rentrix`, `rentrix-egy`, and `rentrixxx` from Vercel API:

```bash
npm run vercel:consolidation:audit -- --token <VERCEL_TOKEN> --team <TEAM_ID>
```

What the script compares:
- Latest deployment and latest production deployment
- Deployment state (`READY` / `ERROR`)
- Recent deployment stability (ready vs failed counts)
- Required env coverage (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

Then:
1. Keep the project with the highest score as the **only production project**.
2. Point your production domain(s) only to that project.
3. Move all other projects to preview/staging use only, or delete them.
4. Freeze production env values in one source-of-truth document.
5. Require a post-deploy smoke test (login + dashboard + agent entry points).

## Notes

- Multiple Vercel projects connected to one repo do **not** interfere by default.
- Problems usually come from per-project env/config drift, not from shared repository linkage.
