# Climate Schedule Add-on

This project is a Home Assistant add-on that provides a dedicated UI to manage per-room climate schedules and applies target temperatures automatically. It includes a scheduler backend and a React-based UI designed for quick editing and overview. 

Note: this codebase is AI-generated.

## Local Docker (quick)

Set Home Assistant env vars (required for calling services):
```sh
export HA_BASE_URL="http://homeassistant.local:8123"
export HA_TOKEN="YOUR_LONG_LIVED_ACCESS_TOKEN"
```
Leave `MQTT_URL` unset to disable MQTT locally. 

```sh
npm run stop
npm run deploy
```
