# ADR: State Management Strategy

- **Status**: Accepted
- **Date**: 2026-05-02

## Context
The application needs shared UI state with predictable updates while keeping side effects isolated.

## Decision
Use **Context + custom hooks**:
- Contexts provide domain state/actions to component trees.
- Hooks encapsulate async orchestration and state transitions.
- Services remain stateless and unaware of UI concerns.

## Consequences
- Clear dependency flow and easier testing of orchestration logic.
- Slight boilerplate increase per module (context + hook + service split).
