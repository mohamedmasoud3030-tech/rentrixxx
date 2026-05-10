# Deployment Guide

This repo uses a unified deploy architecture where Vercel owns the frontend layer and Cloudflare owns the edge layer.

## Platform responsibility split

- **Vercel**: hosts the frontend app from `artifacts/rentrix`.
- **Cloudflare**: hosts edge runtime/assets from `artifacts/api-server`.
- **CI router**: detects changed paths and deploys only the affected layer(s).

## Required GitHub Actions secrets

Add these repository secrets in **Settings → Secrets and variables → Actions**.

### Vercel

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Cloudflare

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Workflow behavior

Workflow: `.github/workflows/deploy.yml`

1. Install dependencies with `pnpm install --frozen-lockfile`
2. Build once with `pnpm run build`
3. Run deploy router (`node scripts/deploy-router.mjs`) to classify changed files
4. Deploy selectively:
   - `artifacts/rentrix/**` changed → deploy to Vercel
   - `artifacts/api-server/**` changed → deploy to Cloudflare
   - both changed → deploy both in sequence

This prevents overlapping deploy targets and avoids duplicate build pipelines.
