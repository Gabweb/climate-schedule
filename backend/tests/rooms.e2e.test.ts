import { describe, expect, it, beforeEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { createApp } from "../src/app";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "climate-schedule-"));
}

describe("rooms api", () => {
  beforeEach(() => {
    process.env.DATA_DIR = tempDir();
  });

  it("GET /api/rooms returns the rooms file", async () => {
    const app = createApp({ publicDir: tempDir() });

    const response = await request(app).get("/api/rooms");

    expect(response.status).toBe(200);
    expect(response.body.rooms).toEqual([]);
  });

  it("POST /api/rooms adds a room with default mode", async () => {
    const app = createApp({ publicDir: tempDir() });

    const response = await request(app)
      .post("/api/rooms")
      .send({
        name: "Bedroom",
        floor: "1OG",
        entities: [{ type: "ha_climate", entityId: "climate.bedroom" }]
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Bedroom");
    expect(response.body.activeModeName).toBe("Default");
    expect(response.body.modes[0].schedule).toHaveLength(3);
  });
});
