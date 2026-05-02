# ADR: Error Handling Strategy

- **Status**: Accepted
- **Date**: 2026-05-02

## Context
Inconsistent error propagation can create brittle UI and poor debuggability.

## Decision
Use a **typed error pipeline**:
- Services throw normalized error objects (code, message, retriable).
- Hooks classify errors into recoverable vs blocking states.
- Contexts expose stable error shape for components.
- UI renders user-safe messages and optional retry actions.

## Consequences
- Consistent UX and logging semantics.
- Requires disciplined mapping at service boundaries.
