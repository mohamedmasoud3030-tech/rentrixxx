# Production Deployment

## Runtime baseline
- Node.js 20+
- pnpm 10.11.1

## Environment configuration
Set these public Vite variables in hosting provider settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_LOG_LEVEL`
- `VITE_ERROR_TRACKER_DSN`
- `VITE_RELEASE_VERSION`

Reference template: `.env.example`.

## Deterministic CI/CD verification
Run before every production deployment:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm lint
```

## Vercel
The repository-level `vercel.json` is configured for:
- frozen-lockfile installs
- workspace build command
- static output directory: `artifacts/rentrix/dist/public`
- SPA rewrite to `index.html`

## Cloudflare Pages
Use these settings:
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Build output directory: `artifacts/rentrix/dist/public`

Enable SPA fallback to `/index.html` in Cloudflare routing.
