# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Rentrix Property Management (`artifacts/rentrix`)
- **Type**: react-vite web app
- **Preview path**: `/`
- **Stack**: React 19, React Router DOM, Supabase (auth + data), TanStack Query, i18next (Arabic/English), Tailwind CSS v3, Recharts, jsPDF
- **Design**: Luxury theme — warm ivory + gold (#B8860B) light mode, deep navy + gold dark mode; Cairo Arabic font
- **Auth**: Supabase authentication (email/password)
- **Required secrets**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Optional secrets**: `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_GEMINI_API_KEY` (for AI assistant)
- **Entry point**: `artifacts/rentrix/src/index.tsx`

### API Server (`artifacts/api-server`)
- **Type**: Express API server
- **Preview path**: `/api`
- Scaffold only — app data goes through Supabase directly from the frontend
- **Required secrets**: `SUPABASE_JWT_SECRET` (Supabase project settings → API → JWT Settings → JWT Secret)
- JWT verification is active on all protected routes (`requireAuth` middleware in `src/middlewares/auth.ts`). Without `SUPABASE_JWT_SECRET` every protected route returns 401.
- Startup log confirms: `"SUPABASE_JWT_SECRET loaded — JWT verification is active"` when secret is present; WARN when missing.
- **Role enforcement**: `requireRole('ADMIN')` reads `app_metadata.user_role` from the JWT. Roles only travel in tokens after the Custom Access Token Hook is activated (see below).
- **Integration tests**: `pnpm --filter @workspace/api-server run test` — 7 tests covering `requireAuth` (missing/malformed/expired token) and `requireRole` (USER vs ADMIN) against the live server.

## Supabase Custom Access Token Hook

**Status**: Hook function deployed to production DB. **Manual activation required in Supabase dashboard.**

The hook function `public.custom_access_token_hook` is in the database (migration `20260503140000`). It reads `public.profiles.role` and injects it as `app_metadata.user_role` into every JWT before it is signed by GoTrue.

### Activate the hook (one-time manual step)

1. Go to **Supabase Dashboard → Authentication → Hooks**
2. Under **Custom Access Token Hook**, click **Enable**
3. Set URI to: `pg-functions://postgres/public/custom_access_token_hook`
4. Save

OR via management API (requires a Personal Access Token):
```
PATCH https://api.supabase.com/v1/projects/nnggcnpcuomwfuupupwg/config/auth
Authorization: Bearer <SUPABASE_PERSONAL_ACCESS_TOKEN>
Content-Type: application/json

{
  "hook_custom_access_token_enabled": true,
  "hook_custom_access_token_uri": "pg-functions://postgres/public/custom_access_token_hook"
}
```

Until the hook is activated, all tokens fall back to role `USER` (the API server default), so ADMIN-only routes remain accessible only to users whose profile has `role = 'ADMIN'` once a new login session starts after activation.

## Migration Notes
- Ported from Vercel/v0 import (original was a Vite + React app, not Next.js)
- `virtual:pwa-register` (vite-plugin-pwa) removed — PWA plugin dropped for Replit compatibility
- Tailwind CSS v3 with PostCSS (not @tailwindcss/vite)
- All source files live under `artifacts/rentrix/src/` (copied from `.migration-backup/src/`)

## TypeScript import/filename casing conventions
- `forceConsistentCasingInFileNames` is enforced via `tsconfig.base.json` for all extending TS projects.
- Under `artifacts/rentrix/src/components/ui/` and `artifacts/rentrix/src/ui/`, filenames must be lowercase for primitive/shared UI modules (e.g., `card.tsx`, `button.tsx`, `app-card.tsx`).
- Use canonical import casing that exactly matches on-disk paths.
- Run `pnpm run lint:import-paths` locally (or `pnpm run ci:case-check` in CI) to catch case-only conflicts and mismatched import path casing before deploy.
