import type { ScheduleBlock } from "./models";
import { minutesToTime, parseTimeToMinutes } from "./schedule";

export function updateScheduleBlock(
  schedule: ScheduleBlock[],
  index: number,
  key: keyof ScheduleBlock,
  value: string | number
): ScheduleBlock[] {
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
  } else if (key === "targetC" && typeof value === "number") {
    nextSchedule[index].targetC = value;
  }

  return nextSchedule;
}

export function addScheduleSlot(
  schedule: ScheduleBlock[],
  maxSlots = 10,
  stepMinutes = 10
): ScheduleBlock[] {
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
  const newBlock: ScheduleBlock = {
    start: newStart,
    end: last.end,
    targetC: last.targetC
  };

  nextSchedule[lastIndex] = { ...last, end: newStart };
  nextSchedule.push(newBlock);
  return nextSchedule;
}

export function removeScheduleSlot(schedule: ScheduleBlock[], index: number): ScheduleBlock[] {
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

export function isScheduleStartInvalid(
  schedule: ScheduleBlock[],
  index: number,
  stepMinutes = 10
): boolean {
  const block = schedule[index];
  const lastIndex = schedule.length - 1;
  if (!block) return false;
  try {
    const startMinutes = parseTimeToMinutes(block.start);
    const endMinutes = parseTimeToMinutes(block.end);
    if (index === 0 && block.start !== "00:00") return true;
    if (startMinutes >= endMinutes) return true;
    if (startMinutes % stepMinutes !== 0) return true;
    if (index > 0 && block.start !== schedule[index - 1].end) return true;
    if (index < lastIndex && block.end !== schedule[index + 1].start) return true;
    return false;
  } catch {
    return true;
  }
}

export function isScheduleEndInvalid(
  schedule: ScheduleBlock[],
  index: number,
  stepMinutes = 10
): boolean {
  const block = schedule[index];
  const lastIndex = schedule.length - 1;
  if (!block) return false;
  try {
    const startMinutes = parseTimeToMinutes(block.start);
    const endMinutes = parseTimeToMinutes(block.end);
    if (startMinutes >= endMinutes) return true;
    const isLast = index === lastIndex;
    if (isLast && block.end !== "23:59") return true;
    if (!isLast && block.end !== schedule[index + 1].start) return true;
    if (block.end !== "23:59" && endMinutes % stepMinutes !== 0) return true;
    return false;
  } catch {
    return true;
  }
}
