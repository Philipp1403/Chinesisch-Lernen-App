#!/bin/sh
# Alle JS-Dateien der App zu einem Bündel zusammenfügen und mit ESLint prüfen (Ziel: 0 Fehler, Warnungen sind bekannt)
set -e
cd "$(dirname "$0")/lint"
[ -d node_modules ] || npm install --silent
cat ../../core.js ../../speech.js ../../lock.js ../../azure.js ../../sync.js ../../tower.js ../../writing.js ../../exercises.js ../../views.js > bundle.js
npx eslint bundle.js | tail -5
