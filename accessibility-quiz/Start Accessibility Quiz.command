#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3999

while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://localhost:$PORT"

echo "Launching Accessibility Quiz from: $APP_DIR"
echo "Starting static server at: $URL"
echo "Press Ctrl+C in this terminal window to stop the server."

(
  sleep 1
  open "$URL"
) &

cd "$APP_DIR"
npx serve -l "$PORT" -s .
