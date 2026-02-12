import type { WaterHeaterScheduleBlock } from "./models";
import { minutesToTime, parseTimeToMinutes } from "./schedule";

export function updateWaterHeaterScheduleBlock(
  schedule: WaterHeaterScheduleBlock[],
  index: number,
  key: keyof WaterHeaterScheduleBlock,
  value: string | boolean
): WaterHeaterScheduleBlock[] {
  const nextSchedule = schedule.map((block) => ({ ...block }));
  const isLast = index === nextSchedule.length - 1;

  if (key === "start" && typeof value === "string" && index > 0) {
    nextSchedule[index].start = value;
    nextSchedule[index - 1].end = value;
  } else if (key === "end" && typeof value === "string") {
    nextSchedule[index].end = value;
    if (!isLast) {
      nextSchedule[index + 1].start = value;
    }
  } else if (key === "enabled" && typeof value === "boolean") {
    nextSchedule[index].enabled = value;
  }

  return nextSchedule;
}

export function addWaterHeaterScheduleSlot(
  schedule: WaterHeaterScheduleBlock[],
  maxSlots = 10,
  stepMinutes = 10
): WaterHeaterScheduleBlock[] {
  if (schedule.length >= maxSlots) {
    return schedule;
  }

  const nextSchedule = schedule.map((block) => ({ ...block }));
  const lastIndex = nextSchedule.length - 1;
  const last = nextSchedule[lastIndex];
  if (!last) {
    return schedule;
  }

  const lastStartMinutes = parseTimeToMinutes(last.start);
  const newStartMinutes = lastStartMinutes + stepMinutes;
  if (newStartMinutes >= 1440) {
    return schedule;
  }

  const newStart = minutesToTime(newStartMinutes);
  const newBlock: WaterHeaterScheduleBlock = {
    start: newStart,
    end: last.end,
    enabled: last.enabled
  };

  nextSchedule[lastIndex] = { ...last, end: newStart };
  nextSchedule.push(newBlock);
  return nextSchedule;
}

export function removeWaterHeaterScheduleSlot(
  schedule: WaterHeaterScheduleBlock[],
  index: number
): WaterHeaterScheduleBlock[] {
  if (schedule.length <= 1) {
    return schedule;
  }

  const nextSchedule = schedule.map((block) => ({ ...block }));
  const removed = nextSchedule[index];
  if (!removed) {
    return schedule;
  }
  nextSchedule.splice(index, 1);
  if (nextSchedule.length === 0) {
    return schedule;
  }

  if (index === 0) {
    nextSchedule[0].start = removed.start;
  } else {
    nextSchedule[index - 1].end = removed.end;
  }

  return nextSchedule;
}
