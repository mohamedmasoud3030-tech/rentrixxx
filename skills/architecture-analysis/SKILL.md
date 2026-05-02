# Architecture Analysis Skill

## Goal
Perform repository-wide architecture inspection with cross-module reasoning.

## Checklist
1. Map top-level layers (`ui/components`, `hooks`, `services`, `data client`).
2. Validate dependency direction: UI -> hooks -> services -> client.
3. Detect duplicate paths (e.g., parallel service implementations).
4. Detect boundary violations (UI importing low-level data/client modules).
5. Produce GOOD/BAD/MISSING findings with P0/P1/P2 severity.

## Suggested Commands
- `rg -n "from ['\"].*services/" src/ui src/components src/hooks`
- `rg -n "createClient\(|supabase\.from\(|supabase\.rpc\(" src`
- `npm run -s type-check && npm run -s build`
