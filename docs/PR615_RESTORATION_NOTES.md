# PR 615 Restoration Notes

Date: 2026-05-24

PR 615 adds 22 legacy page files. It should be used as a UX reference, not merged wholesale.

## Files reviewed

- Accounting.tsx
- AuditLog.tsx
- ChangePassword.tsx
- Commissions.tsx
- CommunicationHub.tsx
- Contracts.tsx
- Dashboard.tsx
- DataIntegrityAudit.tsx
- Finance.tsx
- Financials.tsx
- GeneralLedger.tsx
- Invoices.tsx
- Lands.tsx
- Leads.tsx
- Login.tsx
- Maintenance.tsx
- OwnerView.tsx
- OwnersHub.tsx
- PropertyMap.tsx
- Reports.tsx
- SmartAssistant.tsx
- System.tsx

## Why not merge directly

The legacy files depend on old routing, old context state, and old UI imports. The current app must remain based on TanStack Router, Supabase services, React Query, and the current schema.

## Safe restoration order

1. Shared UI and visual patterns.
2. Mobile layout and navigation ideas.
3. Search, filters, and export UI patterns.
4. Dedicated invoices UX.
5. Contracts UX improvements.
6. Settings tabs.

## Deferred areas

Accounting, general ledger, commissions, owner statements, final settlement logic, WhatsApp backend behavior, assistant backend behavior, and data repair actions remain deferred until their schemas and security rules are explicitly defined.

## Next code step

Start with a small Batch 1 PR that improves existing shared UI primitives only. Do not add routes or backend wiring in that PR.
