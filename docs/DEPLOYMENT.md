# Deployment Guide

## Overview
Rentrix is designed to be deployed on **Vercel** (Frontend) and **Supabase** (Backend). This guide covers the production setup.

## 1. Supabase Setup (Backend)

### Database & Auth
1. Create a new Supabase project.
2. Run the migrations in `supabase/migrations/` in sequential order using the Supabase SQL Editor or CLI.
3. Enable **Google Auth** or **Email Auth** in the Supabase Dashboard under Authentication > Providers.
4. Configure **Site URL** and **Redirect URIs** to match your Vercel deployment URL.

### Edge Functions
Deploy all functions located in `supabase/functions/`:
```bash
supabase functions deploy automation-scheduler
supabase functions deploy assistant-proxy
supabase functions deploy public-api
supabase functions deploy admin-create-user
supabase functions deploy owner-access-token
```

### Environment Secrets
Set the following secrets in Supabase:
- `GEMINI_API_KEY`: For the AI Assistant.
- `OWNER_TOKEN_SECRET`: A secure string for signing portal tokens.
- `AUTOMATION_CRON_SECRET`: To secure the scheduler endpoint.

## 2. Vercel Setup (Frontend)

1. Connect your GitHub repository to Vercel.
2. Configure the following **Environment Variables**:
   - `VITE_SUPABASE_URL`: Your Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key.
   - `VITE_APP_NAME`: "Rentrix"
   - `VITE_APP_VERSION`: "2.0.0"
3. Set the **Build Command**: `npm run build` (or `pnpm build`).
4. Set the **Output Directory**: `dist`.

## 3. Automation & Maintenance

### Cron Jobs
To trigger the `automation-scheduler`, set up a GitHub Action or an external cron service (like Upstash or Vercel Cron) to call the function endpoint:
- **URL**: `https://<project>.supabase.co/functions/v1/automation-scheduler`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <AUTOMATION_CRON_SECRET>`

### Backup Strategy
- **Database**: Supabase provides automatic daily backups.
- **Point-in-Time Recovery (PITR)**: Recommended for production environments (available on Supabase Pro plan).

## 4. Production Hardening
- Ensure `VITE_LOG_LEVEL` is set to `warn` or `error` in production.
- Review all RLS policies to ensure no data leakage.
- Enable **Force SSL** in the Supabase Dashboard.
- Set up a custom domain on Vercel and enable the Web Application Firewall (WAF).
