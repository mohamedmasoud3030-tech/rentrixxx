# Deferred Features Audit — Rentrix

Audit date: 2026-05-23 (UTC)

## Scope and method
This audit is **plan-only**. No deferred systems were implemented. I inspected runtime routes/pages, feature services, Supabase migrations, and related placeholders.

## Baseline status before audit
- Branch: `work`
- HEAD SHA: `7b4d7582a80d78986b00943b07192e4550502a6b`
- Working tree: clean

## Deferred feature readiness table

| Feature | Frontend status | Backend/schema status | Blockers | Readiness | Minimum safe next batch |
|---|---|---|---|---|---|
| Accounting / Ledger | `/accounting` route exists with placeholder EmptyState only. | No ledger tables/RPCs/policies. Existing finance model is invoices/receipts/payments/expenses only. | Missing ledger model and posting rules; high risk without accounting design. | Needs schema design first (remain deferred). | Design-only RFC + schema proposal doc; no migrations. |
| Owner Portal | No owner-auth portal route; owners feature is internal ops workspace. | Owners table + property owner links exist; no owner portal auth/token/session model. | Missing portal identity/session/security model and RLS segregation. | Needs product decision first. | Define owner portal access model + RLS spec doc only. |
| Owner Statements | No dedicated owner statement page; reports page marks deferred cards. | No owner statement ledger/allocation model; no statement RPC/edge function. | Missing statement data contract (period, accrual vs cash, adjustments). | Needs schema design first. | Define statement contract and SQL view/RPC interface (spec only). |
| PDF / Print / Templates | Receipt print page exists; document engine/pdf service exists; templates tab explicitly deferred. | No DB-backed template storage/versioning/signoff; pdf generation is code-driven. | No template schema/workflow and no runtime template governance. | Ready for UI-only incremental work (non-persistent) + needs schema design for full templates. | Small batch: expose existing document types UI + read-only preview wiring; separate later schema batch for templates. |
| WhatsApp Integration | No WhatsApp route/functionality found. | No whatsapp tables, secrets, webhooks, queues, or edge functions. | Missing provider choice and compliance/security model. | Should remain deferred. | Product + architecture decision doc before any code. |
| Communication Hub backend | `/communication` route exists with disabled send button and explicit backend-missing copy. | No message tables/RPC/edge functions/channels backend. | Missing canonical conversation/message model + delivery pipeline. | Needs schema design first. | Batch 0: schema/interface spec + RLS matrix only. |
| Smart Assistant backend | `/assistant` route exists; actions disabled and marked coming soon. | No AI backend functions, no prompt/runtime tables, no secrets bindings. | Missing use-case boundaries, data access policy, and tool execution model. | Should remain deferred (until product/security decisions). | Define assistant guardrails + allowed queries + audit policy doc. |
| Import / Bulk Data tools | Existing bulk-selection/export CSV UX in tenants/owners areas, but no generalized import flow. | No import jobs tables, staging tables, validation RPC, or async workers. | Missing idempotency/error-recovery strategy and mapping UX contract. | Needs product decision first. | Define import contract + staged validation design doc; no data writes yet. |
| Advanced financial reports | Basic operational reports exist; page shows deferred reports section. | Existing report services compute from operational tables; no accounting-grade P/L, owner distributions, or audited report snapshots. | Missing accounting source-of-truth and report versioning/audit trail model. | Should remain deferred until accounting foundation. | Dependency-first: finish accounting data model design, then add one advanced report at a time. |

## Per-feature notes

### 1) Accounting / Ledger
- Frontend: accounting page is intentionally placeholder only.
- Backend: current schema has invoices/receipts/payments/expenses and `post_receipt_atomic`, but no journal/ledger.
- Safe recommendation: keep deferred; first deliver a design package defining chart-of-accounts, journal entry rules, and reconciliation boundaries.

### 2) Owner Portal
- Frontend: owners page is internal CRUD/relationship management for staff, not portal login flows.
- Backend: no owner portal token/access/session infrastructure.
- Safe recommendation: product/security definition before implementation.

