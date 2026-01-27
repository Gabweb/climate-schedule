import { createApp } from "./app";
import { createHomeAssistantAdapterFromEnv } from "./adapters/homeAssistant";
import { createNoopAdapter } from "./adapters/climate";
import { startScheduler } from "./scheduler/scheduler";
import { createMqttService } from "./mqtt/service";
import { loadRoomsFile, saveRoomsFile } from "./rooms";

const port = Number(process.env.PORT) || 3000;
const mqttUrl = process.env.MQTT_URL;
const mqttService = mqttUrl
  ? createMqttService({
      config: {
        url: mqttUrl,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD
      },
      onPresetChange: async (roomName, preset) => {
        const roomsFile = loadRoomsFile();
        const room = roomsFile.rooms.find((entry) => entry.name === roomName);
        if (!room) return;
        if (!room.modes.some((mode) => mode.name === preset)) return;
        room.activeModeName = preset;
        saveRoomsFile(roomsFile);
      }
    })
  : undefined;

if (mqttService) {
  const roomsFile = loadRoomsFile();
  roomsFile.rooms.forEach((room) => mqttService.publishDiscovery(room));
}

const app = createApp({ mqttService });

app.listen(port, () => {
  console.log("backend listening on http://localhost:" + port);
});

try {
  const adapter =
    process.env.HA_BASE_URL && process.env.HA_TOKEN
      ? createHomeAssistantAdapterFromEnv()
      : createNoopAdapter();
  startScheduler({ adapter, mqttService });
  console.log("scheduler started");
} catch (error) {
  const message = error instanceof Error ? error.message : "scheduler failed to start";
  console.warn(message);
}
