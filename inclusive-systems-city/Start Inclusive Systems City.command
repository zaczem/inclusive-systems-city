#!/bin/bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8000

while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://localhost:$PORT/index.html"

echo "Launching Inclusive Systems City from: $APP_DIR"
echo "Starting local server at: $URL"
echo "Keep this terminal window open while the app is running."
echo "Press Ctrl+C here to stop the server."

(
  sleep 1
  open "$URL"
) &

cd "$APP_DIR"
PORT="$PORT" python3 server.py
