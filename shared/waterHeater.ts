import type {
  GlobalSettings,
  WaterHeaterConfig,
  WaterHeaterScheduleBlock
} from "./models";
import { findScheduleBlockAtMinute } from "./schedule";

export const WATER_HEATER_MIN_C = 30;
export const WATER_HEATER_MAX_C = 65;
export const DEFAULT_WATER_HEATER_TEMPERATURE_C = 55;

export function clampWaterHeaterTemperature(targetC: number): number {
  return Math.max(WATER_HEATER_MIN_C, Math.min(WATER_HEATER_MAX_C, targetC));
}

export function activeWaterHeaterSchedule(config: WaterHeaterConfig): WaterHeaterScheduleBlock[] {
  const mode = config.modes.find((entry) => entry.name === config.activeModeName);
  if (!mode) {
    throw new Error("active water heater mode not found");
  }
  return mode.schedule;
}

export function evaluateWaterHeaterAtMinute(
  config: WaterHeaterConfig,
  minuteOfDay: number,
  settings: Pick<GlobalSettings, "holidayModeEnabled">
): { isOff: boolean; temperatureC: number | null; block: WaterHeaterScheduleBlock | null } {
  if (settings.holidayModeEnabled) {
    return { isOff: true, temperatureC: null, block: null };
  }
  const schedule = activeWaterHeaterSchedule(config);
  const block = findScheduleBlockAtMinute(schedule, minuteOfDay);
  if (!block || !block.enabled) {
    return { isOff: true, temperatureC: null, block };
  }
  return {
    isOff: false,
    temperatureC: clampWaterHeaterTemperature(config.heatingTemperatureC),
    block
  };
}
