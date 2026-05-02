# Architecture Rules

## Cross-cutting services location

To keep service boundaries clean, any cross-cutting concern (for example logging, telemetry,
error tracking, tracing, metrics, and similar observability utilities) **must not** live under
`src/services/`.

- Place these modules in `src/infrastructure/observability/`.
- Expose shared observability utilities via a local barrel file:
  `src/infrastructure/observability/index.ts`.
- Application and domain/service code should import observability utilities from the
  infrastructure barrel (for example `@/infrastructure/observability`).

## Barrel file guideline

For heavily used modules, add `index.ts` barrel files at the folder boundary to simplify imports
and to reduce deep relative paths.

Current examples:

- `src/infrastructure/observability/index.ts`
- `src/services/index.ts`
- `src/services/documents/index.ts`
- `src/services/reports/index.ts`
- `src/services/accountingDocuments/index.ts`
