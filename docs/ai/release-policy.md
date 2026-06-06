# Rentrix Release Policy

Use this policy before declaring a Rentrix change ready to merge.

## Scope gate

- The change is bounded to the approved objective.
- No SaaS multi-tenancy, accounting-ledger wiring, or unrelated feature work was introduced.
- Active routes do not gain unfinished placeholders or dead navigation.

## Domain gate

- Re-check the affected rules in `domain-rules.md`.
- Preserve unit occupancy exclusivity when changing contracts.
- Preserve the single canonical balance path when changing invoices, payments, receipts, arrears, reports, or exports.
- Prevent orphan records through UI, services, migrations, imports, and RLS behavior.
- Keep posted-payment correction behavior explicit and auditable.

## Database and security gate

- Review every changed migration, RLS policy, auth boundary, environment variable, and storage policy.
- Keep migrations versioned, conservative, and reviewable.
- Do not commit secrets, service-role keys, production data, or generated local caches.

## UI gate

- Check Arabic RTL on affected pages.
- Check English LTR behavior.
- Check mobile layout.
- Confirm PWA behavior is not regressed.

## Verification gate

For runtime changes run:

```bash
pnpm --filter ./artifacts/rentrix run typecheck
pnpm --filter ./artifacts/rentrix run lint
pnpm --filter ./artifacts/rentrix run test
pnpm --filter ./artifacts/rentrix run build
```

For database changes, also run the approved local Supabase validation flow when available.

## Completion report

State the objective, exact files changed, behavior changed, tests run, failed checks or blockers, migration impact, final diff review notes, and commit SHA.