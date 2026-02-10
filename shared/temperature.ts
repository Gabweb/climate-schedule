import type { GlobalSettings } from "./models";

export const HOLIDAY_OFFSET_C = 2;
export const MIN_TARGET_TEMPERATURE_C = 5;

export function applyGlobalTemperatureSettings(
  scheduledTargetC: number,
  settings: Pick<GlobalSettings, "holidayModeEnabled">
): number {
  if (!settings.holidayModeEnabled) {
    return scheduledTargetC;
  }
  return Math.max(MIN_TARGET_TEMPERATURE_C, scheduledTargetC - HOLIDAY_OFFSET_C);
}