### 3) Owner Statements
- Frontend: no owner statement route/component in audited scope.
- Backend: no owner-distribution calculation model or statement materialization.
- Safe recommendation: statement specification (periodicity, basis, adjustments) before any UI backend coupling.

### 4) PDF / Print / Document Templates
- Frontend/backend today: printable receipt and jsPDF renderer are present; unified document engine exists.
- Gap: settings explicitly says template schema/service unavailable.
- Safe recommendation: keep full template system deferred; allow only low-risk UI composition over existing static generators.

### 5) WhatsApp Integration
- No app-level surface or backend contract currently.
- Safe recommendation: stay deferred until provider, opt-in policy, webhook security, and delivery/audit model are approved.

### 6) Communication Hub backend
- Frontend placeholder exists with disabled action to avoid fake behavior.
- No backing schema/services.
- Safe recommendation: start with message domain model and RLS design only.

### 7) Smart Assistant backend
- Frontend sandbox exists; actions disabled.
- No backend orchestration/tools store or secrets handling.
- Safe recommendation: remain deferred pending strict product and data-governance decisions.

### 8) Import / Bulk Data tools
- Some list-level bulk UX exists (selection/export), but no ingestion pipeline.
- Safe recommendation: define staged import architecture (upload -> validate -> review -> apply) before implementation.

### 9) Advanced financial reports
- Operational summaries/reports are present and intentionally bounded from accounting-grade outputs.
- Safe recommendation: defer until accounting model is defined; then sequence one report per batch with explicit correctness tests.

## Exact files inspected
- `artifacts/rentrix/src/features/accounting/accounting-page.tsx`
- `artifacts/rentrix/src/features/owners/OwnersPage.tsx`
- `artifacts/rentrix/src/features/owners/ownerService.ts`
- `artifacts/rentrix/src/features/financials/financials-page.tsx`
- `artifacts/rentrix/src/features/financials/reports/financialReportsService.ts`
- `artifacts/rentrix/src/features/financials/reports/useFinancialReports.ts`
- `artifacts/rentrix/src/features/invoices/invoices-page.tsx`
- `artifacts/rentrix/src/features/reports/reports-page.tsx`
- `artifacts/rentrix/src/features/reports/reports-page.helpers.ts`
- `artifacts/rentrix/src/features/recovery/communication-hub-page.tsx`
- `artifacts/rentrix/src/features/recovery/smart-assistant-page.tsx`
- `artifacts/rentrix/src/services/pdfService.ts`
- `artifacts/rentrix/src/services/documents/DocumentController.ts`
- `artifacts/rentrix/src/services/documents/DocumentEngine.ts`
- `artifacts/rentrix/src/services/documents/DocumentRenderer.ts`
- `artifacts/rentrix/src/services/financial/financialReportsService.ts`
- `artifacts/rentrix/src/lib/env.ts`
- `artifacts/rentrix/src/integrations/supabase/client.ts`
- `artifacts/rentrix/src/routeTree.ts`
- `supabase/migrations/20260522000000_clean_schema_baseline.sql`
- `supabase/migrations/20260523110000_schema_compatibility_pass.sql`
- `supabase/migrations/20260524013000_runtime_schema_compatibility_current_app.sql`

No `supabase/functions/` directory was present.
No legacy `legacy-src`/`archive`/`backup` trees were present in repository root scope.

## Safety confirmations
- No deferred feature systems were implemented in this task.
- No Supabase migrations were edited.
- Generated API client was not edited.

## Validation run results
- `pnpm --filter ./artifacts/rentrix run typecheck` ✅
- `pnpm --filter ./artifacts/rentrix run build` ✅
- `pnpm --filter ./artifacts/rentrix run lint` ✅
- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm build` ✅
- `pnpm --filter ./artifacts/rentrix test` ✅ (tests pass; includes expected runtime-config warning in test stderr)
