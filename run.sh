#!/usr/bin/with-contenv bash
set -euo pipefail

if command -v bashio >/dev/null 2>&1; then
  export MQTT_URL="$(bashio::config 'mqtt_url')"
  export MQTT_USERNAME="$(bashio::config 'mqtt_username')"
  export MQTT_PASSWORD="$(bashio::config 'mqtt_password')"
fi

node /app/backend/dist/backend/src/index.js
