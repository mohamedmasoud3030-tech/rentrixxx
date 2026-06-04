# 06 - Shared-Code Refactor Candidates

Only refactors that unblock selective porting or reduce concrete risk are recommended.

| Classification | Problem | Affected files | Proposed target structure | Why necessary | Before port? | Risk | Rollback | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REQUIRED_BEFORE_PORT | Historical features require `useApp`, `db`, `dataService`, and current app must not restore AppContext. | Historical UI files; target future feature services. | `src/lib/permissions.ts`; feature-local adapter/service files such as `src/features/audit/audit-log-service.ts`. | Enables read-only pilot without deprecated architecture. | Yes for AuditLog. | Low/medium. | Remove adapter/service and route. | `pnpm --filter ./artifacts/rentrix run typecheck`; `pnpm --filter ./artifacts/rentrix test`. |
| REQUIRED_BEFORE_PORT | Permission assumptions differ across current shell and historical admin pages. | `src/app/auth.tsx`, future audit/settings/account routes. | Small current permission helper with tests; no provider replacement. | Prevents hard-coded role drift during admin feature ports. | Yes for admin features. | Low. | Delete helper and tests. | `pnpm --filter ./artifacts/rentrix run typecheck:test`; targeted permission tests. |
| DO_DURING_PORT | Query keys are feature-local and historical pages have none/global context. | Future audit/owners/accounting hooks. | Co-locate `queryKeys` per feature, matching existing feature patterns. | Avoids cache invalidation inconsistencies. | During each port. | Low. | Remove feature hook. | Feature tests plus typecheck. |
| DO_DURING_PORT | Loading/empty/error states repeat when adapting pages. | Current `EmptyState`, `Skeleton`, future audit/owners pages. | Reuse existing shared components; add only missing feature-specific state wrappers. | Keeps UI consistent and avoids duplicate historical PageStates. | During each port. | Low. | Revert feature page. | Visual smoke plus typecheck/build. |
| DO_DURING_PORT | Historical pure finance/accounting helpers are mixed with context and writes. | `financeService.ts`, `accountingService.ts`, `GeneralLedger.tsx`. | Extract pure calculation helpers into feature-local modules with tests. | Allows read-only accounting without write flows. | Before accounting write features, not before AuditLog. | Medium. | Revert helper and tests. | Accounting unit tests plus full validation. |
| OPTIONAL_AFTER_DEMO | Duplicate design systems and UI primitives. | `src/components/ui`, historical `src/design-system`, historical UI primitives. | Keep runtime primitives; selectively port missing components only after demo. | Broad UI cleanup does not unblock first demo. | No. | Medium/high if broad. | Revert component imports. | Build and visual regression. |
| DO_NOT_DO | Restore React Router, AppContext, old dataService, old package manager, old CI, old Vercel, or old PWA. | Runtime shell/config. | None. | Directly violates verified canonical runtime and would destabilize passing baseline. | Never. | High. | N/A. | N/A. |

## Required pre-port refactors

1. Add a narrow current-architecture read adapter pattern for the first historical page instead of restoring `AppContext`.
2. Add/confirm a small permission mapping helper for admin-only routes before audit/data-integrity/change-password/admin settings work.

