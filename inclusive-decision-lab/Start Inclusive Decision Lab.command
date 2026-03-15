#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8000

while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://localhost:$PORT"

echo "Launching Inclusive Decision Lab from: $APP_DIR"
echo "Starting local server at: $URL"
echo "Press Ctrl+C in this terminal window to stop the server."

cd "$APP_DIR"
open "$URL"
python3 -m http.server "$PORT"
