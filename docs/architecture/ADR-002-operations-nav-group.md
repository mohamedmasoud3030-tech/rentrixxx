# ADR-002: Operations as a Navigation Group

## Status
Accepted

## Date
2025

## Context
"Operations" groups the daily operational modules (Maintenance + Tenants) 
in the sidebar for logical discoverability. There is no dedicated 
Operations landing page because each sub-module is sufficient on its own.

## Decision
"Operations" is a sidebar navigation group only, 
not a feature module with its own route or page.

## Consequences
**Positive:**
- Logical grouping without an empty or redundant landing page.
- Sidebar structure matches daily user mental model.

**Negative:**
- Searching for an "Operations page" finds nothing — 
  the group is invisible in the route map.

## Rules
- Do NOT restructure the group without updating this ADR.
- If a dedicated Operations dashboard is needed in future, 
  create src/pages/operations/OperationsDashboard.tsx 
  and add route /operations — do not change the group structure.
