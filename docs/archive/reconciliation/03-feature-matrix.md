# 03 - Feature Coverage Matrix

The machine-readable matrix is in `03-feature-matrix.csv`. Summary by recommendation:

| Recommendation | Count | Features |
| --- | ---: | --- |
| KEEP_CURRENT | 17 | login, dashboard, properties, property details, units, owners, tenants, contracts, contract details, receipts, payments, expenses, finance, financials, maintenance, reports, system settings |
| PORT_AND_ADAPT | 12 | lands, owners hub, owner portal, accounting, general ledger, commissions, audit log, data integrity audit, communication hub, leads, change password, notifications |
| MERGE | 5 | owner details, invoices, arrears, printing, document handling |
| REIMPLEMENT_AGAINST_CURRENT_ARCHITECTURE | 1 | smart assistant |
| REFERENCE_ONLY | 2 | property map, settings submodules |

## High-signal findings

| Feature group | Finding | Recommendation |
| --- | --- | --- |
| Demo core | Login, dashboard, properties, units, owners, tenants, contracts, receipts/payments, expenses, maintenance, reports, and settings are already represented in the current runtime and validation passed. | Keep current and avoid destabilizing the shell. |
| Finance/accounting | Current financials are substantial, but accounting is a placeholder and old accounting/general-ledger pages are coupled to `useApp`, `db.accounts`, `journalEntries`, and manual voucher writes. | Port accounting read-only first after schema verification; defer writes. |
| Historical-only CRM | Lands, leads, communication hub, and commissions have useful UI but write through `dataService` and sometimes create accounting side effects. | Port later with adapters and table checks. |
| Admin/audit | AuditLog is the best low-risk read-only pilot, but old implementation also exposes snapshots/restore controls. DataIntegrityAudit includes an attachment migration action. | Start with read-only audit log and disable destructive/repair actions until explicit approval. |
| Owner portal | Owner hub and owner portal provide useful owner-facing workflows but assume React Router params and edge-function token verification. | Adapt routes and data access; do not port as-is. |
| Assistant | Historical assistant imports a shared component and Gemini service assumptions. | Reimplement against current architecture only after data exposure and key-management review. |

## Demo priority summary

| Priority | Features |
| --- | --- |
| REQUIRED | login, dashboard, properties, property details, units, owners, tenants, contracts, contract details, invoices, receipts, payments, expenses, finance, financials, maintenance, system settings |
| USEFUL | owner details, owners hub, arrears, reports, audit log, change password, printing |
| POST_DEMO | lands, owner portal, accounting, general ledger, commissions, data integrity audit, communication hub, leads, settings submodules, notifications, document handling |
| DEFER | property map, smart assistant |

