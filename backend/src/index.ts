import { createApp } from "./app";
import {
  createHomeAssistantAdapterFromEnv,
  getHomeAssistantConfigFromEnv,
  validateEntitiesExist
} from "./adapters/homeAssistant";
import { createNoopAdapter } from "./adapters/climate";
import { startScheduler } from "./scheduler/scheduler";
import { createMqttService, type MqttService } from "./mqtt/service";
import { loadRoomsFile, saveRoomsFile } from "./rooms";
import { roomKey } from "../../shared/roomKey";

const port = Number(process.env.PORT) || 3001;
const mqttUrl = process.env.MQTT_URL;
const mqttUsername = process.env.MQTT_USERNAME;
const mqttPassword = process.env.MQTT_PASSWORD;

const hasValue = (value?: string) => typeof value === "string" && value.trim().length > 0;

async function main() {
  let mqttService: MqttService | undefined;
  if (mqttUrl) {
    if (!hasValue(mqttUrl) || !hasValue(mqttUsername) || !hasValue(mqttPassword)) {
      console.error(
        "MQTT configuration invalid. Ensure MQTT_URL, MQTT_USERNAME, and MQTT_PASSWORD are set."
      );
    } else {
      mqttService = createMqttService({
        config: {
          url: mqttUrl,
          username: mqttUsername,
          password: mqttPassword
        },
        onPresetChange: async (roomKeyParam, preset) => {
          const roomsFile = loadRoomsFile();
          const room = roomsFile.rooms.find((entry) => roomKey(entry) === roomKeyParam);
          if (!room) return;
          if (!room.modes.some((mode) => mode.name === preset)) return;
          room.activeModeName = preset;
          saveRoomsFile(roomsFile);
        },
        onTemperatureCommand: async (roomKeyParam) => {
          console.log(
            `MQTT: Temperature commands for "${roomKeyParam}" are ignored by design.`
          );
        }
      });
    }
  } else {
    console.warn("MQTT disabled (MQTT_URL not set).");
  }

  const roomsFile = loadRoomsFile();

  if (mqttService) {
    try {
      await mqttService.waitForConnection(5000);
      console.log("Startup check: MQTT connection ok.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error(`Startup check: MQTT connection failed (${message}).`);
    }
  } else {
    console.warn("Startup check: MQTT not configured, skipping MQTT validation.");
  }

  const haConfig = getHomeAssistantConfigFromEnv();
  if (!haConfig) {
    console.warn("Startup check: Home Assistant credentials not set, skipping entity validation.");
  } else {
    const entityIds = roomsFile.rooms.flatMap((room) =>
      room.entities.map((entity) => entity.entityId)
    );
    if (entityIds.length === 0) {
      console.log("Startup check: no climate entities to validate.");
    } else {
      const result = await validateEntitiesExist(haConfig, entityIds);
      if (result.missing.length > 0) {
        console.error(
          `Startup check: missing climate entities: ${result.missing.join(", ")}`
        );
      }
      if (result.errors.length > 0) {
        console.error(`Startup check: entity validation errors: ${result.errors.join(" | ")}`);
      }
      if (result.missing.length === 0 && result.errors.length === 0) {
        console.log("Startup check: all climate entities found.");
      }
    }
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

  if (mqttService) {
    mqttService.initializeRooms(roomsFile.rooms);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "startup failed";
  console.error(message);
});
