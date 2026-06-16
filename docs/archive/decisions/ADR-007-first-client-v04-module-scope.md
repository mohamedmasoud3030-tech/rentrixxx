# ADR-007 -- First Client v0.4 Module Scope

## Context

Phase 3 of the first-client delivery plan decides which optional v0.4 modules belong in the first office rollout. The goal is to ship the Phase 1 and Phase 2 operational core first, then recover optional modules only when they match the client's actual workflow.

The currently deferred routes remain registered but hidden from constrained-beta navigation:

```text
/lands
/leads
/commissions
/communication
```

## Decision

The first client rollout will not expand day-one scope beyond the verified operational core unless client intake confirms a hard workflow requirement.

| Module | First-client decision |
| --- | --- |
| `/lands` | Keep hidden for day one unless the first client confirms they actively manage land plots in Rentrix. If confirmed, recover it through a narrow PR that verifies schema/RLS, adds focused tests, and re-exposes navigation. |
| `/leads` | Do not build for v1. It remains unavailable by design unless the first client explicitly requires lead tracking. |
| `/commissions` | Do not build for v1. It remains unavailable by design unless the first client explicitly requires commission tracking. |
| `/communication` | Do not build for v1. It remains unavailable by design unless the first client explicitly requires templated communication. |
| Owner settlements | Treat as v1.1+ unless the first client must pay owners through Rentrix rather than externally. |

## Consequences

- No deferred module is re-exposed merely because a route, page, or service exists.
- `/lands` remains the only v0.4 module with a possible fast-follow recovery path from current code, but it still requires confirmed client scope and fresh schema/RLS/test evidence.
- Lead tracking, commission tracking, outbound communication, and owner settlement workflows must not receive schema, provider, settlement, or navigation work before a documented client requirement exists.
- The first-client delivery path stays focused on the operational chain: property, unit, people, tenant, owner, contract, invoice, posted payment, receipt, expense, arrears, reports, maintenance, and governance visibility.

## Explicit Exclusions

- No general CRM expansion for v1.
- No outbound provider sends for v1.
- No owner settlement payment workflow for v1 unless elevated by the client as a hard requirement.
- No SaaS multi-tenancy, organization scoping, or accounting-grade ledger work.
