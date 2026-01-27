import { describe, expect, it } from "vitest";
import {
  activeScheduleForRoom,
  evaluateRoomAtMinute,
  minuteOfDayFromDate,
  validateGranularity,
  validateScheduleBlocks
} from "../src/schedule";
import type { RoomConfig } from "../../shared/models";

const roomFixture: RoomConfig = {
  name: "Living",
  floor: "EG",
  entities: [{ type: "ha_climate", entityId: "climate.living" }],
  activeModeName: "Default",
  modes: [
    {
      name: "Default",
      schedule: [
        { start: "00:00", end: "08:00", targetC: 19 },
        { start: "08:00", end: "20:00", targetC: 20 },
        { start: "20:00", end: "23:59", targetC: 19 }
      ]
    }
  ]
};

describe("schedule logic", () => {
  it("selects active schedule for room", () => {
    const schedule = activeScheduleForRoom(roomFixture);
    expect(schedule).toHaveLength(3);
  });

  it("finds correct block by minute", () => {
    const hit = evaluateRoomAtMinute(roomFixture, 9 * 60);
    expect(hit.block.targetC).toBe(20);
  });

  it("validates contiguous schedule", () => {
    expect(() => validateScheduleBlocks(roomFixture.modes[0].schedule)).not.toThrow();
  });

  it("rejects non-10-minute granularity", () => {
    const schedule = [{ start: "00:05", end: "23:59", targetC: 19 }];
    expect(() => validateGranularity(schedule, 10)).toThrow();
  });

  it("converts date to minute of day", () => {
    const date = new Date("2024-01-01T08:15:00Z");
    expect(minuteOfDayFromDate(date)).toBe(date.getHours() * 60 + date.getMinutes());
  });
});
