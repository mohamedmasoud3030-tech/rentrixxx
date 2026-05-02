# Coding Standards

## Module Boundaries
- `contexts/`: global/shared state + provider composition only.
- `hooks/`: business orchestration, async handling, derived state.
- `services/`: pure I/O layer (no UI concerns).
- Forbidden dependency direction: `services -> hooks/contexts`.

## General Rules
- Keep functions small and single-purpose.
- Prefer explicit types and return contracts.
- Normalize service responses before exposing to hooks.
- Always model async with `loading/data/error` states.
- Centralize user-facing error messages.

## Error Handling Convention
- Services throw typed/domain errors.
- Hooks map errors to recoverable UI states.
- Contexts persist last-known-good state when mutation fails.

## How to add new module

### Steps
1. Create service contract and implementation in `services/<domain>.service.ts`.
2. Create orchestration hook `hooks/use<Domain>.ts`.
3. Expose state/actions in `contexts/<Domain>Context.tsx`.
4. Wire provider in app root and add tests.
5. Update docs and ADRs if architecture rules are affected.

### Unified Template
```txt
module-name/
  services/
    <domain>.service.ts
  hooks/
    use<Domain>.ts
  contexts/
    <Domain>Context.tsx
  types/
    <domain>.types.ts
  __tests__/
    <domain>.spec.ts
```
