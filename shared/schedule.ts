import type { ScheduleBlock } from "./models";

export function parseTimeToMinutes(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new Error(`Invalid time format: ${time}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function minuteOfDayFromDate(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function minuteOfDayInTimeZone(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((part) => part.type === "hour");
  const minutePart = parts.find((part) => part.type === "minute");
  const hours = hourPart ? Number(hourPart.value) : 0;
  const minutes = minutePart ? Number(minutePart.value) : 0;
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function isMinuteInBlock(block: ScheduleBlock, minuteOfDay: number): boolean {
  const start = parseTimeToMinutes(block.start);
  const end = parseTimeToMinutes(block.end);
  const isLastMinute = block.end === "23:59";
  return isLastMinute
    ? minuteOfDay >= start && minuteOfDay <= end
    : minuteOfDay >= start && minuteOfDay < end;
}

export function findScheduleBlockAtMinute(
  schedule: ScheduleBlock[],
  minuteOfDay: number
): ScheduleBlock | null {
  for (const block of schedule) {
    if (isMinuteInBlock(block, minuteOfDay)) {
      return block;
    }
  }
  return null;
}

export function validateScheduleBlocks(schedule: ScheduleBlock[]): void {
  if (schedule.length === 0) {
    throw new Error("schedule must contain at least one block");
  }

  const blocks = schedule.map((block) => ({
    ...block,
    startMinute: parseTimeToMinutes(block.start),
    endMinute: parseTimeToMinutes(block.end)
  }));

  for (const block of blocks) {
    if (block.endMinute < block.startMinute) {
      throw new Error("schedule block end must be after start");
    }
  }

  const sorted = blocks.sort((a, b) => a.startMinute - b.startMinute);

  if (sorted[0].startMinute !== 0) {
    throw new Error("schedule must start at 00:00");
  }

  if (sorted[sorted.length - 1].endMinute !== 1439) {
    throw new Error("schedule must end at 23:59");
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (current.endMinute !== next.startMinute) {
      throw new Error("schedule must be contiguous with no gaps");
    }
  }
}

export function validateGranularity(schedule: ScheduleBlock[], stepMinutes = 10): void {
  for (const block of schedule) {
    const start = parseTimeToMinutes(block.start);
    const end = parseTimeToMinutes(block.end);

    if (start % stepMinutes !== 0) {
      throw new Error("schedule start time must align to 10-minute steps");
    }

    const isLastMinute = block.end === "23:59";
    if (!isLastMinute && end % stepMinutes !== 0) {
      throw new Error("schedule end time must align to 10-minute steps");
    }
  }
}
