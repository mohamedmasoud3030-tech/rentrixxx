# Blocked Follow-ups Register

Recorded on: 2026-06-05

This register includes work intentionally not implemented in the stabilization branch because it requires schema migration, live read-only verification, RPC/security review, production verification, browser/manual QA, product decisions, or advanced-feature scope.

## Requires dedicated schema migration

| Blocker | Evidence | Proposed follow-up PR |
| --- | --- | --- |
| Unit-status drift | Runtime types and UI currently canonicalize unit statuses to `available`, `occupied`, `maintenance`, and `reserved`; historical/live drift values to verify include `available`, `vacant`, `occupied`, `rented`, `maintenance`, `AVAILABLE`, `VACANT`, and `OCCUPIED`. Affected table/column: `units.status`. Affected screens/services: units list, contract unit selector, financial unit-status normalization, occupancy charts. Temporary UI behavior: normalize known safe variants and fail on unsupported values rather than counting them as available. | Read live distinct values in a dedicated read-only verification task, then migrate/normalize data and enforce canonical check constraints/types if needed. |
| Occupancy-overlap enforcement | Frontend now enforces one property/unit option selection boundary but does not prove date-overlap safety. Correct overlap prevention belongs near contract write/RPC constraints, not scattered frontend code. Affected table/columns: `contracts.unit_id`, `contracts.start_date`, `contracts.end_date`, `contracts.status`, `contracts.deleted_at`. | Add a backend constraint/RPC/transaction policy that rejects overlapping active contract windows for the same unit, with tests and RLS/security review. |
| Maintenance schema hardening | Typed `maintenance_requests` exists locally, but live schema/constraints/defaults were not verified. | Dedicated migration/verifier PR for maintenance constraints, allowed statuses, indexes, and RLS posture after read-only live schema confirmation. |

## Requires live read-only schema verification

| Blocker | Evidence | Proposed follow-up PR |
| --- | --- | --- |
| Live audit-log schema | Audit UI is recovered as read-only/safe-unavailable, but live audit table/source was not queried. | Read-only schema verification for audit source tables/views, then wire only documented columns and keep fail-closed unavailable states. |
| Lands schema | Lands page intentionally uses safe unavailable state because no verified live table/columns were used in this task. | Read-only schema verification and product mapping before any live reads. |
| Leads schema | Leads page intentionally uses safe unavailable state and no speculative live CRM reads were enabled. | Read-only schema verification and CRM lifecycle product mapping before any live reads. |
| Commissions schema | Commissions page intentionally uses safe unavailable state; no commission settlement was implemented. | Product/schema PR for read-only commissions first, settlement later as separate advanced scope. |
| Communication schema | Communication page intentionally uses safe unavailable state; no external sends or provider calls were implemented. | Read-only schema/provider verification, then separate outbound communication design/security PR. |

## Requires RPC security audit

| Blocker | Evidence | Proposed follow-up PR |
| --- | --- | --- |
| Payment RPC posture | `record_invoice_payment_atomic` is used as-is with stable payload/request id behavior; grants/security definer/search path/RLS interactions were not changed or audited here. | Dedicated RPC security review for grants, ownership, search path, idempotency guarantees, RLS behavior, and error contract. |
| Renewal RPC posture | `renew_contract_atomic` is used as-is; overlap enforcement and security posture were not modified. | Dedicated RPC security and overlap enforcement PR. |
| Governance/data-integrity RPC posture | System/governance read helpers stay fail-closed, but production RPC grants and audit safety need environment-specific review. | Dedicated production RPC/RLS/advisor audit. |

## Requires production environment verification

| Blocker | Evidence | Proposed follow-up PR or runbook task |
| --- | --- | --- |
| Production auth claims | Permissioned routes/nav use canonical permissions, but production JWT claims were not read. | Verify claims for `owners.*`, `lands.view`, `leads.view`, `commissions.view`, `communication.view`, `system.view`, `audit.view`, `integrity.view`, `auth.password.change`, and `settings.manage`. |
| Supabase env and RLS | Local tests reported incomplete Supabase environment diagnostics; no production data was touched. | Run staging/prod read-only auth/RLS smoke with non-production test account. |
| Receipt printing | Receipt route exists at `/receipts` and report links use `?receiptId=...`; print browser behavior was not tested. | Manual browser receipt lookup/print smoke. |
| PWA manual verification | Builds generated service worker files, but install/offline/cache behavior was not browser-tested. | Manual PWA install/offline/update smoke on target browsers/devices. |

## Requires browser automation or manual QA

| Blocker | Evidence | Proposed follow-up PR or QA task |
| --- | --- | --- |
| Browser automation unavailable | `command -v chromium`, `command -v chromium-browser`, `command -v google-chrome`, and `command -v playwright` returned no executable path. | Install/enable browser automation or run manual smoke on staging. |
| RTL/mobile QA | Static RTL/mobile source review only; no screenshots or viewport automation were produced. | Manual desktop/mobile RTL smoke over the route matrix, including forms, tables, dialogs, nav drawer, receipt print, and CSV exports. |
| Direct URL refresh | Static route guards and loading/error states were inspected; no browser refresh automation was available. | Browser/manual refresh smoke over protected, param, unavailable, and fallback routes. |

## Requires product decision

| Blocker | Evidence | Proposed follow-up PR |
| --- | --- | --- |
| Lands product model | Page is present but unavailable because schema/product model is not verified. | Decide land lifecycle, ownership, and reporting scope. |
| Leads product model | Page is present but unavailable because CRM stages/source are not verified. | Decide lead stages, ownership, source, and conversion rules. |
| Commissions scope | Page is present but unavailable; settlement is explicitly deferred. | Decide read-only commission visibility before settlement workflows. |
| Communication scope | Page is present but unavailable; no sends implemented. | Decide provider, templates, consent, audit, and failure model before sending. |

## Intentionally deferred advanced feature

| Deferred module | Reason |
| --- | --- |
| General Ledger, journal entries, accounting-grade P&L, balance sheet | Out of operational-core stabilization scope and requires accounting design/schema/RPC review. |
| Owner settlements and commission settlement | Requires product/accounting decisions and schema/RLS/RPC design. |
| Smart Assistant and Property Map | Explicitly deferred; not required for beta operational-core stabilization. |
| External communication sends | Requires provider, compliance, audit, retries, and opt-in model. |

