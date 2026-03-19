#!/bin/zsh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

find_port() {
  local p
  for p in 8000 8001 8002 8080 8081; do
    if ! lsof -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

PORT="$(find_port)"
if [[ -z "${PORT:-}" ]]; then
  echo "Δεν βρέθηκε διαθέσιμο port."
  read -r "?Πάτησε Enter για κλείσιμο..."
  exit 1
fi

URL="http://localhost:${PORT}/index.html"

echo "Barrier Breaker: Forensic Mode"
echo "Φάκελος: $APP_DIR"
echo "Server: $URL"
echo ""
echo "Για τερματισμό: Ctrl+C"
echo ""

open "$URL"
PORT="$PORT" python3 server.py
