# Native Engine Recovery Source Selection

## Purpose

This document records the selected upstream ERP reference areas that may inform future native Rentrix design work. The upstream package is a reference source only and is not part of the application runtime.

## Selection summary

- Uploaded archive files: `5,558`
- Selected reference files: `58`
- Full curated archive SHA-256: `6f1121d291795255fc01be85781ecf3ffcee89d7ab2f862fa7a8e1a97fafec7d`

## Priority areas

| Priority | Area | Reference paths | Rentrix focus |
|---|---|---|---|
| P0 | Payment lifecycle | `accounts/doctype/payment_entry/*`, `accounts/doctype/payment_reconciliation/*` | Payment posting, receipt projection, correction rules, allocation safety |
| P0 | Outstanding and arrears | `accounts/report/accounts_receivable/*`, `accounts/report/accounts_receivable_summary/*`, `accounts/party.py` | Canonical balance calculation, aging, tenant and contract context |
| P0 | Reminder stages | `accounts/doctype/dunning/*` | Arrears escalation concepts |
| P1 | Maintenance scheduling | `maintenance/doctype/maintenance_schedule/*`, `maintenance/doctype/maintenance_visit/*` | Property and unit maintenance lifecycle |
| P1 | Asset maintenance | `assets/doctype/asset_maintenance/*`, `asset_maintenance_log/*`, `asset_repair/*` | Repair history and preventive maintenance concepts |
| Deferred | Ledger and journals | `accounts/general_ledger.py`, `accounts/report/general_ledger/*`, `accounts/doctype/journal_entry/*` | Future accounting design reference |
| Deferred | Inventory | `stock/*` selected paths | Future maintenance materials reference |
| Deferred | CRM | `crm/*`, `communication/*` selected paths | Future workflow reference |
| Excluded | Manufacturing | uploaded manufacturing subtree | Outside current property-operations scope |

## Rentrix product boundaries

Rentrix remains a single-office property operations system. Approved recovery work should preserve the current TanStack Router, React Query, and Supabase architecture. Accounting-grade ledger posting, journals, inventory valuation, and manufacturing remain outside the current implementation scope.
