# Rentrix v0.1 first-customer release handoff

## Completed and pushed

- Operational route surfaces were merged.
- Unit status normalization was merged and applied.
- Local-only user-management UI was removed from Settings.
- Live operational RPC/report privilege alignment was applied.
- Live compatibility fixes for expenses, properties, people, and units were applied.
- The applied compatibility changes are recorded in `supabase/migrations/20260604012000_sync_live_operational_contracts.sql`.

## Pending for the next phase

- Contracts: align generated identifier handling for new records.
- Invoices: align generated identifier handling for new records.
- Maintenance records: align generated identifier handling for new records.
- Payments: reconcile the legacy payment-reference field with the active UI field.
- Contract renewal: align the active UI call with the live RPC contract.

## Required next execution order

1. Resolve the five pending compatibility items above.
2. Run one authenticated end-to-end operational smoke flow.
3. Fix blockers only.
4. Run the stage validation gate once.
5. Publish the first-customer demo release.

## Scope lock

Do not add accounting, ledger, owner portal, multi-company, maps, AI, broad legacy restoration, or visual redesign work before the first-customer demo is ready.
