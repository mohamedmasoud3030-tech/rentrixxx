#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_ROOT="$ROOT_DIR/.codex/vendor/selected-agent-skills"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/rentrix-selected-agent-skills-sync.XXXXXX")"

SUPERPOWERS_REPO="https://github.com/obra/superpowers.git"
SUPERPOWERS_COMMIT="6fd4507659784c351abbd2bc264c7162cfd386dc"

MATT_REPO="https://github.com/mattpocock/skills.git"
MATT_COMMIT="be55a7970319ede7965edbb02b5e41cba1ca82c9"

ALMANAC_REPO="https://github.com/pjt222/agent-almanac.git"
ALMANAC_COMMIT="67e55b060fc559f9ace2768a05bfe35131f5ffc5"

mkdir -p "$DEST_ROOT"

checkout_locked_repo() {
  local name="$1"
  local repo="$2"
  local commit="$3"
  local worktree="$TMP_DIR/$name"

  git clone --filter=blob:none --no-checkout "$repo" "$worktree"
  git -C "$worktree" checkout --detach "$commit"
  printf '%s\n' "$worktree"
}

copy_additive_file() {
  local worktree="$1"
  local source_path="$2"
  local dest_root="$3"
  local source_file="$worktree/$source_path"
  local dest_file="$dest_root/$source_path"

  if [[ ! -f "$source_file" ]]; then
    printf 'Missing locked upstream file: %s\n' "$source_path" >&2
    exit 1
  fi

  if [[ -e "$dest_file" ]]; then
    if cmp -s "$source_file" "$dest_file"; then
      printf 'Already synced: %s\n' "$dest_file"
      return
    fi
    printf 'Conflict: existing file differs and was not overwritten: %s\n' "$dest_file" >&2
    exit 1
  fi

  mkdir -p "$(dirname "$dest_file")"
  cp "$source_file" "$dest_file"
}

sync_superpowers() {
  local worktree
  local dest="$DEST_ROOT/superpowers-selected"
  worktree="$(checkout_locked_repo superpowers "$SUPERPOWERS_REPO" "$SUPERPOWERS_COMMIT")"

  copy_additive_file "$worktree" LICENSE "$dest"
  copy_additive_file "$worktree" skills/verification-before-completion/SKILL.md "$dest"
  copy_additive_file "$worktree" skills/using-git-worktrees/SKILL.md "$dest"
  copy_additive_file "$worktree" skills/finishing-a-development-branch/SKILL.md "$dest"
}

sync_matt() {
  local worktree
  local dest="$DEST_ROOT/mattpocock-selected"
  worktree="$(checkout_locked_repo matt "$MATT_REPO" "$MATT_COMMIT")"

  copy_additive_file "$worktree" LICENSE "$dest"
  copy_additive_file "$worktree" skills/engineering/diagnose/SKILL.md "$dest"
  copy_additive_file "$worktree" skills/engineering/zoom-out/SKILL.md "$dest"
  copy_additive_file "$worktree" skills/productivity/handoff/SKILL.md "$dest"
  copy_additive_file "$worktree" skills/productivity/write-a-skill/SKILL.md "$dest"
}

sync_almanac() {
  local worktree
  local dest="$DEST_ROOT/agent-almanac-selected"
  worktree="$(checkout_locked_repo almanac "$ALMANAC_REPO" "$ALMANAC_COMMIT")"

  copy_additive_file "$worktree" LICENSE "$dest"
  copy_additive_file "$worktree" skills/troubleshoot-mcp-connection/SKILL.md "$dest"
}

sync_superpowers
sync_matt
sync_almanac

printf 'Synced selected agent skills into %s\n' "$DEST_ROOT"
printf 'No existing vendor files were deleted or overwritten.\n'
printf 'Temporary checkout retained at %s for inspection.\n' "$TMP_DIR"
