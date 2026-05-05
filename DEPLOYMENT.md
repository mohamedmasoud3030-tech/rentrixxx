# Deployment Guide

This project uses GitHub Actions for CI/CD, automatically building and deploying to Vercel on every push to `main`.

## Required GitHub Actions Secrets

Before the CD pipeline can deploy, you must add these three secrets to the GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Where to find it |
|---|---|
| `VERCEL_TOKEN` | [Vercel Dashboard](https://vercel.com/account/tokens) → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Vercel Dashboard → Settings → General → **Team ID** (starts with `team_`) |
| `VERCEL_PROJECT_ID` | Vercel Dashboard → Project `rentrixxx-jz7n` → Settings → General → **Project ID** (starts with `prj_`) |

## Workflows

### CI (`ci.yml`)
Triggered on every push and pull request to `main`.
- Installs dependencies with `pnpm install --frozen-lockfile`
- Runs `pnpm run typecheck` across the full monorepo
- Runs `pnpm -r run build` for all packages

### CD (`deploy.yml`)
Triggered on every push to `main` (runs in parallel with CI).
- Pulls Vercel environment configuration
- Builds via Vercel CLI
- Deploys to production (`rentrixxx-jz7n`)

## Local Setup for New Contributors

```bash
# Clone the repo
git clone https://github.com/mohamedmasoud3030-tech/rentrixxx.git
cd rentrixxx

# Install dependencies
pnpm install
```
