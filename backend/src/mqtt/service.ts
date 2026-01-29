import type { RoomConfig } from "../../../shared/models";
import { roomKey } from "../../../shared/roomKey";
import { getMqttClient, type MqttConfig } from "./client";
import { buildDiscoveryConfig, buildUniqueId, discoveryPayload, discoveryTopic } from "./discovery";

export type MqttServiceOptions = {
  config: MqttConfig;
  onPresetChange: (roomKey: string, preset: string) => Promise<void>;
  onTemperatureCommand?: (roomKey: string, temperature: number) => Promise<void>;
};

const subscribed = new Set<string>();
const presetTopicToRoom = new Map<string, string>();
const temperatureTopicToRoom = new Map<string, string>();
const publishedDiscovery = new Set<string>();

export type MqttService = {
  initializeRooms: (rooms: RoomConfig[]) => void;
  publishDiscovery: (room: RoomConfig, options?: { force?: boolean }) => void;
  removeDiscovery: (room: RoomConfig) => void;
  publishRoomState: (
    room: RoomConfig,
    targetTemperature: number,
    currentTemperature?: number | null
  ) => void;
  waitForConnection: (timeoutMs?: number) => Promise<void>;
};

export function createMqttService(options: MqttServiceOptions): MqttService {
  const client = getMqttClient(options.config);

  const publishDiscovery = (room: RoomConfig, options?: { force?: boolean }) => {
    const config = buildDiscoveryConfig(room);
    if (!options?.force && publishedDiscovery.has(config.uniqueId)) {
      return;
    }
    console.log(
      `MQTT: Publishing "${roomKey(room)}" with ${JSON.stringify({
        uniqueId: config.uniqueId,
        presets: config.presetModes
      })}`
    );
    const payload = discoveryPayload(config);
    client.publish(discoveryTopic(config.uniqueId), JSON.stringify(payload), { retain: true });
    client.publish(config.availabilityTopic, "online", { retain: true });
    client.publish(config.currentTemperatureTopic, "20", { retain: true });
    client.publish(config.temperatureStateTopic, "20", { retain: true });
    client.publish(config.modeStateTopic, "heat", { retain: true });
    publishedDiscovery.add(config.uniqueId);

    if (!subscribed.has(config.presetModeCommandTopic)) {
      client.subscribe(config.presetModeCommandTopic);
      subscribed.add(config.presetModeCommandTopic);
    }
    if (!subscribed.has(config.temperatureCommandTopic)) {
      client.subscribe(config.temperatureCommandTopic);
      subscribed.add(config.temperatureCommandTopic);
    }
    const key = roomKey(room);
    presetTopicToRoom.set(config.presetModeCommandTopic, key);
    temperatureTopicToRoom.set(config.temperatureCommandTopic, key);
  };

  const removeDiscovery = (room: RoomConfig) => {
    const uniqueId = buildUniqueId(room);
    console.log(`MQTT: Removing "${roomKey(room)}" discovery (${uniqueId}).`);
    client.publish(discoveryTopic(uniqueId), "", { retain: true });
    publishedDiscovery.delete(uniqueId);
  };

  const publishRoomState = (
    room: RoomConfig,
    targetTemperature: number,
    currentTemperature?: number | null
  ) => {
    const config = buildDiscoveryConfig(room);
    console.log(
      `MQTT: Updating "${roomKey(room)}" to target temp ${targetTemperature}C (preset "${room.activeModeName}").`
    );
    client.publish(config.presetModeStateTopic, room.activeModeName, { retain: true });
    client.publish(config.temperatureStateTopic, String(targetTemperature), { retain: true });
    if (typeof currentTemperature === "number") {
      client.publish(config.currentTemperatureTopic, String(currentTemperature), { retain: true });
    }
    client.publish(config.modeStateTopic, "heat", { retain: true });
  };

  client.on("message", async (topic, payload) => {
    if (presetTopicToRoom.has(topic)) {
      const preset = payload.toString();
      const key = presetTopicToRoom.get(topic);
      if (!key) return;
      console.log(`MQTT: Activating preset "${preset}" in "${key}".`);
      await options.onPresetChange(key, preset);
      return;
    }

    if (temperatureTopicToRoom.has(topic)) {
      const key = temperatureTopicToRoom.get(topic);
      if (!key) return;
      const next = Number(payload.toString());
      if (Number.isNaN(next)) {
        console.warn(`MQTT: Ignoring invalid temperature command for "${key}".`);
        return;
      }
      console.log(`MQTT: Temperature command ${next}C for "${key}".`);
      await options.onTemperatureCommand?.(key, next);
    }
  });

  return {
    initializeRooms: (rooms) => {
      rooms.forEach((room) => publishDiscovery(room, { force: true }));
    },
    publishDiscovery,
    removeDiscovery,
    publishRoomState,
    waitForConnection: (timeoutMs) =>
      new Promise((resolve, reject) => {
        if (client.connected) {
          resolve();
          return;
        }
        const timeout = setTimeout(() => {
          reject(new Error("mqtt connection timed out"));
        }, timeoutMs ?? 5000);
        const onConnect = () => {
          clearTimeout(timeout);
          client.off("connect", onConnect);
          client.off("error", onError);
          resolve();
        };
        const onError = (error: Error) => {
          clearTimeout(timeout);
          client.off("connect", onConnect);
          client.off("error", onError);
          reject(error);
        };
        client.on("connect", onConnect);
        client.on("error", onError);
      })
  };
}
