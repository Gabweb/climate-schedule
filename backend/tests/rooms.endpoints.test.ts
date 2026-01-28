import { describe, expect, it, beforeEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { createApp } from "../src/app";
import type { RoomsFile } from "../../shared/models";
import { roomKey } from "../../shared/roomKey";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "climate-schedule-"));
}

function seedRooms(dir: string): RoomsFile {
  const data: RoomsFile = {
    version: 1,
    rooms: [
      {
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
          },
          {
            name: "Holiday",
            schedule: [
              { start: "00:00", end: "12:00", targetC: 18 },
              { start: "12:00", end: "20:00", targetC: 19 },
              { start: "20:00", end: "23:59", targetC: 18 }
            ]
          }
        ]
      }
    ],
    updatedAt: new Date().toISOString()
  };

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "rooms.json"), JSON.stringify(data, null, 2), "utf-8");
  return data;
}

describe("rooms endpoints", () => {
  beforeEach(() => {
    process.env.DATA_DIR = tempDir();
  });

  it("PUT /api/rooms/:id replaces room", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app)
      .put(`/api/rooms/${livingKey}`)
      .send({
        name: "Living Updated",
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
      });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Living Updated");
  });

  it("PUT /api/rooms/:id returns 400 for invalid floor", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app)
      .put(`/api/rooms/${livingKey}`)
      .send({
        name: "Living",
        floor: "BAD",
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
      });

    expect(response.status).toBe(400);
  });

  it("DELETE /api/rooms/:id deletes room", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app).delete(`/api/rooms/${livingKey}`);

    expect(response.status).toBe(204);
  });

  it("POST /api/rooms/:id/modes creates a mode", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app)
      .post(`/api/rooms/${livingKey}/modes`)
      .send({ name: "Guest" });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Guest");
  });

  it("POST /api/rooms/:id/modes rejects duplicate name", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app)
      .post(`/api/rooms/${livingKey}/modes`)
      .send({ name: "Default" });

    expect(response.status).toBe(400);
  });

  it("DELETE /api/rooms/:id/modes/:modeId deletes a mode", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app).delete(`/api/rooms/${livingKey}/modes/Holiday`);

    expect(response.status).toBe(204);
  });

  it("DELETE /api/rooms/:id/modes/:modeId rejects deleting last mode", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    await request(app).delete(`/api/rooms/${livingKey}/modes/Holiday`);
    const response = await request(app).delete(`/api/rooms/${livingKey}/modes/Default`);

    expect(response.status).toBe(400);
  });

  it("PATCH /api/rooms/:id/active-mode updates active mode", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app)
      .patch(`/api/rooms/${livingKey}/active-mode`)
      .send({ activeModeName: "Holiday" });

    expect(response.status).toBe(200);
    expect(response.body.activeModeName).toBe("Holiday");
  });

  it("PATCH /api/rooms/:id/active-mode rejects unknown mode", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app)
      .patch(`/api/rooms/${livingKey}/active-mode`)
      .send({ activeModeName: "Unknown" });

    expect(response.status).toBe(400);
  });

  it("PUT /api/rooms/:id/modes/:modeId/schedule replaces schedule", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app)
      .put(`/api/rooms/${livingKey}/modes/Holiday/schedule`)
      .send({
        schedule: [
          { start: "00:00", end: "10:00", targetC: 17 },
          { start: "10:00", end: "20:00", targetC: 19 },
          { start: "20:00", end: "23:59", targetC: 17 }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.schedule[0].targetC).toBe(17);
  });

  it("PUT /api/rooms/:id/modes/:modeId/schedule rejects gaps", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app)
      .put(`/api/rooms/${livingKey}/modes/Default/schedule`)
      .send({
        schedule: [
          { start: "00:00", end: "08:00", targetC: 19 },
          { start: "09:00", end: "23:59", targetC: 20 }
        ]
      });

    expect(response.status).toBe(400);
  });

  it("PUT /api/rooms/:id/modes/:modeId/schedule rejects invalid granularity", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app)
      .put(`/api/rooms/${livingKey}/modes/Default/schedule`)
      .send({
        schedule: [
          { start: "00:05", end: "08:00", targetC: 19 },
          { start: "08:00", end: "23:59", targetC: 20 }
        ]
      });

    expect(response.status).toBe(400);
  });

  it("PUT /api/rooms/:id renames room by name field", async () => {
    seedRooms(process.env.DATA_DIR!);
    const app = createApp({ publicDir: tempDir() });
    const livingKey = roomKey({ floor: "EG", name: "Living" });

    const response = await request(app)
      .put(`/api/rooms/${livingKey}`)
      .send({
        name: "Living Room",
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
      });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Living Room");
  });

  it("POST /api/rooms persists to rooms.json", async () => {
    const dataDir = process.env.DATA_DIR!;
    const app = createApp({ publicDir: tempDir() });

    await request(app)
      .post("/api/rooms")
      .send({
        name: "Office",
        floor: "EG",
        entities: [{ type: "ha_climate", entityId: "climate.office" }]
      });

    const raw = fs.readFileSync(path.join(dataDir, "rooms.json"), "utf-8");
    const parsed = JSON.parse(raw) as { version: number; rooms: Array<{ name: string }> };
    expect(parsed.version).toBe(1);
    expect(parsed.rooms.some((room) => room.name === "Office")).toBe(true);
  });
});
