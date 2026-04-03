# CTO SaaS Evaluation — 2026-04-03

This report captures a technical commercialization assessment for Rentrix as a SaaS candidate.

## Scorecard (0-10)
- Architecture Quality: 5.5
- Code Quality: 5.0
- Scalability: 4.5
- Security: 4.5
- Maintainability: 4.5
- DevOps readiness: 5.0
- Production readiness: 4.5
- UI/UX readiness: 6.0
- Data model design: 4.0
- Overall readiness to sell as SaaS: 4.5

## Blocking issues
- Legacy owner portal token flow still exists in app logic and writes `owners.portalToken` from frontend path.
- Core schema file keeps broad `*_all_auth` RLS patterns in many tables, risking over-broad data access if secure migration state drifts.
- Data model relies on weak typing for critical fields (many dates as TEXT and timestamps as BIGINT), with sparse relational integrity in baseline schema.
- Frontend bundle is very large (>1.8 MB minified in a single chunk), indicating poor code splitting and potential UX degradation at scale.

## Launch-before-GA priorities
1. Eliminate legacy token model from frontend and enforce only signed/short-lived edge tokens.
2. Publish a single canonical migration chain and CI drift check to guarantee secure RLS state.
3. Refactor bounded contexts (auth, operations, finance, reporting) out of oversized modules.
4. Introduce tenant/org isolation model with explicit tenant_id columns and compound indexes.
5. Add observability SLOs, alerting, error budgets, and deployment rollback automation.
