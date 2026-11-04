#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
case "$(uname -s)" in
  Darwin|Linux) ;;
  *) echo 'Supported systems: macOS and Linux.' >&2; exit 1 ;;
esac
PYTHON="${PYTHON:-python3}"
if ! command -v "$PYTHON" >/dev/null 2>&1; then
  echo 'Install Python 3.10+ with pip and venv, then run this script again.' >&2
  exit 1
fi
"$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else "Python 3.10+ is required.")'
if [[ ! -x .venv/bin/python ]]; then
  "$PYTHON" -m venv .venv || {
    echo 'Could not create .venv. On Debian/Ubuntu, install python3-venv.' >&2
    exit 1
  }
fi
.venv/bin/python -m pip install 'graphifyy==0.9.92'
# Keep assistant integration local to this repository.
PATH="$PWD/.venv/bin:$PATH" .venv/bin/graphify install --platform codex --project
.venv/bin/graphify extract . --code-only --no-cluster --max-workers 2
.venv/bin/graphify cluster-only . --no-label
if [[ ! -e sealed.js ]]; then
  printf '%s\n' 'window.TTB_SEALED = {"classic":[],"arcade":[]};' > sealed.js
fi
printf '\nSetup complete. Run ./start.sh to preview the site.\n'
