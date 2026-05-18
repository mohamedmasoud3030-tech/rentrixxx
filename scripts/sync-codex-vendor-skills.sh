#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR_DIR="$ROOT_DIR/.codex/vendor"
TMP_DIR="${TMPDIR:-/tmp}/rentrix-codex-vendor-sync-$$"

OPENAI_REPO="https://github.com/openai/plugins.git"
OPENAI_COMMIT="dc902811491b3a724672e19dec103da57b4880e5"
OPENAI_PATH="plugins/build-web-apps"

ANTHROPIC_REPO="https://github.com/anthropics/skills.git"
ANTHROPIC_COMMIT="6a5bb06904ab164a345e41c381fc9097954b83da"
ANTHROPIC_PATH="skills"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$TMP_DIR" "$VENDOR_DIR"

sync_tree() {
  local repo="$1"
  local commit="$2"
  local source_path="$3"
  local dest_path="$4"
  local worktree="$TMP_DIR/worktree"

  rm -rf "$worktree"
  git clone --filter=blob:none --no-checkout "$repo" "$worktree"
  git -C "$worktree" sparse-checkout init --cone
  git -C "$worktree" sparse-checkout set "$source_path"
  git -C "$worktree" checkout "$commit"

  rm -rf "$dest_path"
  mkdir -p "$(dirname "$dest_path")"
  cp -a "$worktree/$source_path" "$dest_path"
}

sync_tree "$OPENAI_REPO" "$OPENAI_COMMIT" "$OPENAI_PATH" "$VENDOR_DIR/openai-build-web-apps"
sync_tree "$ANTHROPIC_REPO" "$ANTHROPIC_COMMIT" "$ANTHROPIC_PATH" "$VENDOR_DIR/anthropic-skills/skills"

cat > "$VENDOR_DIR/source-lock.json" <<'JSON'
{
  "sources": [
    {
      "name": "openai-build-web-apps",
      "repository": "https://github.com/openai/plugins",
      "commit": "dc902811491b3a724672e19dec103da57b4880e5",
      "upstreamPath": "plugins/build-web-apps",
      "localPath": ".codex/vendor/openai-build-web-apps",
      "policy": "mirror upstream files without editing; put Rentrix-specific guidance in AGENTS.md or docs only"
    },
    {
      "name": "anthropic-agent-skills",
      "repository": "https://github.com/anthropics/skills",
      "commit": "6a5bb06904ab164a345e41c381fc9097954b83da",
      "upstreamPath": "skills",
      "localPath": ".codex/vendor/anthropic-skills/skills",
      "policy": "mirror upstream files without editing; preserve upstream marketplace grouping and licenses"
    }
  ]
}
JSON

echo "Synced Codex vendor skills into $VENDOR_DIR"
