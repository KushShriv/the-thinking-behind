#!/bin/sh
# Serves the page on this machine only. Usage: ./serve.sh [port]
PORT="${1:-4827}"
cd "$(dirname "$0")" || exit 1
echo "Scoreboard: http://localhost:$PORT"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
