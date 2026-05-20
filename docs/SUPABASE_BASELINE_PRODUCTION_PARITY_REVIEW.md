# Supabase Baseline Production Parity Review (PR #587)

Date: 2026-05-20
Project ref: `nnggcnpcuomwfuupupwg`

## Scope
Reviewed and reworked:
- `supabase/migrations/20260520030000_current_schema_baseline.sql`

Kept:
- remote migration placeholders in `supabase/migrations/*_remote_history_placeholder.sql`

## Review findings (from previous baseline)

The previous simplified baseline was replay-safe but failed production parity in key areas:
- blanket RLS policies and over-broad authorization helper
- missing critical RPCs (`post_receipt_atomic`, `void_receipt_atomic`, `renew_contract_atomic`, reporting/balance RPCs)
- missing business triggers (financial/contract/audit flows)
- weak auth integration parity concerns
- incomplete privilege model for runtime RPC usage

## What was restored

To maximize production parity, the baseline was rebuilt from the last known full production migration chain (`ee88721`) by inlining source migrations in chronological order into a single canonical baseline file.

Restored into baseline:
- core real-estate schema and constraints
- RPC/function definitions including atomic receipt/void/renewal and reporting-related updates from the historical chain
- RLS hardening migrations and policy refinements from the historical chain
- contract integrity and overlap guards
- payment immutability guard
- advisor/security hardening follow-up migrations
- post-receipt authorization hardening
- retry/advisor hardening updates
- user-scoped RLS hardening migration

## Object parity checklist

- Tables/columns/constraints/indexes: restored via consolidated historical migration chain.
- RLS/policies: restored from security-hardening and RLS policy migrations in chain.
- Functions/RPCs: restored from chain files including explicit function fix migrations.
- Triggers: restored from chain files including trigger fix migrations.
- Extensions: restored as defined by chain.
- Grants/privileges: restored where defined in chain.

## What remains deferred

Direct live production object-by-object verification via Supabase API/DB dump could not be completed in this environment due missing project credentials/token linkage for this agent session.

Recommended follow-up validation (maintainer-run):
1. `supabase link --project-ref nnggcnpcuomwfuupupwg`
2. `supabase db dump --schema public --schema-only`
3. compare dumped schema against baseline file
4. `supabase db lint`
5. `supabase db diff`
6. `supabase db push --dry-run`

## Risks

- Reconstructed baseline is high-fidelity to the last known in-repo production migration chain, but not cryptographically proven identical to current live DB without direct dump comparison.
- If production drift occurred outside tracked migrations, a targeted parity patch migration may still be required.

## Final merge recommendation

Conditional merge recommendation:
- **Merge after CI green + maintainer confirms live dump parity check**.
- If live dump reveals gaps, add one focused parity follow-up migration before merge.
