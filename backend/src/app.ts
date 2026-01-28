import express from "express";
import path from "path";
import {
  createMode,
  createRoom,
  loadRoomsFile,
  saveRoomsFile,
  DEFAULT_BLOCKS
} from "./rooms";
import { validateRoomsFile } from "./validation";
import { activeScheduleForRoom, validateGranularity, validateScheduleBlocks } from "./schedule";
import { findScheduleBlockAtMinute, minuteOfDayInTimeZone } from "../../shared/schedule";
import type { RoomConfig, RoomsFile } from "../../shared/models";
import type { MqttService } from "./mqtt/service";

export type AppOptions = {
  publicDir?: string;
  mqttService?: MqttService;
};

export function createApp(options: AppOptions = {}) {
  const app = express();
  const publicDir =
    options.publicDir || process.env.PUBLIC_DIR || path.resolve(process.cwd(), "public");
  const timeZone = "Europe/Berlin";

  app.use(express.json());

  const publishRoomStateIfPossible = (room: RoomConfig) => {
    if (!options.mqttService) return;
    try {
      const schedule = activeScheduleForRoom(room);
      validateScheduleBlocks(schedule);
      validateGranularity(schedule, 10);
      const minute = minuteOfDayInTimeZone(new Date(), timeZone);
      const block = findScheduleBlockAtMinute(schedule, minute);
      if (!block) return;
      options.mqttService.publishRoomState(room, block.targetC);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown schedule error";
      console.warn(`Failed to publish room state for ${room.name}: ${message}`);
    }
  };

  // Health check endpoint used during development.
  app.get("/api/hello", (_req, res) => {
    res.json({ message: "hello world" });
  });

  // Returns the full rooms configuration file.
  app.get("/api/rooms", (_req, res) => {
    const roomsFile = loadRoomsFile();
    res.json(roomsFile);
  });

  // Replaces the full rooms configuration file.
  app.put("/api/rooms", (req, res) => {
    try {
      const payload = validateRoomsFile(req.body) as RoomsFile;
      saveRoomsFile(payload);
      console.log(`Updated rooms file with ${payload.rooms.length} rooms.`);
      res.json(loadRoomsFile());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid rooms payload";
      console.error(`PUT /api/rooms failed: ${message}`);
      res.status(400).json({ error: message });
    }
  });

  // Creates a new room with a default mode and schedule.
  app.post("/api/rooms", (req, res) => {
    try {
      const input = req.body as Omit<RoomConfig, "modes" | "activeModeName">;
      if (!input || typeof input !== "object") {
        throw new Error("room payload must be an object");
      }
      if (!input.name || !input.floor) {
        throw new Error("room must include name and floor");
      }
      if (!Array.isArray(input.entities)) {
        throw new Error("room must include entities");
      }

      const roomsFile = loadRoomsFile();
      const created = createRoom(input);
      roomsFile.rooms.push(created);
      saveRoomsFile(roomsFile);
      options.mqttService?.publishDiscovery(created, { force: true });
      console.log(`Created room ${created.name} (${created.floor}).`);
      res.status(201).json(created);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid room payload";
      console.error(`POST /api/rooms failed: ${message}`);
      res.status(400).json({ error: message });
    }
  });

  // Deletes a room by id.
  app.delete("/api/rooms/:roomName", (req, res) => {
    try {
      const roomName = req.params.roomName;
      const roomsFile = loadRoomsFile();
      const roomToDelete = roomsFile.rooms.find((room) => room.name === roomName);
      const nextRooms = roomsFile.rooms.filter((room) => room.name !== roomName);
      if (nextRooms.length === roomsFile.rooms.length) {
        return res.status(404).json({ error: "room not found" });
      }
      const nextRoomsFile: RoomsFile = { ...roomsFile, rooms: nextRooms };
      saveRoomsFile(nextRoomsFile);
      if (roomToDelete) {
        options.mqttService?.removeDiscovery(roomToDelete);
        console.log(`Deleted room ${roomToDelete.name}.`);
      }
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete room";
      console.error(`DELETE /api/rooms/${req.params.roomName} failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });

  // Replaces a single room configuration by id.
  app.put("/api/rooms/:roomName", (req, res) => {
    try {
      const roomName = req.params.roomName;
      const payload = req.body as RoomConfig;
      const roomsFile = loadRoomsFile();
      const index = roomsFile.rooms.findIndex((room) => room.name === roomName);
      if (index === -1) {
        return res.status(404).json({ error: "room not found" });
      }
      const nextRoomsFile: RoomsFile = {
        ...roomsFile,
        rooms: roomsFile.rooms.map((room) => (room.name === roomName ? payload : room))
      };
      validateRoomsFile(nextRoomsFile);
      saveRoomsFile(nextRoomsFile);
      options.mqttService?.publishDiscovery(payload, { force: true });
      console.log(`Updated room ${roomName}.`);
      return res.json(nextRoomsFile.rooms[index]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid room payload";
      console.error(`PUT /api/rooms/${req.params.roomName} failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });

  // Creates a new mode for a room.
  app.post("/api/rooms/:roomName/modes", (req, res) => {
    try {
      const roomName = req.params.roomName;
      const { name, schedule } = req.body as {
        name?: string;
        schedule?: RoomConfig["modes"][number]["schedule"];
      };
      if (!name) {
        throw new Error("mode name is required");
      }
      const roomsFile = loadRoomsFile();
      const room = roomsFile.rooms.find((entry) => entry.name === roomName);
      if (!room) {
        return res.status(404).json({ error: "room not found" });
      }
      if (room.modes.some((mode) => mode.name === name)) {
        return res.status(400).json({ error: "mode name already exists" });
      }
      const mode = createMode(name, schedule ?? DEFAULT_BLOCKS);
      room.modes.push(mode);
      validateRoomsFile(roomsFile);
      saveRoomsFile(roomsFile);
      options.mqttService?.publishDiscovery(room, { force: true });
      console.log(`Created mode ${name} for room ${roomName}.`);
      return res.status(201).json(mode);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid mode payload";
      console.error(`POST /api/rooms/${req.params.roomName}/modes failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });

  // Deletes a mode from a room.
  app.delete("/api/rooms/:roomName/modes/:modeName", (req, res) => {
    try {
      const roomName = req.params.roomName;
      const modeName = req.params.modeName;
      const roomsFile = loadRoomsFile();
      const room = roomsFile.rooms.find((entry) => entry.name === roomName);
      if (!room) {
        return res.status(404).json({ error: "room not found" });
      }
      if (room.modes.length <= 1) {
        return res.status(400).json({ error: "room must have at least one mode" });
      }
      const nextModes = room.modes.filter((mode) => mode.name !== modeName);
      if (nextModes.length === room.modes.length) {
        return res.status(404).json({ error: "mode not found" });
      }
      room.modes = nextModes;
      if (!room.modes.some((mode) => mode.name === room.activeModeName)) {
        room.activeModeName = room.modes[0].name;
      }
      saveRoomsFile(roomsFile);
      options.mqttService?.publishDiscovery(room, { force: true });
      console.log(`Deleted mode ${modeName} from room ${roomName}.`);
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete mode";
      console.error(
        `DELETE /api/rooms/${req.params.roomName}/modes/${req.params.modeName} failed: ${message}`
      );
      return res.status(400).json({ error: message });
    }
  });

  // Updates the active mode for a room.
  app.patch("/api/rooms/:roomName/active-mode", (req, res) => {
    try {
      const roomName = req.params.roomName;
      const { activeModeName } = req.body as { activeModeName?: string };
      if (!activeModeName) {
        throw new Error("activeModeName is required");
      }
      const roomsFile = loadRoomsFile();
      const room = roomsFile.rooms.find((entry) => entry.name === roomName);
      if (!room) {
        return res.status(404).json({ error: "room not found" });
      }
      if (!room.modes.some((mode) => mode.name === activeModeName)) {
        return res.status(400).json({ error: "mode not found in room" });
      }
      room.activeModeName = activeModeName;
      saveRoomsFile(roomsFile);
      publishRoomStateIfPossible(room);
      console.log(`Updated active mode for room ${roomName} to ${activeModeName}.`);
      return res.json(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid active mode payload";
      console.error(
        `PATCH /api/rooms/${req.params.roomName}/active-mode failed: ${message}`
      );
      return res.status(400).json({ error: message });
    }
  });

  // Replaces a schedule for a specific room mode.
  app.put("/api/rooms/:roomName/modes/:modeName/schedule", (req, res) => {
    try {
      const roomName = req.params.roomName;
      const modeName = req.params.modeName;
      const { schedule } = req.body as { schedule?: RoomConfig["modes"][number]["schedule"] };
      if (!Array.isArray(schedule)) {
        throw new Error("schedule must be an array");
      }
      const roomsFile = loadRoomsFile();
      const room = roomsFile.rooms.find((entry) => entry.name === roomName);
      if (!room) {
        return res.status(404).json({ error: "room not found" });
      }
      const mode = room.modes.find((entry) => entry.name === modeName);
      if (!mode) {
        return res.status(404).json({ error: "mode not found" });
      }
      mode.schedule = schedule;
      validateRoomsFile(roomsFile);
      saveRoomsFile(roomsFile);
      publishRoomStateIfPossible(room);
      console.log(`Updated schedule for room ${roomName} mode ${modeName}.`);
      return res.json(mode);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid schedule payload";
      console.error(
        `PUT /api/rooms/${req.params.roomName}/modes/${req.params.modeName}/schedule failed: ${message}`
      );
      return res.status(400).json({ error: message });
    }
  });

  app.use(express.static(publicDir));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  return app;
}
