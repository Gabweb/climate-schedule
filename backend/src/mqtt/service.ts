import type { RoomConfig } from "../../../shared/models";
import { getMqttClient, type MqttConfig } from "./client";
import { buildDiscoveryConfig, buildUniqueId, discoveryPayload, discoveryTopic } from "./discovery";

export type MqttServiceOptions = {
  config: MqttConfig;
  onPresetChange: (roomName: string, preset: string) => Promise<void>;
  onTemperatureCommand?: (roomName: string, temperature: number) => Promise<void>;
};

const subscribed = new Set<string>();
const presetTopicToRoom = new Map<string, string>();
const temperatureTopicToRoom = new Map<string, string>();
const publishedDiscovery = new Set<string>();

export type MqttService = {
  initializeRooms: (rooms: RoomConfig[]) => void;
  publishDiscovery: (room: RoomConfig, options?: { force?: boolean }) => void;
  removeDiscovery: (room: RoomConfig) => void;
  publishRoomState: (room: RoomConfig, targetTemperature: number) => void;
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
      `MQTT: Publishing "${room.name}" with ${JSON.stringify({
        uniqueId: config.uniqueId,
        presets: config.presetModes
      })}`
    );
    const payload = discoveryPayload(config);
    client.publish(discoveryTopic(config.uniqueId), JSON.stringify(payload), { retain: true });
    client.publish(config.availabilityTopic, "online", { retain: true });
    client.publish(config.currentTemperatureTopic, "20", { retain: true });
    client.publish(config.tempStateTopic, "20", { retain: true });
    client.publish(config.modeStateTopic, "heat", { retain: true });
    publishedDiscovery.add(config.uniqueId);

    if (!subscribed.has(config.presetModeCommandTopic)) {
      client.subscribe(config.presetModeCommandTopic);
      subscribed.add(config.presetModeCommandTopic);
    }
    if (!subscribed.has(config.tempCommandTopic)) {
      client.subscribe(config.tempCommandTopic);
      subscribed.add(config.tempCommandTopic);
    }
    presetTopicToRoom.set(config.presetModeCommandTopic, room.name);
    temperatureTopicToRoom.set(config.tempCommandTopic, room.name);
  };

  const removeDiscovery = (room: RoomConfig) => {
    const uniqueId = buildUniqueId(room);
    console.log(`MQTT: Removing "${room.name}" discovery (${uniqueId}).`);
    client.publish(discoveryTopic(uniqueId), "", { retain: true });
    publishedDiscovery.delete(uniqueId);
  };

  const publishRoomState = (room: RoomConfig, targetTemperature: number) => {
    const config = buildDiscoveryConfig(room);
    console.log(
      `MQTT: Updating "${room.name}" to target temp ${targetTemperature}C (preset "${room.activeModeName}").`
    );
    client.publish(config.presetModeStateTopic, room.activeModeName, { retain: true });
    client.publish(config.tempStateTopic, String(targetTemperature), { retain: true });
    client.publish(config.currentTemperatureTopic, "20", { retain: true });
    client.publish(config.modeStateTopic, "heat", { retain: true });
  };

  client.on("message", async (topic, payload) => {
    if (presetTopicToRoom.has(topic)) {
      const preset = payload.toString();
      const roomName = presetTopicToRoom.get(topic);
      if (!roomName) return;
      console.log(`MQTT: Activating preset "${preset}" in "${roomName}".`);
      await options.onPresetChange(roomName, preset);
      return;
    }

    if (temperatureTopicToRoom.has(topic)) {
      const roomName = temperatureTopicToRoom.get(topic);
      if (!roomName) return;
      const next = Number(payload.toString());
      if (Number.isNaN(next)) {
        console.warn(`MQTT: Ignoring invalid temperature command for "${roomName}".`);
        return;
      }
      console.log(`MQTT: Temperature command ${next}C for "${roomName}".`);
      await options.onTemperatureCommand?.(roomName, next);
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
