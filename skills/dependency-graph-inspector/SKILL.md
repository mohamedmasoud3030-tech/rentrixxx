# Dependency Graph Inspector Skill

## Goal
Inspect and enforce module dependency contracts.

## Rules
- UI and components must not directly call low-level client/data modules.
- Services should be the only layer interacting with database client wrappers.
- Keep a single canonical client entrypoint.

## Suggested Commands
- `rg -n "from ['\"].*services/supabase(DataService)?['\"]" src/ui src/components`
- `rg -n "from ['\"].*services/api/supabaseClient['\"]|from ['\"].*services/supabase['\"]" src`
- `python` import-edge audit scripts for dead modules and split paths.
