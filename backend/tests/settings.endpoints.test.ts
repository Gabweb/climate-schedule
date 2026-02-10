import { beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { createApp } from "../src/app";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "climate-schedule-settings-"));
}

describe("settings endpoints", () => {
  beforeEach(() => {
    process.env.DATA_DIR = tempDir();
  });

  it("GET /api/settings returns defaults when file is missing", async () => {
    const app = createApp({ publicDir: tempDir() });

    const response = await request(app).get("/api/settings");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      version: 1,
      holidayModeEnabled: false
    });
  });

  it("PUT /api/settings persists the global settings", async () => {
    const dataDir = process.env.DATA_DIR!;
    const app = createApp({ publicDir: tempDir() });

    const response = await request(app)
      .put("/api/settings")
      .send({ version: 1, holidayModeEnabled: true });

    expect(response.status).toBe(200);
    expect(response.body.holidayModeEnabled).toBe(true);

    const raw = fs.readFileSync(path.join(dataDir, "settings.json"), "utf-8");
    const parsed = JSON.parse(raw) as { version: number; holidayModeEnabled: boolean };
    expect(parsed.version).toBe(1);
    expect(parsed.holidayModeEnabled).toBe(true);
  });

  it("PUT /api/settings rejects invalid payload", async () => {
    const app = createApp({ publicDir: tempDir() });

    const response = await request(app)
      .put("/api/settings")
      .send({ version: "1", holidayModeEnabled: true });

    expect(response.status).toBe(400);
  });
});
