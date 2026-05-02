# Developer Utilities Skill

## Goal
Provide reusable utility prompts/checklists for development-time audits.

## Utilities
- Architectural drift checklist
- Boundary violation checklist
- Safe commit checklist

## Safe Commit Checklist
- [ ] No direct UI imports of low-level data/client modules
- [ ] Single client path preserved
- [ ] Typecheck/lint/build passing
- [ ] Changes are non-intrusive to production runtime
