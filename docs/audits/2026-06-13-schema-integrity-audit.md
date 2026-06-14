# Rentrixxx — Second Audit: Schema Integrity, Trigger Logic & Constraint Review
**Date:** 2026-06-13 (Session 3)
**Scope:** Production project `nnggcnpcuomwfuupupwg`
**Methodology:** Direct SQL inspection of triggers, FK constraints, indexes, and function bodies in `public` schema. All findings below are reproduced with the exact verification query used. No code changes applied in this session — findings only, pending PR.

---

## Summary

| Severity | Count | Theme |
|---|---|---|
| 🔴 Critical | 2 | Stale denormalized financial/operational state after UPDATEs |
| 🟠 High | 1 | Duplicate trigger execution (data correctness adjacent) |
| 🟡 Medium | 2 | Conflicting/duplicate FK constraints |
| 🟢 Low | 1 | Missing indexes on FK columns |

---

## 🔴 CRITICAL-1: Owner balance recalculation drops income/expenses from ended contracts

**Function:** `update_owner_balance_on_expense` (triggered by both `expenses` and `receipts` AFTER INSERT)

**Evidence:**
```sql
... from owners o
left join properties p on p.owner_id = o.id
left join units u on u.property_id = p.id
left join contracts c on c.unit_id = u.id and c.status = 'ACTIVE'   -- ◀ PROBLEM
left join receipts r on r.contract_id = c.id
left join expenses e on (e.contract_id = c.id or e.property_id = p.id)
...
```

**Problem:** The join to `contracts` is filtered to `status = 'ACTIVE'`. Once a contract ends — via `renew_contract_atomic` (sets old contract to `ENDED`) or any manual termination — every historical receipt and contract-linked expense tied to that contract is **silently excluded** from `owner_balances.total_income` / `total_expenses` on the next recalculation.

**Impact:** Any owner whose property has ever had a contract renewal will see `total_income`, `total_expenses`, `commission`, and `net_balance` recompute to a *smaller* number than reality — understating historical revenue. Since this is a full recompute (not incremental), the moment ANY receipt or expense is inserted anywhere in the system, ALL owners' balances are recalculated and the historical data for renewed-contract owners silently shrinks.

**Reproduction path:** renew any active contract → insert any new receipt/expense anywhere → query `owner_balances` for the affected owner → total_income drops by the sum of receipts tied to the now-ENDED contract.

**Fix:** Remove the `c.status = 'ACTIVE'` filter from the contracts join (or replace with `c.deleted_at is null` only), since this aggregation should be a lifetime total, not "currently active contracts only."

**Estimated effort:** 2h (rewrite function body + add regression test with a renewed contract fixture)

---

## 🔴 CRITICAL-2: Units don't release from OCCUPIED/MAINTENANCE when contract/maintenance status changes via UPDATE

**Trigger:** `trigger_update_unit_status_on_contract` — `AFTER INSERT ON contracts`
**Trigger:** `trigger_update_unit_status_on_maintenance` — `AFTER INSERT ON maintenance_records`

**Evidence:**
```sql
SELECT tgname, CASE WHEN tgtype::int & 16=16 THEN 'UPDATE' ... END
FROM pg_trigger WHERE tgname IN
  ('trigger_update_unit_status_on_contract','trigger_update_unit_status_on_maintenance');
-- both return event = INSERT only, no UPDATE
```

The underlying function `update_unit_status()` itself is correct — it fully recomputes unit status from current contract/maintenance state. The bug is **the trigger is never invoked on UPDATE**.

