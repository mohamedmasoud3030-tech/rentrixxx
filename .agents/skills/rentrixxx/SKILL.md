```markdown
# rentrixxx Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `rentrixxx` TypeScript codebase. It covers file naming, import/export styles, testing patterns, and provides suggested commands for common workflows. This guide is ideal for contributors aiming to maintain consistency and quality in their code contributions.

## Coding Conventions

### File Naming
- **Style:** kebab-case
- **Example:**  
  - `user-service.ts`
  - `rental-calculator.ts`

### Import Style
- **Style:** Alias imports are used for modules.
- **Example:**
  ```typescript
  import { calculateRent as calcRent } from './rental-calculator';
  ```

### Export Style
- **Style:** Named exports are preferred.
- **Example:**
  ```typescript
  // rental-calculator.ts
  export function calculateRent(params: RentParams): number { ... }
  ```

### Commit Patterns
- **Type:** Freeform messages, no strict prefixes.
- **Average Length:** ~39 characters.
- **Example:**  
  `fix rent calculation for leap years`

## Workflows

_No explicit workflows detected in the repository._

## Testing Patterns

- **Framework:** Unknown (not detected)
- **Test File Pattern:** Files named with `*.test.*`
- **Example:**
  - `user-service.test.ts`
  - `rental-calculator.test.ts`
- **Test Structure:**  
  Tests are colocated with implementation files, using the `.test.` infix.

## Commands
| Command | Purpose |
|---------|---------|
| /test   | Run all test files matching `*.test.*` |
| /lint   | Lint the codebase for style consistency |
| /build  | Build the TypeScript project |
```