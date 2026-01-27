import { describe, expect, it } from "vitest";
import {
  validateGranularity,
  validateScheduleBlocks,
  parseTimeToMinutes
} from "../../shared/schedule";

const validSchedule = [
  { start: "00:00", end: "08:00", targetC: 19 },
  { start: "08:00", end: "20:00", targetC: 20 },
  { start: "20:00", end: "23:59", targetC: 19 }
];

describe("shared schedule validation", () => {
  it("accepts a contiguous schedule", () => {
    expect(() => validateScheduleBlocks(validSchedule)).not.toThrow();
  });

  it("rejects gaps", () => {
    const schedule = [
      { start: "00:00", end: "08:00", targetC: 19 },
      { start: "09:00", end: "23:59", targetC: 20 }
    ];
    expect(() => validateScheduleBlocks(schedule)).toThrow();
  });

  it("rejects non-10-minute granularity", () => {
    const schedule = [
      { start: "00:05", end: "08:00", targetC: 19 },
      { start: "08:00", end: "23:59", targetC: 20 }
    ];
    expect(() => validateGranularity(schedule, 10)).toThrow();
  });

  it("parses time to minutes", () => {
    expect(parseTimeToMinutes("08:10")).toBe(490);
  });
});
