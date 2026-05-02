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

## Migration Notes
- Ported from Vercel/v0 import (original was a Vite + React app, not Next.js)
- `virtual:pwa-register` (vite-plugin-pwa) removed — PWA plugin dropped for Replit compatibility
- Tailwind CSS v3 with PostCSS (not @tailwindcss/vite)
- All source files live under `artifacts/rentrix/src/` (copied from `.migration-backup/src/`)
