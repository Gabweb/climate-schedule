#!/bin/sh
set -e

if [ -z "${PORT:-}" ]; then
  export PORT=3001
fi

exec node /app/backend/dist/backend/src/index.js
