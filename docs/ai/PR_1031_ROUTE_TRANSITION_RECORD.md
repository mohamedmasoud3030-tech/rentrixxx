# PR #1031 Route Transition Record

**Recorded:** 2026-07-01  
**Status:** Open product/architecture decision; this record does not authorize Phase 8.

## Observed change

PR #1031 changed the protected route entry points for Contracts, Financials, Invoices, Receipts, and Expenses from the Phase 4/5 local-first hub pages to the existing Supabase-backed page implementations.

This is current `main` behavior. It is not evidence that Phase 8 has started or that live production readiness has been achieved.

## Why this is a documented contradiction

`docs/RENTRIX_MASTER_PLAN.md` postpones Supabase database integration, migrations, schema updates, RPCs, RLS, auth, and generated-type work to Phase 8. The local/mock layer remains the planned frontend authority for Phases 1–7.

The selected route wiring introduced by PR #1031 therefore creates a transitional mixed-data-layer state:

- The Phase 1–7 local/mock workflows remain implemented and tested.
- The above protected routes now resolve to existing Supabase-backed pages.
- No Phase 8 scope, migration, RLS policy, RPC contract, or production-readiness decision is implied by the route change.

## Resolution owner and next decision

The owner must choose one of the following before claiming an unambiguous data-layer strategy:

1. Restore the Phase 4/5 mock hubs as the active protected routes until Phase 8 is approved; or
2. Formally authorize a limited Phase 8 transition scope, including the affected routes, live-data parity, security/RLS verification, and acceptance evidence.

Until that decision is recorded, this repository must not claim that the affected Supabase-backed routes are Phase 8 complete or production ready.

## Production gate impact

The existing final-delivery gate remains blocked. B-1 through B-4 still require real operator evidence and are unaffected by this documentation record.
