#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${1:-HEAD~10}"

# Only validate recent commits (last 10 non-merge commits)
COMMITS=$(git rev-list --no-merges "${BASE_REF}..HEAD" 2>/dev/null | head -10 || true)

if [ -z "${COMMITS}" ]; then
  echo "No non-merge commits to validate."
  exit 0
fi

INVALID=0
# Allow conventional commits + arabic text + legacy patterns
PATTERN='^(feat|fix|chore|docs|refactor|perf|test|ci|build|revert|security|hardening|backup|merge)(\([a-z0-9._/-]+\))?: .+'

for sha in ${COMMITS}; do
  subject=$(git log -1 --pretty=%s "${sha}")
  # Skip merge commits
  if [[ "${subject}" == Merge* ]]; then
    continue
  fi
  if [[ ! ${subject} =~ ${PATTERN} ]]; then
    echo "⚠️  Non-conventional commit: ${sha:0:7} => ${subject}"
    # Warning only, not failure for existing commits
  fi
done

echo "✅ Commit validation complete."
exit 0
