# Operational Core Stabilization Report

Recorded on: 2026-06-05

## Branch and baseline

- Working branch: `stabilize/complete-operational-core`.
- Starting baseline SHA: `0516f78fd233bdc9a30b79a8348c7207c17fad5e`.
- Baseline branch before stabilization: `work`.
- Local stabilization branch was created successfully from the verified workspace HEAD.
- No remote, PR merge, production mutation, Supabase SQL, migration, RLS change, RPC grant change, seed data, legacy app architecture, React Router replacement, Smart Assistant, Property Map, General Ledger, journal entries, accounting-grade P&L, balance sheet, owner settlement, commission settlement, external communication send, or speculative live CRM read was added.

## Commits created

- `1eddc2b fix(contracts): harden controlled contract flows`.
- `05a254d fix(financials): reconcile operational finance consistency`.
- `c8fc7a5 fix(ops): harden maintenance and persisted settings`.
- `7906c40 test(routes): enforce route and navigation parity`.
- `ac6a96e docs(stabilization): add beta-readiness evidence`.
- A final `docs(stabilization): finalize beta-readiness evidence` commit updates this report after the evidence commit exists.

## Phase outcomes

| Phase | Files changed | Defects found | Defects fixed | Tests added or updated |
| --- | --- | --- | --- | --- |
| Contracts controlled-flow hardening | `ContractFormPage.tsx`, `contract-unit-options.ts`, `contract-unit-options.test.ts`, `ContractDetailPage.test.tsx` | Selected unit state could be treated as the edit-linked unit, allowing a crafted unavailable unit state to pass the UI helper boundary; submit path did not independently verify unit/property option consistency. A detail-page test expected stale termination copy. | Submit path now rejects units outside the selected property option set and unavailable units except the currently linked edit unit. Edit hydration keeps the linked unit selectable. Test expectation now matches current termination/edit boundary. | Added unit/property consistency, unavailable-unit rejection, and edit-linked hydration helper tests. |
| Operational finance consistency | `reports-page.tsx`, `reports-page.test.ts` | CSV export JSON-quoted strings but did not neutralize spreadsheet formulas beginning with `=`, `+`, `-`, or `@`. | CSV string export now prefixes formula-like values with an apostrophe before CSV quoting. | Added CSV formula neutralization tests. |
| Maintenance and settings hardening | `maintenance-service.ts`, `use-maintenance.ts`, `maintenance-service.test.ts` | Maintenance service caught failures and returned empty/null-like successes, which could make load failures render as legitimate empty states or mutation failures report success. | Maintenance list/create/update now throw errors to React Query; create mutation has an error toast; terminal status updates still set `resolved_at`. | Added service tests for list failure visibility, create failure visibility, and terminal/non-terminal `resolved_at` payload behavior. |
| Route/navigation parity | `app-nav-items.test.ts` | No automated guard existed to keep nav links, quick links, guarded permissions, intentionally unavailable module routes, and invalid-route fallback aligned with routeTree. | Added static route/nav parity coverage. | Added four route/nav parity tests. |
| Documentation and beta evidence | `11-route-smoke-matrix.md`, `12-operational-core-report.md`, `13-blocked-followups.md` | Blockers and route/browser limitations needed one consolidated register for manual PR review. | Added beta-readiness evidence and blocker register. | Documentation only. |

## Validation evidence

Baseline and each code phase ran the requested validation chain successfully unless noted as targeted evidence outside the default package script:

- `pnpm install --frozen-lockfile`: pass; repeated non-fatal warnings about ignored `core-js`/`esbuild` build scripts and Node `url.parse()` deprecation.
- `pnpm --filter ./artifacts/rentrix run typecheck`: pass.
- `pnpm --filter ./artifacts/rentrix run lint`: pass.
- `pnpm --filter ./artifacts/rentrix run typecheck:test`: pass.
- `pnpm --filter ./artifacts/rentrix test`: pass, 14 files / 93 tests.
- `pnpm --filter ./artifacts/rentrix run test:financials`: pass, 15 files / 56 tests.
- `pnpm --filter ./artifacts/rentrix run build`: pass, Vite build plus PWA generation.
- `pnpm typecheck`: pass.
- `pnpm lint`: pass.
- `pnpm build`: pass, recursive workspace build.
- `git diff --check`: pass.
- Targeted `pnpm --filter ./artifacts/rentrix exec vitest run --config vite.config.ts src/features/contracts/contract-unit-options.test.ts src/features/contracts/ContractsListPage.test.tsx src/features/contracts/ContractDetailPage.test.tsx src/features/contracts/services/contractService.test.ts`: pass, 4 files / 14 tests.
- Targeted `pnpm --filter ./artifacts/rentrix exec vitest run --config vite.config.ts src/features/reports/reports-page.test.ts src/features/financials/reports/financialReportsService.test.ts src/features/financials/payments/usePayments.test.ts src/features/financials/payments/paymentService.test.ts src/features/financials/receipts/receiptService.test.ts src/features/financials/invoices/invoiceService.test.ts src/features/financials/expenses/expenses-page.test.ts`: pass, 7 files / 37 tests.
- Targeted `pnpm --filter ./artifacts/rentrix exec vitest run --config vite.config.ts src/features/maintenance/maintenance-service.test.ts src/features/maintenance/maintenance-helpers.test.ts src/features/maintenance/maintenance-page.test.tsx src/features/settings/settingsForm.test.ts src/features/settings/companySettingsService.test.ts src/features/settings/useCompanySettings.test.ts src/features/auth/change-password-page.test.ts`: pass, 7 files / 29 tests.
- Targeted `pnpm --filter ./artifacts/rentrix exec vitest run --config vite.config.ts src/layouts/app-nav-items.test.ts`: pass, 1 file / 4 tests.

## Browser, RTL, mobile, and PWA status

- Browser automation was not run because no local browser/playwright executable was found by `command -v chromium`, `command -v chromium-browser`, `command -v google-chrome`, or `command -v playwright`.
- No screenshots were fabricated.
- RTL/mobile evidence is static only: Arabic/RTL labels, responsive utility classes, and route/nav parity were inspected in source and tests.
- PWA generation was verified by successful Vite builds that generated `dist/public/sw.js` and `dist/public/workbox-9c191d2f.js`, but installed-app/offline behavior still requires manual browser/device QA.

## Beta-readiness assessment

- Safe frontend and service-layer operational stabilization is complete for this local branch.
- The app is ready for a manual PR review focused on the changed files and documented blockers.
- Beta should remain constrained until live schema, RPC security, production auth claims, browser/mobile RTL, receipt printing, PWA, and manual operational smoke checks are completed in the intended environment.
