# 08 - Ordered PR-Sized Execution Plan

## PR 1 - Current-architecture adapter seam and permissions helper

| Field | Plan |
| --- | --- |
| Objective | Add the minimal read-only adapter pattern and permission helper needed for historical pages without restoring AppContext. |
| Source files | Historical `AuditLog.tsx`, current auth/layout/services patterns. |
| Target files | `src/lib/permissions.ts`, feature-local service/hook test scaffolding. |
| Preserve | Current router, auth provider, Supabase client, pnpm, CI, Vercel, PWA. |
| Port/adapt/discard | Adapt permission concepts; discard AppContext/dataService. |
| Schema assumptions | None beyond typed current auth. |
| Permission assumptions | Admin capability can be represented without provider replacement. |
| Risks | Over-building a generic abstraction. |
| Tests | Unit tests for permission helper. |
| Validation | `pnpm --filter ./artifacts/rentrix run typecheck`; `pnpm --filter ./artifacts/rentrix run typecheck:test`; `pnpm --filter ./artifacts/rentrix test`. |
| Acceptance | No runtime behavior regression; helper is small and unused or used only by pilot. |
| Rollback | Revert helper and tests. |
| Blocks demo | No, but reduces risk. |
| Complexity | LOW |

## PR 2 - Read-only Audit Log pilot

| Field | Plan |
| --- | --- |
| Objective | Port only read-only audit list/filter behavior as first historical feature. |
| Source files | `.migration-backup/src/ui/AuditLog.tsx`; optional `services/audit/AuditTrail.ts`. |
| Target files | `src/features/audit/audit-log-page.tsx`, `audit-log-service.ts`, TanStack route. |
| Preserve | No snapshot restore/create controls; current shell and diagnostics. |
| Port/adapt/discard | Adapt UI/filtering; discard AppContext and backup actions. |
| Schema assumptions | `audit_log`/equivalent table must be verified read-only. |
| Permission assumptions | Admin only. |
| Risks | Table naming mismatch. |
| Tests | Service mapping tests; page empty/loading/error tests. |
| Validation | Full baseline suite plus targeted audit tests. |
| Acceptance | Admin can view audit rows or empty state; no writes. |
| Rollback | Remove route and feature folder. |
| Blocks demo | No; useful. |
| Complexity | MEDIUM |

## PR 3 - Data Integrity Audit read-only view

| Field | Plan |
| --- | --- |
| Objective | Adapt issue display only, with repair/migration actions disabled. |
| Source files | `DataIntegrityAudit.tsx`, `auditEngine.ts`. |
| Target files | `src/features/audit/data-integrity-*`. |
| Preserve | No SQL execution or attachment migration. |
| Port/adapt/discard | Adapt audit calculations; discard React Router links; block migrate action. |
| Schema assumptions | Requires table inventory. |
| Permission assumptions | Admin only. |
| Risks | Broad table dependencies. |
| Tests | Pure audit rule tests with fixtures. |
| Validation | Full baseline suite. |
| Acceptance | Read-only report with clear unsupported-action messaging. |
| Rollback | Remove route/feature. |
| Blocks demo | No. |
| Complexity | HIGH |

## PR 4 - Change Password and permission mapping

| Field | Plan |
| --- | --- |
| Objective | Add explicit current-architecture change-password flow if current auth supports it. |
| Source files | `ChangePassword.tsx`, security settings reference. |
| Target files | `src/features/account/change-password-page.tsx`, route. |
| Preserve | Current auth provider. |
| Port/adapt/discard | Adapt form only; discard useApp. |
| Schema assumptions | None; Supabase auth only. |
| Permission assumptions | Authenticated user. |
| Risks | Current auth may not expose `mustChange`. |
| Tests | Form validation and mutation-state tests. |
| Validation | Full baseline suite. |
| Acceptance | User can change password or flow is clearly gated by current auth capability. |
| Rollback | Remove route/page. |
| Blocks demo | No; useful. |
| Complexity | MEDIUM |

## PR 5 - Owners Hub and Owner View

| Field | Plan |
| --- | --- |
| Objective | Add owner aggregate view and evaluate portal route separately. |
| Source files | `OwnersHub.tsx`, `OwnerView.tsx`, `edgeFunctions.ts`. |
| Target files | `src/features/owners/hub/*`, optional `portal/*`. |
| Preserve | Current owners list and people model. |
| Port/adapt/discard | Adapt data aggregation; block portal token until reviewed. |
| Schema assumptions | owners/properties/units/contracts/invoices/receipts/expenses. |
| Permission assumptions | Internal authenticated route; portal token for public route. |
| Risks | Aggregate query performance and token security. |
| Tests | Aggregate mapper tests and empty states. |
| Validation | Full baseline suite. |
| Acceptance | Internal owner hub works read-only. |
| Rollback | Remove hub route/files. |
| Blocks demo | No; useful. |
| Complexity | MEDIUM/HIGH |

## PR 6 - Demo-critical missing workflow hardening

| Field | Plan |
| --- | --- |
| Objective | Harden current demo behavior, not port new features. |
| Source files | Current routes/features only. |
| Target files | Current feature tests and small fixes if needed. |
| Preserve | Existing architecture. |
| Port/adapt/discard | None. |
| Schema assumptions | Existing current tables. |
| Permission assumptions | Existing current permissions. |
| Risks | Scope creep. |
| Tests | Staging smoke checklist; route refresh; sign-out/sign-in. |
| Validation | Full baseline suite and manual staging smoke. |
| Acceptance | Client-ready staging demo. |
| Rollback | Revert hardening PR. |
| Blocks demo | Yes. |
| Complexity | MEDIUM |

