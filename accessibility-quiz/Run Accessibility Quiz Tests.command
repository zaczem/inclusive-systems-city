#!/bin/zsh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "Running Accessibility Quiz test suite..."
echo ""
if [ -d node_modules ]; then
  npx playwright test
else
  echo "node_modules is missing."
  echo "Run npm install first, then launch this test runner again."
fi

echo ""
echo "Done."
read -r "?Πάτησε Enter για κλείσιμο..."
