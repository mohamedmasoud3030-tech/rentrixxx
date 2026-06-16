# Operational Core Baseline

## Git baseline

- Recorded on: 2026-06-05
- Local branch: `stabilize/operational-core-baseline`
- Baseline SHA: `605a07c8e4d89593406c209179601526dd265e06`
- Latest local commits reviewed:
  - `605a07c fix(frontend): keep posted receipt selection payment-backed`
  - `22892de fix(crm): restore recovered Owners Hub, Lands, and Leads navigation entries (#787)`
  - `ba7aca0 feat(crm): recover owners and crm bundle (#786)`
  - `091b5da Update app-nav-items.ts`
  - `335500d feat(system): recover governance and audit bundle (#785)`

## Local repository limitations

- The requested `main` branch was not present in this clone: `git checkout main` failed with `error: pathspec 'main' did not match any file(s) known to git`.
- No Git remote is configured in this clone, so `git pull --ff-only`, GitHub PR creation, GitHub Actions status checks, Vercel checks, Sonar Quality Gate checks, review thread checks, and squash merges cannot be performed from this environment.
- Work was isolated from the current local prerequisite branch instead of a verified remote `main` branch.

## Manifest summary

- Root manifest command: `rg --files -g '!node_modules/**' -g '!**/dist/**' -g '!**/coverage/**' -g '!**/.git/**' | sort > /tmp/rentrix-root-manifest.txt`
- Root manifest entries: 810
- Depth-two inventory command: `find . -maxdepth 2 -mindepth 1 -not -path './node_modules*' | sort > /tmp/rentrix-root-depth2.txt`
- Depth-two inventory entries: 134

## Confirmed merged prerequisites in local baseline

- Authorization contract files were present: `artifacts/rentrix/src/features/auth/permissions.ts` and `artifacts/rentrix/src/features/auth/route-guards.ts`.
- System and audit bundles were present under `artifacts/rentrix/src/features/system/` and `artifacts/rentrix/src/features/audit/`.
- Owners and CRM follow-up files were present: `owners-hub-page.tsx`, `owner-detail-page.tsx`, `lands-page.tsx`, `leads-page.tsx`, `commissions-page.tsx`, and `communication-page.tsx`.
- Navigation entries were present for `/owners`, `/owners-hub`, `/lands`, `/leads`, `/commissions`, and `/communication`.
- Payment-backed receipt normalization was present in `artifacts/rentrix/src/features/financials/payments/usePayments.ts`: `ledger_receipt_id` preserves the RPC `receipt_id`, while UI-facing `receipt_id` is set to `payment_id`.

## Validation results

The complete requested local validation chain passed in this environment:

- `pnpm install --frozen-lockfile`
- `pnpm --filter ./artifacts/rentrix run typecheck`
- `pnpm --filter ./artifacts/rentrix run lint`
- `pnpm --filter ./artifacts/rentrix run typecheck:test`
- `pnpm --filter ./artifacts/rentrix test`
- `pnpm --filter ./artifacts/rentrix run test:financials`
- `pnpm --filter ./artifacts/rentrix run build`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `git diff --check`

Note: because the remote `main` branch was unavailable locally, this baseline validation was completed on the local isolated branch. The long-running validation included the Phase 1 test-only regression additions by the time the test commands executed.

## Known live-schema unknowns

- No Supabase SQL was executed.
- No production data was read or mutated.
- RLS policies, RPC grants, and database functions were not changed.
- Live unit status values, maintenance table support, and RPC security posture remain read-only verification items for a properly credentialed environment.

## Known external-check limitations

- GitHub Actions, Vercel, Sonar Quality Gate, TestSprite Pre-Check, and unresolved review-thread status cannot be verified without a configured remote/PR context.
- Browser automation evidence was not collected in this baseline phase.