**Problem:** If a contract is terminated by a direct `UPDATE contracts SET status='ENDED'/'CANCELLED' WHERE id=...` (any path that is NOT `renew_contract_atomic`'s insert-of-replacement-contract pattern), no trigger fires, and `units.status` remains `OCCUPIED` forever — even though there is no active contract.

Same for `maintenance_records`: if a maintenance ticket is closed via `UPDATE maintenance_records SET status='COMPLETED'`, the unit never transitions out of `MAINTENANCE` back to `AVAILABLE`/`OCCUPIED`.

**Why this wasn't caught before:** `renew_contract_atomic` happens to "work" because it always pairs the `UPDATE...ENDED` with an `INSERT` of the replacement contract — the INSERT trigger fires and recomputes status correctly (finds the new ACTIVE contract → OCCUPIED). But any contract termination *without* a renewal, or any maintenance closure, leaves stale unit status.

**Fix:**
```sql
CREATE TRIGGER trigger_update_unit_status_on_contract_update
  AFTER UPDATE OF status, deleted_at, unit_id ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_unit_status();

CREATE TRIGGER trigger_update_unit_status_on_maintenance_update
  AFTER UPDATE OF status, deleted_at ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION update_unit_status();
```

**Estimated effort:** 1h (add 2 triggers + verify with a one-off `recalculate_all_balances`-style backfill for currently-stale units)

**Backfill needed:** Yes — any unit currently `OCCUPIED` with zero ACTIVE contracts, or `MAINTENANCE` with zero open maintenance records, is already stale and needs a one-time correction pass.

---

## 🟠 HIGH-1: Duplicate `updated_at` triggers on `invoices` and `receipts`

**Evidence:**
```
invoices: invoices_updated_at (BEFORE UPDATE → update_updated_at)
invoices: set_invoices_updated_at (BEFORE UPDATE → update_updated_at)

receipts: receipts_updated_at (BEFORE UPDATE → update_updated_at)
receipts: set_receipts_updated_at (BEFORE UPDATE → update_updated_at)
```

**Problem:** Both triggers fire on every UPDATE to these tables, running `update_updated_at()` twice per row per update. Harmless in isolation (idempotent — both set `updated_at = now()`), but indicates leftover migration artifacts and doubles trigger overhead on the two highest-write-volume tables in the schema.

**Fix:** Drop one of each pair — keep the more descriptively named `set_*_updated_at` (matches naming used elsewhere) and drop `invoices_updated_at` / `receipts_updated_at`.

**Estimated effort:** 15 min

---

## 🟡 MEDIUM-1: `properties.owner_id` has two FK constraints with conflicting ON DELETE behavior

**Evidence:**
```
properties_owner_fk:     FOREIGN KEY (owner_id) REFERENCES owners(id)                                    -- implicit NO ACTION
properties_owner_id_fkey: FOREIGN KEY (owner_id) REFERENCES owners(id) ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED
```

**Problem:** Both constraints are checked on every owner delete/update. The first (`properties_owner_fk`, default `NO ACTION`) will always raise a foreign-key violation before the second constraint's `SET NULL` can ever take effect — making `properties_owner_id_fkey`'s `ON DELETE SET NULL` **dead code**. Attempting to delete an owner with properties will always fail with a FK violation, regardless of the `SET NULL` intent.

**Fix:** Drop `properties_owner_fk` (the older, unqualified constraint), keeping `properties_owner_id_fkey` which has the intended `SET NULL` behavior.

**Estimated effort:** 15 min (verify no app code depends on hard-block-on-delete behavior first)

---

## 🟡 MEDIUM-2: Four sets of duplicate FK constraints (identical definitions, different names)

**Evidence:**
| Table | Column | Duplicate constraint names |
|---|---|---|
| units | property_id | `units_property_id_fkey`, `units_property_fk` |
| receipts | contract_id | `receipts_contract_id_fkey`, `receipts_contract_fk` |
| receipt_allocations | invoice_id | `receipt_allocations_invoice_id_fkey`, `receipt_allocations_invoice_fk` |
| receipt_allocations | receipt_id | `receipt_allocations_receipt_id_fkey`, `receipt_allocations_receipt_fk` |
| journal_entries | account_id | `journal_entries_account_id_fkey`, `journal_entries_account_fk` |

**Problem:** Each pair has byte-identical `pg_get_constraintdef()` output — true duplicates from overlapping migration history (likely one added by an early schema, one by a later "_app" or "_fk"-suffixed migration that didn't check for existing constraints). No correctness bug (Postgres checks both, both pass/fail identically), but doubles constraint-check overhead on every insert/update to these high-traffic tables and adds confusion during future schema changes.

**Fix:** Drop the older-named duplicate from each pair (keep `*_fkey` convention, drop `*_fk`).

**Estimated effort:** 30 min

---

## 🟢 LOW-1: Missing indexes on 3 FK columns

**Evidence:**
| Table | Column | Constraint |
|---|---|---|
| automation_run_logs | job_id | automation_run_logs_job_id_fkey |
| automation_runs | job_id | automation_runs_job_id_fkey |
| contracts | renewed_from_id | contracts_renewed_from_id_app_fkey |

**Problem:** FK columns without indexes cause sequential scans on the referencing table whenever the referenced row is deleted/updated (for FK validation), and slow any query that joins/filters by these columns. `automation_run_logs`/`automation_runs` are append-heavy audit tables that will grow large; `contracts.renewed_from_id` is queried whenever building a renewal history chain.

**Fix:**
```sql
CREATE INDEX IF NOT EXISTS idx_automation_run_logs_job_id ON automation_run_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_job_id ON automation_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_contracts_renewed_from_id ON contracts(renewed_from_id);
```

**Estimated effort:** 15 min

---

## Prioritized Fix Plan

| Priority | Item | Severity | Effort | Sequencing notes |
|---|---|---|---|---|
| P1 | CRITICAL-2: Add UPDATE triggers for unit status sync + backfill stale units | 🔴 | 1.5h | Do first — actively causing wrong "OCCUPIED" units to show as unavailable for new tenants |
| P2 | CRITICAL-1: Fix owner_balances recalc to include ended contracts | 🔴 | 2h | Do second — financial reporting accuracy for owners |
| P3 | HIGH-1: Remove duplicate updated_at triggers | 🟠 | 15m | Quick win, bundle with P4/P5 |
| P4 | MEDIUM-1: Resolve conflicting properties.owner_id FKs | 🟡 | 15m | Verify app doesn't rely on hard-block delete first |
| P5 | MEDIUM-2: Drop 4 duplicate FK constraints | 🟡 | 30m | Bundle with P4 in same migration |
| P6 | LOW-1: Add 3 missing FK indexes | 🟢 | 15m | Bundle with P3-P5 — single "schema cleanup" migration |

**Recommended grouping for migrations:**
- **Migration A** (P1): unit status UPDATE triggers + one-time backfill query
- **Migration B** (P2): owner_balances recalculation fix + one-time recalc run via `recalculate_all_balances()`
- **Migration C** (P3+P4+P5+P6): schema cleanup — drop duplicate triggers/constraints, add missing indexes

This grouping isolates the two financial/operational-correctness fixes (which need careful review and a backfill step) from the pure cleanup (zero behavioral risk, can ship immediately).

---

## Verification Queries (for post-fix validation)

```sql
-- CRITICAL-2 backfill check: units that should not be OCCUPIED
SELECT u.id, u.status FROM units u
WHERE u.status = 'OCCUPIED'
  AND NOT EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.unit_id = u.id AND c.status='ACTIVE' AND c.deleted_at IS NULL
  );

-- CRITICAL-1 spot check: owner with a renewed contract — total_income should include old contract's receipts
SELECT o.id, ob.total_income,
  (SELECT sum(r.amount) FROM receipts r
   JOIN contracts c ON c.id = r.contract_id
   JOIN units u ON u.id = c.unit_id
   JOIN properties p ON p.id = u.property_id
   WHERE p.owner_id = o.id AND r.status='POSTED') AS expected_total_income
FROM owners o JOIN owner_balances ob ON ob.owner_id = o.id;

-- HIGH-1 / MEDIUM-2: should return 0 after Migration C
SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
WHERE c.relname IN ('invoices','receipts') AND t.tgname LIKE '%updated_at%'
GROUP BY c.relname HAVING count(*) > 1;
```
