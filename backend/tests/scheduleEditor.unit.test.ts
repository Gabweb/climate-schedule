import { describe, expect, it } from "vitest";
import {
  addScheduleSlot,
  isScheduleEndInvalid,
  isScheduleStartInvalid,
  removeScheduleSlot,
  updateScheduleBlock
} from "../../shared/scheduleEditor";
import type { ScheduleBlock } from "../../shared/models";

const baseSchedule: ScheduleBlock[] = [
  { start: "00:00", end: "08:00", targetC: 19 },
  { start: "08:00", end: "20:00", targetC: 20 },
  { start: "20:00", end: "23:59", targetC: 19 }
];

describe("shared schedule editor", () => {
  it("updates adjacent block when start changes", () => {
    const next = updateScheduleBlock(baseSchedule, 1, "start", "09:00");
    expect(next[0].end).toBe("09:00");
    expect(next[1].start).toBe("09:00");
  });

  it("adds a slot by splitting the last slot", () => {
    const next = addScheduleSlot(baseSchedule, 10, 10);
    expect(next).toHaveLength(4);
    expect(next[2].end).toBe("20:10");
    expect(next[3].start).toBe("20:10");
  });

  it("removes slot and keeps schedule contiguous", () => {
    const next = removeScheduleSlot(baseSchedule, 1);
    expect(next).toHaveLength(2);
    expect(next[0].end).toBe("20:00");
    expect(next[1].start).toBe("20:00");
  });

  it("detects invalid start/end fields", () => {
    const invalid = [
      { start: "00:00", end: "08:00", targetC: 19 },
      { start: "08:05", end: "23:59", targetC: 20 }
    ];
    expect(isScheduleStartInvalid(invalid, 1)).toBe(true);
    expect(isScheduleEndInvalid(invalid, 0)).toBe(true);
  });
});
