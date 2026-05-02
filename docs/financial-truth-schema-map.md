# Financial Truth Layer — Logical Schema Map

Date: 2026-04-27

## Scope
Logical (non-migration) schema for unified enterprise accounting flow.

## Core Tables

### 1) `documents`
Unified polymorphic document header table.

- `id` (uuid/text, PK)
- `type` (`receipt|payment_voucher|expense_voucher|statement|property_statement|tenant_statement|contract|invoice|journal_entry`)
- `status` (`draft|approved|posted|void`)
- `date`
- `currency`
- `property_id` (nullable)
- `party_id` (nullable)
- `description`
- `metadata` (jsonb)
- `created_at`, `updated_at`

### 2) `document_items`
Line-level table for all documents.

- `id` (uuid, PK)
- `document_id` (FK -> documents.id)
- `line_no`
- `item_type`
- `account_id` (nullable)
- `description`
- `qty` (nullable)
- `unit_price` (nullable)
- `amount`
- `extra` (jsonb)

### 3) `document_signatures`
Unified signature blocks.

- `id` (uuid, PK)
- `document_id` (FK -> documents.id)
- `role` (`owner|tenant|accountant|general_manager`)
- `signed_by` (nullable)
- `signed_at` (nullable)
- `status` (`pending|signed|rejected`)

### 4) `journal_entries`
Journal header-level posting record.

- `id` (uuid, PK)
- `document_id`
- `document_type`
- `date`
- `description`
- `total_debit`
- `total_credit`
- `status` (`POSTED|VOID`)
- `created_at`

### 5) `ledger_entries`
Journal line-level financial truth lines.

- `id` (uuid, PK)
- `journal_id` (FK -> journal_entries.id)
- `account_id`
- `account_name` (nullable)
- `debit`
- `credit`

### 6) `audit_log`
Canonical audit trail for all critical actions.

- `id` (uuid)
- `ts`
- `user_id`
- `username`
- `action`
- `entity`
- `entity_id`
- `note` (before/after snapshot string/json)

### 7) `settings` / company metadata source
Used by document header/footer rendering (logo/company metadata/currency).

---

## Journal Flow Mapping

`DocumentEngine` -> `LedgerEngine.createFromDocument()` -> debit/credit validation -> journal/ledger post -> `AuditTrail.log(POST_JOURNAL)`

`void` flow: action -> reverse/void -> `AuditTrail.log(VOID_JOURNAL)`

## Rules

1. No financial posting without balanced debit/credit.
2. No UI bypass for posting; posting must flow through engine services.
3. All create/post/void/update/export actions must be audited.
4. Reports should consume posted ledger truth (not temporary UI-only state).

---

## Structural Enforcement Mapping (DB / RPC Contract)

> This section defines strict enforcement expectations for Supabase/Postgres objects.

### A) Ledger Balance (`journal_entries`, `ledger_entries`)

- Enforcement:
  - `journal_entries.total_debit = journal_entries.total_credit` check constraint.
  - Deferred trigger validates sum of `ledger_entries` (DEBIT/CREDIT) equals header totals before commit.
- Runtime mirror:
  - `LedgerEngine.validateAndAudit()` hard-fails on any imbalance before calling atomic posting RPC.

### B) Document State FSM (`documents`)

- Allowed transitions only:
  - `draft -> posted`
  - `posted -> void`
  - `void` final (terminal)
- Forbidden:
  - any transition from `void`
  - updates to financial fields after `posted`
- Runtime mirror:
  - `assertDocumentTransition()` in accounting engine for post/void flow.
  - lock check rejects attempts to edit locked documents.

### C) Foreign Keys / Entity Integrity

- Required FK contract:
  - `document_items.document_id -> documents.id`
  - `journal_entries.document_id -> documents.id`
  - `ledger_entries.journal_id -> journal_entries.id`
  - `document_signatures.document_id -> documents.id`
- RPC preconditions:
  - atomic post/void RPCs reject missing or orphan references.

### D) Immutable Audit (`audit_log`)

- Enforcement:
  - append-only table; no update/delete path allowed.
  - each insert carries actor, timestamp, document reference, before_state, after_state.
- Runtime mirror:
  - `AuditTrail.log()` performs insert-only writes and serializes immutable event payload with `reference_id`.

### E) Company/Settings Integrity (`settings`)

- Header/footer rendering always reads company metadata from settings source.
- Documents keep immutable render metadata in audit payload after export.

---

## Closed Loop Governance Mapping (Phase 2)

1. PR generation is automated from Codex run output (GitNexus analysis + risk summary).
2. CI auto-fix loop applies minimal patch when checks fail, then re-runs checks.
3. Merge allowed only after all checks pass (no partial merge path).
4. Release follows semver tag format `v{major}.{minor}.{patch}` with changelog + audit diff summary.
5. Rollback policy targets last stable tag on imbalance/regression/build break.
