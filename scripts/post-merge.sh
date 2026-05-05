#!/bin/bash
set -e

pnpm install --frozen-lockfile
pnpm --filter db push

# Re-wire the git remote to use the PAT for authenticated pushes.
# GH_PAT must be stored as a Replit secret.
if [ -n "$GH_PAT" ]; then
  git remote set-url origin "https://${GH_PAT}@github.com/mohamedmasoud3030-tech/rentrixxx.git" 2>/dev/null || \
  git remote add origin "https://${GH_PAT}@github.com/mohamedmasoud3030-tech/rentrixxx.git"
fi
