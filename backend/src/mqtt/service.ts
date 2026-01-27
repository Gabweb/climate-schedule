import type { RoomConfig } from "../../../shared/models";
import { getMqttClient, type MqttConfig } from "./client";
import { buildDiscoveryConfig, buildUniqueId, discoveryPayload, discoveryTopic } from "./discovery";

export type MqttServiceOptions = {
  config: MqttConfig;
  onPresetChange: (roomName: string, preset: string) => Promise<void>;
};

const subscribed = new Set<string>();
const topicToRoom = new Map<string, string>();

export type MqttService = {
  publishDiscovery: (room: RoomConfig) => void;
  removeDiscovery: (room: RoomConfig) => void;
  publishRoomState: (room: RoomConfig, targetTemperature: number) => void;
};

export function createMqttService(options: MqttServiceOptions): MqttService {
  const client = getMqttClient(options.config);

  const publishDiscovery = (room: RoomConfig) => {
    const config = buildDiscoveryConfig(room);
    const payload = discoveryPayload(config);
    client.publish(discoveryTopic(config.uniqueId), JSON.stringify(payload), { retain: true });
    client.publish(config.availabilityTopic, "online", { retain: true });
    client.publish(config.currentTemperatureTopic, "20", { retain: true });
    client.publish(config.temperatureStateTopic, "20", { retain: true });
    client.publish(config.modeStateTopic, "heat", { retain: true });

    if (!subscribed.has(config.presetModeCommandTopic)) {
      client.subscribe(config.presetModeCommandTopic);
      subscribed.add(config.presetModeCommandTopic);
    }
    topicToRoom.set(config.presetModeCommandTopic, room.name);
  };

  const removeDiscovery = (room: RoomConfig) => {
    const uniqueId = buildUniqueId(room);
    client.publish(discoveryTopic(uniqueId), "", { retain: true });
  };

  const publishRoomState = (room: RoomConfig, targetTemperature: number) => {
    const config = buildDiscoveryConfig(room);
    client.publish(config.presetModeStateTopic, room.activeModeName, { retain: true });
    client.publish(config.temperatureStateTopic, String(targetTemperature), { retain: true });
    client.publish(config.currentTemperatureTopic, "20", { retain: true });
    client.publish(config.modeStateTopic, "heat", { retain: true });
  };

  client.on("message", async (topic, payload) => {
    const preset = payload.toString();
    const roomName = topicToRoom.get(topic);
    if (!roomName) return;
    await options.onPresetChange(roomName, preset);
  });

  return {
    publishDiscovery,
    removeDiscovery,
    publishRoomState
  };
}
