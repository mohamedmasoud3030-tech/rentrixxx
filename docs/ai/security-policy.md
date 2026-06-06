# Rentrix Security Policy

## Sensitive surfaces

Treat the following as security-sensitive:

- Supabase migrations and RLS policies
- authentication, authorization, and role checks
- environment parsing and deployment configuration
- file uploads, exports, and generated documents
- payment, receipt, arrears, and audit-trail behavior
- edge functions, external integrations, and CORS configuration

## Required rules

- Never commit secrets, service-role keys, production tokens, or copied production data.
- Keep browser-visible credentials limited to approved public values.
- Review access control whenever a query, mutation, table, or route changes.
- Keep posted financial history auditable; do not silently mutate historical records.
- Sanitize exported spreadsheet values where formulas could be interpreted by office software.
- Keep error messages useful without exposing secrets or internal tokens.

## Review requirement

Any PR touching a sensitive surface must state the security impact, affected tables or routes, verification performed, and any remaining risk.