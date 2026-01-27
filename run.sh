#!/usr/bin/with-contenv bash
set -euo pipefail

if [ -f /usr/lib/bashio/bashio.sh ]; then
  # shellcheck source=/usr/lib/bashio/bashio.sh
  source /usr/lib/bashio/bashio.sh
fi

if declare -F bashio::config >/dev/null 2>&1; then
  export MQTT_URL="${MQTT_URL:-$(bashio::config 'mqtt_url')}"
  export MQTT_USERNAME="${MQTT_USERNAME:-$(bashio::config 'mqtt_username')}"
  export MQTT_PASSWORD="${MQTT_PASSWORD:-$(bashio::config 'mqtt_password')}"
fi

export PORT=3001

node /app/backend/dist/backend/src/index.js
