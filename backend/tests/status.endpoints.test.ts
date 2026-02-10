import { describe, expect, it } from "vitest";
import request from "supertest";
import fs from "fs";
import os from "os";
import path from "path";
import { createApp } from "../src/app";
import { setRuntimeStatus } from "../src/runtimeStatus";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "climate-schedule-status-"));
}

describe("status endpoints", () => {
  it("GET /api/status returns startup status", async () => {
    setRuntimeStatus({ startupSuccessful: false });
    const app = createApp({ publicDir: tempDir() });

    const response = await request(app).get("/api/status");

    expect(response.status).toBe(200);
    expect(response.body.startupSuccessful).toBe(false);
  });
});
