# System Audit Report (GitNexus-Style)

Date: 2026-04-27
Repository: rentrixxx

## System Overview

### Architecture map (cross-module)
- **UI shell**: `src/index.tsx` bootstraps `AppProvider` + router, and wires global error tracking.
- **Routing + feature composition**: `src/App.tsx` lazy-loads feature pages and capability guards.
- **State and orchestration center**: `src/hooks/useAppCoreImpl.tsx` acts as a mega-provider for auth, operations, finance, notifications, governance, backup, and snapshot behavior.
- **Data access layer A (legacy monolith)**: `src/services/supabaseDataService.ts` performs table name translation, camel/snake transforms, CRUD and pagination.
- **Data access layer B (new modular services)**: `src/services/*/{...Service.ts}` modules use `src/services/api/supabaseClient.ts`.
- **Infra clients**: Two distinct Supabase client entry points exist (`src/services/supabase.ts` and `src/services/api/supabaseClient.ts`).
- **Backend runtime**: Supabase Edge Functions in `supabase/functions/*` (automation, admin user creation, owner token, public API) plus large migration history in `supabase/migrations/*`.

### Dependency graph (mental model)
1. `index.tsx` -> `AppProvider` -> `useAppCoreImpl.tsx` -> `supabaseDataService.ts` + selected domain services.
2. UI pages consume context (`useApp`) and legacy services (`src/services/financeService.ts`, `src/services/operationsService.ts`).
3. Parallel path: modular service files (e.g., `src/services/contracts/contractService.ts`) depend on `api/supabaseClient.ts`, but are only partially integrated into live routes.
4. Edge functions are invoked from `src/services/edgeFunctions.ts` and automation logic from `src/services/automationService.ts`.
5. Database schema behavior is governed by migrations and RPCs; frontend assumes camelCase while SQL surfaces snake_case.

## Correct Parts (GOOD)

1. **Security-first backend direction is present**
   - Edge functions centralize privileged operations (`admin-create-user`, `automation-scheduler`, `public-api`).
   - Public API explicitly enforces scope checks and request-id idempotency behavior.
2. **Route-level capability gates exist in the app shell**
   - Financial and admin-only modules are wrapped in capability checks and protected route components.
3. **Data shape translation exists at the data boundary**
   - `supabaseDataService` has explicit maps for table names and special field conversions, reducing direct snake_case leakage into UI.
4. **Observability hooks are in place**
   - Global error and unhandled rejection listeners in `index.tsx` and structured logging/error tracker service integration.

## Issues Found

## BAD (wrong / risky)

### 1) Dual service architectures are running in parallel
- Legacy service layer (`src/services/supabase.ts`, `src/services/supabaseDataService.ts`, `src/services/financeService.ts`) and modular service layer (`src/services/api/supabaseClient.ts` + domain subfolders) coexist without one authoritative path.
- This introduces inconsistent behavior, validation, and auth/session assumptions across modules.

### 2) Duplicate Supabase client factories
- `src/services/supabase.ts` and `src/services/api/supabaseClient.ts` implement nearly identical singleton clients independently.
- Multiple client entry points create lifecycle drift risk (auth listeners, headers, tracing, retries, and future config changes may diverge).

### 3) App provider is a critical monolith (God module)
- `useAppCoreImpl.tsx` is 1689 lines and owns unrelated concerns: auth, financial posting, governance, notifications, backups, and orchestration.
- This creates high blast radius for every change and increases regression probability.

### 4) Business logic duplication inside same provider
- `runManualAutomation` and `generateNotifications` are implemented twice (once in operations context value and again in app context value), with slight behavioral differences in message calculations.
- Duplication will drift and produce inconsistent runtime outcomes depending on consumer context.

### 5) Type safety controls are intentionally weakened
- Root tsconfig sets `strict: true` but disables `strictNullChecks` and unused checks; this suppresses many class-A runtime defects.
- Type-check config includes non-existent paths and checks only a tiny subset of source, so architectural breakage can pass CI.

## MISSING (inconsistent / absent)

### 6) No single enforced dependency direction
- Current graph permits UI/components to depend directly on mixed service layers.
- No hard boundaries enforce: UI -> use-cases -> repository/data adapter.

### 7) Inactive/alternate feature path left in tree
- `src/features/auth/LoginPage.tsx` is a standalone auth path not wired into app routing (which uses `src/ui/Login.tsx`).
- This indicates partial migration and stale code path risk.

### 8) Cache strategy placeholder is inconsistent with intent
- `supabaseDataService` declares a cache with `CACHE_TTL = 0` (effectively disabled), while still retaining cache machinery and cleanup logic.
- This adds complexity without production benefit and can mislead maintainers about consistency guarantees.

## Risk Analysis

### P0 (critical)
1. **Inconsistent financial/automation behavior due to duplicated execution paths**.
2. **Architecture split-brain between legacy and modular services causing unpredictable data contract behavior**.
3. **Large provider blast radius increasing probability of silent regressions in auth/finance/governance coupling**.

### P1 (high)
1. **Weak typecheck surface allows integration errors to merge**.
2. **Duplicate Supabase client initialization creates long-term infra drift risk**.
3. **Stale modules increase accidental import/use risk during future work**.

### P2 (medium)
1. **Dead cache scaffolding increases cognitive load**.
2. **Minor route/legacy alias dependence can hide incorrect link generation until aliases are removed**.

## Required Fixes (ordered)

### P0
1. **Choose one service architecture and enforce it**
   - Define canonical dependency flow (recommended: UI -> hooks/use-cases -> modular services -> one Supabase client).
   - Freeze legacy layer with deprecation markers, then migrate modules incrementally.
2. **Split `useAppCoreImpl.tsx` into bounded contexts**
   - Extract auth, finance, operations, and notifications into isolated hooks/providers.
   - Keep orchestrator thin and compositional.
3. **Remove duplicated business logic methods**
   - Implement `runManualAutomation` and `generateNotifications` once and reuse references in all context values.

### P1
4. **Unify Supabase client source**
   - Keep exactly one client module (prefer `src/services/api/supabaseClient.ts`), re-export from old path only during transition.
5. **Harden type checking policy**
   - Enable `strictNullChecks`.
   - Expand `tsconfig.typecheck.json` include set to all production TS/TSX.
   - Remove nonexistent include entries and enforce in CI.
6. **Delete or quarantine stale feature modules**
   - Remove `src/features/auth/LoginPage.tsx` if unused, or wire it through routing with tests.

### P2
7. **Either remove cache code or implement real cache policy**
   - If consistency-first, delete cache structure entirely.
   - If performance-first, set non-zero TTL with explicit invalidation strategy.
8. **Normalize route generation to canonical financial base (`/financial/*`)**
   - Keep legacy aliases only as external compatibility layer with sunset plan.

