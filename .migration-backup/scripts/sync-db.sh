#!/usr/bin/env bash
set -euo pipefail

echo "Starting Supabase schema sync..."

supabase db pull
supabase db diff > migration.sql

if [[ "${1:-}" == "--new-migration" ]]; then
  migration_name="${2:-auto-sync}"
  supabase migration new "$migration_name"
fi

echo "Supabase schema sync completed successfully."
