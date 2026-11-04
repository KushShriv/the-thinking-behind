#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [[ ! -x .venv/bin/python ]]; then
  echo 'Run ./setup.sh first.' >&2
  exit 1
fi
# Python handles paths with spaces, detached startup, and the readiness check.
.venv/bin/python - "${PORT:-8765}" <<'PY'
import pathlib
import socket
import subprocess
import sys
import time

root = pathlib.Path.cwd()
try:
    port = int(sys.argv[1])
    if not 1024 <= port <= 65535:
        raise ValueError
except ValueError:
    sys.exit('PORT must be a number from 1024 to 65535.')
runtime = root / '.run'
runtime.mkdir(exist_ok=True)
pidfile = runtime / 'preview.pid'

def owned(pid):
    result = subprocess.run(['ps', '-p', str(pid), '-o', 'command='], capture_output=True, text=True)
    return ' -m http.server ' in result.stdout and result.stdout.strip().endswith(f' --directory {root}')

if pidfile.exists():
    try:
        pid = int(pidfile.read_text())
        if owned(pid):
            sys.exit('Preview already running. Use ./stop.sh before restarting.')
    except ValueError:
        pass
    pidfile.unlink()
try:
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', port))
except OSError:
    sys.exit(f'Port {port} is in use. Use PORT=8766 ./start.sh or stop the other server.')
logpath = runtime / 'preview.log'
with logpath.open('ab') as log:
    process = subprocess.Popen(
        [str(root / '.venv/bin/python'), '-m', 'http.server', str(port),
         '--bind', '127.0.0.1', '--directory', str(root)],
        stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True,
    )
pidfile.write_text(str(process.pid))
for _ in range(50):
    if process.poll() is not None:
        pidfile.unlink(missing_ok=True)
        sys.exit(f'Preview failed to start. See {logpath}')
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=0.1):
            print(f'Preview: http://127.0.0.1:{port}/?demo')
            print(f'Log: {logpath}')
            break
    except OSError:
        time.sleep(0.1)
else:
    process.terminate()
    process.wait()
    pidfile.unlink(missing_ok=True)
    sys.exit(f'Preview did not become ready. See {logpath}')
PY
