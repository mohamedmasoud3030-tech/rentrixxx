# Security Baseline

## Session and token lifecycle

- Session lifetime checks are centralized in `src/infrastructure/security/sessionPolicy.ts`.
- Token refresh orchestration is centralized in `src/infrastructure/security/tokenLifecycle.ts`.
- Refresh strategy uses bounded retries with linear backoff and invalidates sessions on terminal failures.

## UI text sanitization

- UI-facing text (messages, notes, and free text) must pass through sanitization helpers in `src/infrastructure/security/sanitization.ts`.
- `sanitizeHtmlInput` is the default helper for escaping HTML characters.
- `sanitizeMultilineText` is required when rendering user-entered multiline content in HTML contexts.
- `sanitizeUiTextPayload` must be used for unknown payloads before rendering.

## Guardrails

- Never render raw user-provided strings via `innerHTML` without sanitization.
- Session refresh failures must trigger explicit invalidation (`refresh_failed` or `expired`).
- Security helpers should be imported from the infrastructure facade (`src/infrastructure/security/index.ts`) to keep behavior consistent.
