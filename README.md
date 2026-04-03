# Rentrix
نظام إدارة العقارات — Production-ready property management system.

## Local setup

### Prerequisites
- Node.js 20+
- npm 10+

### Installation
1. Install dependencies:
   npm ci

2. Set environment variables in .env.local:
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   Optional:
   VITE_ERROR_TRACKER_DSN=
   VITE_RELEASE_VERSION=
   VITE_LOG_LEVEL=

3. Run preflight checks:
   npm run preflight

4. Start dev server:
   npm run dev

## Available scripts

| Script | Description |
|--------|-------------|
| npm run dev | Start development server |
| npm run build | Production build |
| npm run typecheck | TypeScript type check |
| npm run lint | ESLint check |
| npm run test | Run tests |
| npm run ci | Full local gate (typecheck + lint + test + build) |
| npm run preflight | Environment preflight checks |
| npm run readiness | Deployment readiness checklist |
| npm run readiness:strict | Readiness check (fails on missing envs) |
| npm run schema:drift:check | Check Supabase schema drift |

## CI/CD
- GitHub Actions runs on every push and pull request
- Required GitHub Secrets:
  SUPABASE_ACCESS_TOKEN
  SUPABASE_DB_PASSWORD
  SUPABASE_PROJECT_REF

## Tech stack
- React + TypeScript + Vite
- Supabase (PostgreSQL + Auth + Edge Functions)
- Tailwind CSS + shadcn/ui
- Deployed on Vercel
