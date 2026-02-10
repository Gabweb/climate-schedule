import type { RoomConfig } from "../../../shared/models";
import { findScheduleBlockAtMinute, minuteOfDayInTimeZone } from "../../../shared/schedule";
import { roomKey } from "../../../shared/roomKey";
import { applyGlobalTemperatureSettings } from "../../../shared/temperature";
import { activeScheduleForRoom, validateGranularity, validateScheduleBlocks } from "../schedule";
import { loadSettings } from "../settings";
import type { MqttService } from "../mqtt/service";

export function publishRoomStateIfPossible(
  room: RoomConfig,
  mqttService: MqttService | undefined,
  timeZone: string
): void {
  if (!mqttService) return;
  try {
    const schedule = activeScheduleForRoom(room);
    validateScheduleBlocks(schedule);
    validateGranularity(schedule, 10);
    const minute = minuteOfDayInTimeZone(new Date(), timeZone);
    const block = findScheduleBlockAtMinute(schedule, minute);
    if (!block) return;
    const settings = loadSettings();
    const targetC = applyGlobalTemperatureSettings(block.targetC, settings);
    mqttService.publishRoomState(room, targetC);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown schedule error";
    console.warn(`Failed to publish room state for ${roomKey(room)}: ${message}`);
  }
}
