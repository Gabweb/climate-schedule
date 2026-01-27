import type { RoomConfig } from "../../../shared/models";

export type DiscoveryConfig = {
  uniqueId: string;
  name: string;
  presetModes: string[];
  baseTopic: string;
  currentTemperatureTopic: string;
  temperatureStateTopic: string;
  presetModeStateTopic: string;
  presetModeCommandTopic: string;
  availabilityTopic: string;
  modeStateTopic: string;
};

export function buildUniqueId(room: RoomConfig): string {
  const normalized = `${room.floor}_${room.name}`
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "");
  return `climateSchedule_${normalized}`;
}

export function buildDiscoveryConfig(room: RoomConfig): DiscoveryConfig {
  const uniqueId = buildUniqueId(room);
  const base = `climateSchedule/${uniqueId}`;
  return {
    uniqueId,
    name: room.name,
    presetModes: room.modes.map((mode) => mode.name),
    baseTopic: base,
    currentTemperatureTopic: `${base}/state/current_temperature`,
    temperatureStateTopic: `${base}/state/target_temperature`,
    presetModeStateTopic: `${base}/state/preset`,
    presetModeCommandTopic: `${base}/command/preset`,
    availabilityTopic: `${base}/availability`,
    modeStateTopic: `${base}/state/mode`
  };
}

export function discoveryTopic(uniqueId: string): string {
  return `homeassistant/climate/${uniqueId}/config`;
}

export function discoveryPayload(config: DiscoveryConfig): Record<string, unknown> {
  return {
    name: config.name,
    unique_id: config.uniqueId,
    preset_modes: config.presetModes,
    preset_mode_state_topic: config.presetModeStateTopic,
    preset_mode_command_topic: config.presetModeCommandTopic,
    temperature_state_topic: config.temperatureStateTopic,
    current_temperature_topic: config.currentTemperatureTopic,
    availability_topic: config.availabilityTopic,
    modes: ["heat"],
    mode_state_topic: config.modeStateTopic
  };
}
