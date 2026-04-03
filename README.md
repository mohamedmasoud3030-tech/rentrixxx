<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Rentrix

Production-ready SaaS for property, contracts, maintenance, and financial operations.

## Local setup

**Prerequisites**
- Node.js 20+
- npm 10+

1. Install dependencies deterministically:
   ```bash
   npm ci
   ```
2. Run preflight checks:
   ```bash
   npm run preflight
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

## Required environment variables

1. Install dependencies:
   `npm install`
2. Set environment variables in `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - optional: `VITE_ERROR_TRACKER_DSN`, `VITE_RELEASE_VERSION`, `VITE_LOG_LEVEL`
3. Run the app:
   `npm run dev`

## Launch hardening checks

- Run full gate locally:
  - `npm run ci`
- Deployment readiness checklist:
  - `npm run readiness`
  - `npm run readiness:strict` (fails on missing required envs)
