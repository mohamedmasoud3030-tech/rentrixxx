# Recovery Reference Archive

This archive keeps only concise, reference-only recovery notes that survived the
repository hygiene cleanup. It must not contain executable legacy source, package
metadata, generated files, or broad historical snapshots.

Runtime imports from this archive are prohibited because the active Rentrix app
uses TanStack Router, React Query, Supabase-backed services, current migrations,
and the constrained-beta navigation boundary. Historical material from removed
paths such as `.migration-backup/` and `artifacts/rentrix/legacy-src/` included
deprecated `useApp`, `AppContext`, `dataService`, local database flows, legacy
router patterns, duplicated UI modules, and old configs that are incompatible
with the active architecture.

## Retained Notes

| Note | Why retained | Unique value | Related active implementation | Reference-only reason |
| --- | --- | --- | --- | --- |
| `financial-posting-recovery-notes.md` | Captures a minimal checklist for deferred financial correction verification. | Documents receipt void/reversal and closed-period verification prompts found while deleting legacy recovery trees. | `supabase/migrations/20260503160000_atomic_receipt_serial.sql`, `supabase/migrations/20260503120000_consolidate_schema_integrity.sql`, and current financial services under `artifacts/rentrix/src/features/financials/`. | It is not a migration or source module; any future implementation must be rebuilt against current schema, RLS, RPC signatures, and tests. |
