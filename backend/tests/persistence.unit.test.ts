import { beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { loadRoomsFile } from "../src/rooms";
import { loadSettings } from "../src/settings";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "climate-schedule-persistence-"));
}

describe("persistence loading and migration", () => {
  beforeEach(() => {
    process.env.DATA_DIR = tempDir();
  });

  it("migrates legacy settings without version to version 1", () => {
    const filePath = path.join(process.env.DATA_DIR!, "settings.json");
    fs.writeFileSync(filePath, JSON.stringify({ holidayModeEnabled: true }), "utf-8");

    const loaded = loadSettings();

    expect(loaded.version).toBe(1);
    expect(loaded.holidayModeEnabled).toBe(true);
    const persisted = JSON.parse(fs.readFileSync(filePath, "utf-8")) as { version: number };
    expect(persisted.version).toBe(1);
  });

  it("rejects settings files from unsupported newer versions", () => {
    const filePath = path.join(process.env.DATA_DIR!, "settings.json");
    fs.writeFileSync(filePath, JSON.stringify({ version: 2, holidayModeEnabled: false }), "utf-8");

    expect(() => loadSettings()).toThrow(/newer than supported version/);
  });

  it("migrates legacy rooms file without version to version 1", () => {
    const filePath = path.join(process.env.DATA_DIR!, "rooms.json");
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        rooms: [
          {
            name: "Office",
            floor: "EG",
            entities: [{ type: "ha_climate", entityId: "climate.office" }],
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
          }
        ],
        updatedAt: new Date().toISOString()
      }),
      "utf-8"
    );

    const loaded = loadRoomsFile();

    expect(loaded.version).toBe(1);
    expect(loaded.rooms).toHaveLength(1);
  });
});
