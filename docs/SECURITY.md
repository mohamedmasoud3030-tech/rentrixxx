# Security Policy — Rentrix

## 1. Environment Variables (Credentials)

### ⚠️ CRITICAL: Never commit credentials

All Supabase and API keys must be stored **only** in environment variables:

```env
# .env.local (NEVER commit to Git)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-key (if using AI features)
```

### Key Rotation

If credentials are ever exposed:

1. **Supabase Anon Key** → Rotate in Supabase Dashboard → Authentication > API Keys
2. **Gemini API Key** → Disable in Google Cloud Console
3. **GitHub Secrets** → Update all CI/CD environment variables
4. **Vercel Secrets** → Update project environment variables

## 2. Row Level Security (RLS)

All database tables have RLS enabled. Verify:

```sql
SELECT tablename FROM pg_tables 
WHERE schemaname='public' AND rowsecurity=true;
```

### RLS Policies

Every table must have explicit SELECT, INSERT, UPDATE, DELETE policies for the `authenticated` role.

Example:
```sql
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);
```

## 3. Edge Function Security

All Edge Functions must verify JWT tokens:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

Deno.serve(async (req: Request) => {
  // Verify JWT
  const token = req.headers.get('authorization')?.split(' ')[1];
  if (!token) return new Response('Unauthorized', { status: 401 });

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return new Response('Forbidden', { status: 403 });

  // Process authenticated request
  return new Response('OK', { status: 200 });
});
```

## 4. Data Encryption

- **In Transit:** HTTPS enforced on all connections
- **At Rest:** Supabase stores data encrypted in PostgreSQL
- **PII:** Tenant names, emails, phone numbers stored in plaintext (not encrypted)

For GDPR compliance, implement field-level encryption if needed.

## 5. Authentication

### Supported Methods

- Email + Password (Supabase Auth)
- Google OAuth (optional)

### Session Management

- Sessions expire after 24 hours
- Auto-refresh via `autoRefreshToken: true`
- Clear on logout via `supabase.auth.signOut()`

## 6. API Security

### CORS

Only allow requests from trusted domains:

```typescript
// Backend: Configure Supabase CORS
// Settings > API > CORS allowed domains
```

### Rate Limiting

Supabase includes rate limiting on:
- Auth endpoints: 15 requests per minute
- REST API: 1000 requests per hour per IP

## 7. Dependency Security

### Vulnerable Dependencies

Check regularly:
```bash
npm audit
```

Fix high/critical vulnerabilities:
```bash
npm audit fix --force
```

### Pinned Versions

Critical dependencies are pinned in `package.json`:
- `@supabase/supabase-js`: `^2.100.0`
- `react`: `^19.2.4`
- `typescript`: `^5.8.3`

## 8. Secrets in Vercel

Environment variables in Vercel Dashboard:

1. **Production Environment**
   - `VITE_SUPABASE_URL` → your project URL
   - `VITE_SUPABASE_ANON_KEY` → anon key (public)
   - `VITE_GEMINI_API_KEY` → (if using AI)

2. **Preview Environment** (optional, can be same as prod for testing)

Never use Preview deployments for production data.

## 9. Secrets in GitHub

GitHub Actions Secrets (if using CI/CD):

1. Go to Repository Settings > Secrets
2. Add any secrets needed for CI/CD

Example:
```yaml
# .github/workflows/deploy.yml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

## 10. Incident Response

### If a secret is exposed:

1. **Immediately** rotate the key in its source system
2. **Check logs** for unauthorized access
3. **Notify users** if data was compromised
4. **Update** all copies of the secret (GitHub, Vercel, .env files)
5. **Review** commit history for exposure duration

### Audit Trail

View all database changes:
```sql
SELECT * FROM audit_log 
ORDER BY created_at DESC 
LIMIT 50;
```

## 11. Deployment Security

### Vercel Deployment

- Enforce HTTPS only (configured)
- Enable WAF if on Pro plan
- Review environment variables before deploying
- Pin Node.js version in `package.json` `engines`

### Supabase Deployment

- Enable Point-in-Time Recovery (PITR) for backups
- Enable Force SSL in Settings > Database
- Restrict IP access if possible
- Monitor real-time logs for suspicious queries

## 12. Third-Party Access

Before integrating third-party services:

1. Review data access permissions
2. Rotate credentials regularly
3. Use API keys with minimal scope
4. Monitor usage logs

**Current Integrations:**
- Google Gemini (AI Assistant) — read-only text processing
- WhatsApp (optional) — outbound messages only

## 13. Compliance

### GDPR (if serving EU customers)

- Data deletion: Implement via `DELETE` cascade or soft-delete
- Data portability: Export feature recommended
- Consent: Obtain before collecting data
- Privacy Policy: Required on landing page

### PCI DSS (if processing payments)

- Never store credit card data
- Use Stripe/PayPal for payments
- No cardholder data in logs

## 14. Regular Security Audits

- **Monthly:** Review access logs and audit trail
- **Quarterly:** Run `npm audit` and update deps
- **Yearly:** Third-party security audit (recommended)

---

**Last Updated:** 30 April 2026  
**Responsible Party:** Security Team  
**Contact:** security@rentrix.app
