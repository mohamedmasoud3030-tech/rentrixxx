# Deployment Readiness Checklist

## 1) Environment Validation
- Required variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Optional but recommended:
  - `VITE_ERROR_TRACKER_DSN` (for centralized error tracking)
  - `VITE_RELEASE_VERSION` (release tagging for observability)
  - `VITE_LOG_LEVEL` (`warn` in production is recommended)

Use:

```bash
npm run readiness
# CI strict mode:
npm run readiness:strict
```

## 2) Secrets Management
- Do **not** commit `.env*` files into git.
- Store production secrets in deployment platform secret store (Vercel/GitHub Actions/Supabase).
- Rotate keys at least quarterly or immediately after any suspected leak.
- Use masked logging for secrets (only prefix/suffix shown).

## 3) Rollback Strategy
- Release with immutable tags (e.g., `release-2026-04-03-1`).
- Keep at least one previous healthy deployment artifact available for immediate rollback.
- Run database migrations with backward compatibility first, then destructive cleanup in a later release.
- Trigger rollback if error rate or auth failures spike beyond threshold.

## 4) Post-deploy Validation
- Login flow (`USER` and `ADMIN`).
- Core finance flows (receipt, expense, invoice generation).
- Critical dashboards and report loading.
- Error tracker receives a synthetic test event.
