# Wave 1A — Contract Integrity Reconciliation

## Scope

Repository reconciliation for contract integrity on top of `main` after PR #793 and the later hardening commits already present on `main`.

No Supabase migration was applied. No production data was mutated. No live Supabase or Vercel setting was changed.

## Repository evidence reviewed

- `artifacts/rentrix/src/features/contracts/ContractFormPage.tsx`
- `artifacts/rentrix/src/features/contracts/contract-unit-options.ts`
- `artifacts/rentrix/src/features/contracts/contract-unit-options.test.ts`
- `artifacts/rentrix/src/features/contracts/contractSchema.ts`
- `artifacts/rentrix/src/features/contracts/services/contractService.ts`
- `artifacts/rentrix/src/features/contracts/services/contractService.test.ts`
- `supabase/migrations/20260603094500_normalize_units_status_contract.sql`
- `supabase/migrations/20260606213000_harden_contract_invariants.sql`

## Reconciled state

The repository already contains the database-boundary hardening required for the constrained beta:

- `units.status` canonicalization to `available | occupied | maintenance | reserved`.
- `units.status` non-null/default enforcement after fail-closed prechecks.
- contract property, unit, tenant, start date, and end date presence enforcement.
- selected unit must belong to the selected property.
- valid ISO date windows.
- active-contract overlap prevention for create, update, and renewal inserts.
- per-unit advisory transaction locking to close concurrent overlap races.
- browser execution revocation for the internal validation trigger function.

The frontend already limits contract selection to units belonging to the chosen property and blocks non-available units except the currently linked unit during editing.

## Narrow code correction in this PR

`contractSchema.ts` previously checked only that date strings were non-empty and ordered lexically. The database migration is stricter: it requires actual ISO `YYYY-MM-DD` calendar dates. The frontend schema now rejects malformed and impossible dates before they reach Supabase.

The existing unit-option integrity test and the new date-schema test are now part of the standard app test command.

## Verification boundary

The normal runtime gate is configured in GitHub Actions:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter ./artifacts/rentrix run typecheck:test
pnpm --filter ./artifacts/rentrix test
pnpm --filter ./artifacts/rentrix run test:financials
```

Local execution is blocked in the current connector-only session because direct repository checkout cannot resolve `github.com`. GitHub Actions is the verification source for this PR.

## Live rollout boundary

The intended live Supabase project is operator-confirmed as:

- project name: `RENTRIX EGY (live)`
- project ref: `nnggcnpcuomwfuupupwg`

Do not apply any repository migration to that project from this PR. Preview-branch validation and an explicit reviewed rollout step remain required.

The prohibited project is:

- project name: `rentrix (V2)`
- project ref: `ktmizdznbdwvalmmfvfc`
