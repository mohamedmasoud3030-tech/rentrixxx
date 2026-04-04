# ADR-001: Users as a Settings Sub-Module

## Status
Accepted

## Date
2025

## Context
User management (roles, passwords, access control) is an admin-only 
concern that does not belong in the daily operational workflow. 
Placing it under /settings/users keeps the top navigation clean 
and groups it with other admin configuration concerns.

## Decision
Users is implemented as a sub-module at /settings/users, 
not as a top-level route.

## Consequences
**Positive:**
- Reduces top-navigation clutter for daily users.
- Groups all admin configuration in one place.

**Negative:**
- Users must know to look under Settings to find user management.

## Rules
- Do NOT add a top-level /users route.
- If user management grows significantly, revisit this decision 
  and update this ADR before changing the IA.
