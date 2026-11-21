#!/bin/sh
# Ein Browser-Test ausführen, zum Beispiel: tests/run.sh n9
# Läuft in tests/out (dorthin kommen auch die Screenshots). Braucht: python3, playwright, Google Chrome unter /usr/bin/google-chrome
set -e
T="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$T/out" && cd "$T/out"
pkill -f "http.server 8765" 2>/dev/null || true
PYTHONPATH="$T" python3 "$T/$1.py"
