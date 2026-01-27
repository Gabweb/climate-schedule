import { describe, expect, it, beforeEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createRoom, loadRoomsFile, roomsFilePath } from "../src/rooms";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "climate-schedule-"));
}

describe("rooms model", () => {
  beforeEach(() => {
    process.env.DATA_DIR = tempDir();
  });

  it("creates a room with a default mode and schedule", () => {
    const room = createRoom({
      name: "Living",
      floor: "EG",
      entities: [{ type: "ha_climate", entityId: "climate.living" }]
    });

    expect(room.name).toBe("Living");
    expect(room.modes).toHaveLength(1);
    expect(room.activeModeName).toBe("Default");
    expect(room.modes[0].schedule).toHaveLength(3);
    expect(room.modes[0].schedule[0]).toEqual({
      start: "00:00",
      end: "08:00",
      targetC: 19
    });
  });

  it("creates rooms.json on first load", () => {
    const filePath = roomsFilePath();
    expect(fs.existsSync(filePath)).toBe(false);

    const loaded = loadRoomsFile();

    expect(loaded.version).toBe(1);
    expect(loaded.rooms).toEqual([]);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
