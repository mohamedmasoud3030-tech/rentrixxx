#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${1:-HEAD~30}"
COMMITS=$(git rev-list --no-merges "${BASE_REF}..HEAD" 2>/dev/null || true)

if [ -z "${COMMITS}" ]; then
  echo "No non-merge commits found in range ${BASE_REF}..HEAD"
  exit 0
fi

INVALID=0
PATTERN='^(feat|fix|chore|docs|refactor|perf|test|ci|build|revert)(\([a-z0-9._-]+\))?: .+'

for sha in ${COMMITS}; do
  subject=$(git log -1 --pretty=%s "${sha}")
  if [[ ! ${subject} =~ ${PATTERN} ]]; then
    echo "Invalid commit message: ${sha} => ${subject}"
    INVALID=1
  fi
done

if [ "${INVALID}" -eq 1 ]; then
  echo "Commit message validation failed. Use Conventional Commits, e.g. fix(api): correct rpc params"
  exit 1
fi

echo "Commit messages validated successfully."
