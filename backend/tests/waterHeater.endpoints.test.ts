import { beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { createApp } from "../src/app";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "climate-schedule-water-heater-"));
}

describe("water heater endpoints", () => {
  beforeEach(() => {
    process.env.DATA_DIR = tempDir();
  });

  it("GET /api/water-heater returns defaults", async () => {
    const app = createApp({ publicDir: tempDir() });
    const response = await request(app).get("/api/water-heater");
    expect(response.status).toBe(200);
    expect(response.body.activeModeName).toBe("Default");
    expect(response.body.heatingTemperatureC).toBe(55);
    expect(response.body.modes).toHaveLength(1);
  });

  it("PATCH /api/water-heater/active-mode updates active mode", async () => {
    const app = createApp({ publicDir: tempDir() });
    await request(app)
      .post("/api/water-heater/modes")
      .send({ name: "Boost" });

    const response = await request(app)
      .patch("/api/water-heater/active-mode")
      .send({ activeModeName: "Boost" });

    expect(response.status).toBe(200);
    expect(response.body.activeModeName).toBe("Boost");
  });

  it("PUT /api/water-heater/modes/:modeName/schedule updates schedule", async () => {
    const app = createApp({ publicDir: tempDir() });
    const response = await request(app)
      .put("/api/water-heater/modes/Default/schedule")
      .send({
        schedule: [
          { start: "00:00", end: "08:00", enabled: false },
          { start: "08:00", end: "20:00", enabled: true },
          { start: "20:00", end: "23:59", enabled: false }
        ]
      });
    expect(response.status).toBe(200);
    expect(response.body.schedule[1].enabled).toBe(true);
  });
});
