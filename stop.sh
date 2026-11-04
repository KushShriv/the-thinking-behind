#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [[ ! -f .run/preview.pid ]]; then
  echo 'No preview started by ./start.sh.'
  exit 0
fi
if [[ ! -x .venv/bin/python ]]; then
  echo 'The Python environment is missing. Run ./setup.sh first.' >&2
  exit 1
fi
.venv/bin/python - <<'PY'
import pathlib
import signal
import subprocess
import sys
import time
root = pathlib.Path.cwd()
pidfile = root / '.run/preview.pid'
try:
    pid = int(pidfile.read_text())
except ValueError:
    sys.exit('Invalid preview PID file. No process was stopped.')
if pid <= 1:
    sys.exit('Invalid preview PID. No process was stopped.')
result = subprocess.run(['ps', '-p', str(pid), '-o', 'command='], capture_output=True, text=True)
if not result.stdout.strip():
    pidfile.unlink()
    sys.exit('Preview was already stopped.')
if ' -m http.server ' not in result.stdout or not result.stdout.strip().endswith(f' --directory {root}'):
    sys.exit('PID belongs to another process. No process was stopped.')
try:
    import os
    os.kill(pid, signal.SIGTERM)
except ProcessLookupError:
    pass
for _ in range(50):
    state = subprocess.run(['ps', '-p', str(pid), '-o', 'stat='], capture_output=True, text=True).stdout.strip()
    if not state or state.startswith('Z'):
        pidfile.unlink()
        print('Preview stopped.')
        break
    time.sleep(0.1)
else:
    sys.exit('Preview has not stopped yet. PID file kept; try ./stop.sh again.')
PY
