#!/bin/zsh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "Running Barrier Breaker test suite..."
echo ""
python3 -m unittest -v tests/test_barrier_breaker.py

echo ""
echo "Done."
read -r "?Πάτησε Enter για κλείσιμο..."
