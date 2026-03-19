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

find_browser() {
  local candidates=(
    "/Applications/Google Chrome.app"
    "/Applications/Google Chrome Canary.app"
    "/Applications/Microsoft Edge.app"
    "/Applications/Chromium.app"
    "/Applications/Electron.app"
  )

  local app
  for app in "${candidates[@]}"; do
    if [[ -d "$app" ]]; then
      echo "$app"
      return 0
    fi
  done
  return 1
}

browser_binary() {
  local app_path="$1"
  local app_name
  app_name="$(basename "$app_path" .app)"
  echo "$app_path/Contents/MacOS/$app_name"
}

PORT="$(find_port)"
if [[ -z "${PORT:-}" ]]; then
  echo "Δεν βρέθηκε διαθέσιμο port για τον local server."
  read -r "?Πάτησε Enter για κλείσιμο..."
  exit 1
fi

BROWSER_APP="$(find_browser || true)"
if [[ -z "${BROWSER_APP:-}" ]]; then
  echo "Δεν βρέθηκε Chrome / Chromium / Edge / Electron στο /Applications."
  read -r "?Πάτησε Enter για κλείσιμο..."
  exit 1
fi

BROWSER_BIN="$(browser_binary "$BROWSER_APP")"
if [[ ! -x "$BROWSER_BIN" ]]; then
  echo "Δεν βρέθηκε executable browser binary:"
  echo "$BROWSER_BIN"
  read -r "?Πάτησε Enter για κλείσιμο..."
  exit 1
fi

APP_URL="http://127.0.0.1:${PORT}/index.html"
DEBUG_PORT="9222"
DEVTOOLS_LIST_URL="http://127.0.0.1:${DEBUG_PORT}/json/list"
PROFILE_DIR="$(mktemp -d /tmp/barrier-breaker-cdp-profile.XXXXXX)"

cleanup() {
  rm -rf "$PROFILE_DIR"
}
trap cleanup EXIT

echo "Barrier Breaker: Forensic Mode"
echo "App folder: $APP_DIR"
echo "App URL: $APP_URL"
echo "Browser: $BROWSER_APP"
echo "Browser binary: $BROWSER_BIN"
echo "Remote debugging port: $DEBUG_PORT"
echo "DevTools endpoint: $DEVTOOLS_LIST_URL"
echo ""
echo "Starting local server..."
PORT="$PORT" python3 server.py &
SERVER_PID=$!

sleep 1

echo "Launching browser in debug mode..."
"$BROWSER_BIN" \
  --remote-debugging-port="$DEBUG_PORT" \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --new-window \
  "$APP_URL" >/dev/null 2>&1 &

sleep 2

echo ""
echo "DevTools endpoint:"
echo "$DEVTOOLS_LIST_URL"
echo ""
echo "If the browser started correctly, you can also open:"
echo "  $DEVTOOLS_LIST_URL"
echo ""

if command -v curl >/dev/null 2>&1; then
  echo "Current CDP targets:"
  curl -s "$DEVTOOLS_LIST_URL" || true
  echo ""
fi

echo "To stop the local server, press Ctrl+C"
echo ""

wait "$SERVER_PID"
