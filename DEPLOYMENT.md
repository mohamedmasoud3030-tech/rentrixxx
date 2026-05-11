# Production Deployment

## Prerequisites
- Node.js 20+
- pnpm 10.11.1

## Required environment variables
Use `.env` (local) or deployment provider env settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_LOG_LEVEL`
- `VITE_ERROR_TRACKER_DSN`
- `VITE_RELEASE_VERSION`

## Deterministic build
```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
```

## Vercel
`vercel.json` is configured to:
- install with frozen lockfile
- run workspace build
- serve `artifacts/rentrix/dist/public`

## Cloudflare Pages
- Build command: `pnpm build`
- Build output directory: `artifacts/rentrix/dist/public`
- Install command: `pnpm install --frozen-lockfile`

## SPA routing
Ensure a catch-all rewrite to `/index.html` is enabled (already configured on Vercel).
