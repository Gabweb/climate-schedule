import type { RoomConfig, ScheduleBlock } from "../../shared/models";
import {
  findScheduleBlockAtMinute,
  minuteOfDayFromDate,
  validateGranularity,
  validateScheduleBlocks
} from "../../shared/schedule";

export type ScheduleHit = {
  block: ScheduleBlock;
  minuteOfDay: number;
};

 
export function activeScheduleForRoom(room: RoomConfig): ScheduleBlock[] {
  const mode = room.modes.find((entry) => entry.name === room.activeModeName);
  if (!mode) {
    throw new Error("active mode not found");
  }
  return mode.schedule;
}

export function evaluateRoomAtMinute(room: RoomConfig, minuteOfDay: number): ScheduleHit {
  const schedule = activeScheduleForRoom(room);
  validateScheduleBlocks(schedule);
  validateGranularity(schedule, 10);
  const block = findScheduleBlockAtMinute(schedule, minuteOfDay);
  if (!block) {
    throw new Error("No schedule block found for minute");
  }
  return { block, minuteOfDay };
}

export { minuteOfDayFromDate, validateGranularity, validateScheduleBlocks };
