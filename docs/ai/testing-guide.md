# Rentrix Testing Guide

Tests should protect business behavior, not only rendered pages.

## Expectations

- Add a focused regression test for bug fixes when practical.
- Add business-rule tests when contract, invoice, payment, receipt, balance, arrears, or expense behavior changes.
- Check Arabic RTL and English LTR behavior for changed user-facing pages.
- Check responsive behavior for changed operational pages.

## Verification

For runtime changes run:

```bash
pnpm --filter ./artifacts/rentrix run typecheck
pnpm --filter ./artifacts/rentrix run lint
pnpm --filter ./artifacts/rentrix run test
pnpm --filter ./artifacts/rentrix run build
```

Use targeted tests during implementation, then run the relevant full gate before handoff. Report every command with its actual result.