#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${1:-$SCRIPT_DIR/extracted}"
ARCHIVE_PATH="$SCRIPT_DIR/erpnext-engine-recovery-curated.zip"
EXPECTED_SHA256="6f1121d291795255fc01be85781ecf3ffcee89d7ab2f862fa7a8e1a97fafec7d"
cat "$SCRIPT_DIR"/erpnext-engine-recovery-curated.zip.b64.part-* | base64 --decode > "$ARCHIVE_PATH"
ACTUAL_SHA256="$(sha256sum "$ARCHIVE_PATH" | awk '{print $1}')"
if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
  echo "Checksum mismatch: expected $EXPECTED_SHA256, got $ACTUAL_SHA256" >&2
  exit 1
fi
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
unzip -q "$ARCHIVE_PATH" -d "$OUTPUT_DIR"
echo "Extracted curated reference package to: $OUTPUT_DIR"