## PR 7 - Lands and Leads read-only/CRUD slices

| Field | Plan |
| --- | --- |
| Objective | Add CRM surfaces after table verification, lands read-only first. |
| Source files | `Lands.tsx`, `Leads.tsx`, `WhatsAppComposerModal.tsx`. |
| Target files | `src/features/lands`, `src/features/leads`. |
| Preserve | No journal side effects in first lands PR. |
| Port/adapt/discard | Adapt dataService to feature services. |
| Schema assumptions | lands, leads. |
| Permission assumptions | Authenticated; writes role-gated. |
| Risks | Hidden accounting writes. |
| Tests | CRUD service tests for leads; read-only lands tests. |
| Validation | Full baseline suite. |
| Acceptance | Leads CRUD and lands read-only with empty/error states. |
| Rollback | Remove feature routes. |
| Blocks demo | No. |
| Complexity | MEDIUM |

## PR 8 - Commissions and Communication Hub

| Field | Plan |
| --- | --- |
| Objective | Add read-only commissions and notification list/status workflow. |
| Source files | `Commissions.tsx`, `CommunicationHub.tsx`, status helpers. |
| Target files | `src/features/commissions`, `src/features/communication`. |
| Preserve | Defer payout and bulk generation mutations. |
| Port/adapt/discard | Adapt list/status UI; block financial writes. |
| Schema assumptions | commissions, outgoingNotifications. |
| Permission assumptions | Admin/finance. |
| Risks | Payout side effects. |
| Tests | Service mapping and permission tests. |
| Validation | Full baseline suite. |
| Acceptance | Read-only lists and safe status updates only if authorized. |
| Rollback | Remove features. |
| Blocks demo | No. |
| Complexity | MEDIUM/HIGH |

## PR 9 - General Ledger and Accounting read-only expansion

| Field | Plan |
| --- | --- |
| Objective | Replace accounting placeholder with read-only accounting/ledger views. |
| Source files | `Accounting.tsx`, `GeneralLedger.tsx`, `accountingService.ts`. |
| Target files | `src/features/accounting/*`. |
| Preserve | No manual vouchers or exports until read-only stable. |
| Port/adapt/discard | Merge pure calculations; adapt UI. |
| Schema assumptions | accounts, accountBalances, journalEntries plus source tables. |
| Permission assumptions | Finance/admin. |
| Risks | Schema mismatch and financial correctness. |
| Tests | Pure calculation tests and page state tests. |
| Validation | Full baseline suite. |
| Acceptance | Accounting route is no longer placeholder and performs no writes. |
| Rollback | Restore placeholder route. |
| Blocks demo | No, unless accounting is explicitly promised. |
| Complexity | HIGH |

## PR 10 - Advanced financial writes after schema verification

| Field | Plan |
| --- | --- |
| Objective | Consider manual vouchers, commission payout, deposits, owner settlements, document/payment writes. |
| Source files | Financials/accounting/commissions historical services. |
| Target files | Existing financial/accounting feature services. |
| Preserve | Current tested payments/receipts. |
| Port/adapt/discard | Adapt one write at a time. |
| Schema assumptions | Must be verified and tested. |
| Permission assumptions | Finance/admin plus audit logging. |
| Risks | Highest financial risk. |
| Tests | Unit, integration, rollback/audit tests. |
| Validation | Full suite plus targeted write tests. |
| Acceptance | Each write is idempotent/validated/audited. |
| Rollback | Feature flag or remove mutation path. |
| Blocks demo | No. |
| Complexity | HIGH |

## PR 11 - Smart Assistant evaluation

| Field | Plan |
| --- | --- |
| Objective | Decide whether to reimplement assistant under current data/privacy model. |
| Source files | `SmartAssistant.tsx`, `geminiService.ts`. |
| Target files | Future `src/features/assistant`. |
| Preserve | No broad data exposure or client-side secret assumptions. |
| Port/adapt/discard | Reference old UX; reimplement service. |
| Schema assumptions | Depends on approved context scope. |
| Permission assumptions | Explicit assistant permission. |
| Risks | Data/privacy/key leakage. |
| Tests | Prompt/data-scope tests if implemented. |
| Validation | Full suite plus security review. |
| Acceptance | Explicitly approved design. |
| Rollback | Remove feature flag/route. |
| Blocks demo | No. |
| Complexity | HIGH |

## PR 12 - Optimization and dependency cleanup

| Field | Plan |
| --- | --- |
| Objective | Remove duplication introduced by selective ports and improve bundle/test boundaries. |
| Source files | Current changed features only. |
| Target files | Shared utilities only when justified. |
| Preserve | Runtime shell and configs. |
| Port/adapt/discard | Remove unused adapters/components. |
| Schema assumptions | None. |
| Permission assumptions | None. |
| Risks | Cosmetic cleanup creep. |
| Tests | Full baseline suite. |
| Validation | Typecheck/lint/test/build. |
| Acceptance | No behavioral change except cleanup. |
| Rollback | Revert cleanup. |
| Blocks demo | No. |
| Complexity | MEDIUM |

