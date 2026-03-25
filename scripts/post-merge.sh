  #!/bin/bash
set -e

echo "==> Running post-merge setup for Rentrix..."

echo "==> Installing npm dependencies..."
npm install --no-audit --no-fund --prefer-offline 2>&1 || npm install --no-audit --no-fund

echo "==> Post-merge setup complete."
