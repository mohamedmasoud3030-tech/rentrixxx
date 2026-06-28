#!/usr/bin/env bash
# Local Arena-agent bootstrap for the Rentrix Supabase project.
# This script is safe to commit: it never contains or prints credentials.

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-nnggcnpcuomwfuupupwg}"
ENV_FILE="${SUPABASE_ARENA_ENV_FILE:-supabase/.arena.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Node.js/npx is required to run the Supabase CLI." >&2
  exit 1
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  cat >&2 <<'EOF'
Supabase management authentication is not available in this workspace.

Use a local-only authentication method, then rerun this script:

1. Interactive CLI login:
   npx supabase@latest login
   Complete the browser or token prompt shown by the CLI.

2. Local credential file:
   Create supabase/.arena.env in this workspace only and supply the CLI
   credentials there. The file must never be committed, logged, or pasted into chat.

EOF
  exit 2
fi

export SUPABASE_ACCESS_TOKEN

# Prove that the current CLI identity can reach Supabase before writing local link state.
npx supabase@latest projects list >/dev/null

link_args=(link --project-ref "$PROJECT_REF")
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  link_args+=(--password "$SUPABASE_DB_PASSWORD")
fi

npx supabase@latest "${link_args[@]}"

echo "Supabase CLI is linked locally to project: $PROJECT_REF"
echo "No database migration or data change was executed by this script."
