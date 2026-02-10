import type { Express } from "express";
import type { RoomConfig } from "../../../shared/models";
import { roomKey } from "../../../shared/roomKey";
import { createMode, DEFAULT_BLOCKS, loadRoomsFile, saveRoomsFile } from "../rooms";
import { validateRoomsFile } from "../validation";
import type { MqttService } from "../mqtt/service";
import { publishRoomStateIfPossible } from "../services/roomState";

export type RegisterRoomModesOptions = {
  mqttService?: MqttService;
  timeZone: string;
};

export function registerRoomModeRoutes(app: Express, options: RegisterRoomModesOptions): void {
  // Creates a new mode for a room.
  app.post("/api/rooms/:roomKey/modes", (req, res) => {
    try {
      const roomKeyParam = req.params.roomKey;
      const { name, schedule } = req.body as {
        name?: string;
        schedule?: RoomConfig["modes"][number]["schedule"];
      };
      if (!name) {
        throw new Error("mode name is required");
      }
      const roomsFile = loadRoomsFile();
      const room = roomsFile.rooms.find((entry) => roomKey(entry) === roomKeyParam);
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
      console.log(`Created mode ${name} for room ${roomKey(room)}.`);
      return res.status(201).json(mode);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid mode payload";
      console.error(`POST /api/rooms/${req.params.roomKey}/modes failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });

  // Deletes a mode from a room.
  app.delete("/api/rooms/:roomKey/modes/:modeName", (req, res) => {
    try {
      const roomKeyParam = req.params.roomKey;
      const modeName = req.params.modeName;
      const roomsFile = loadRoomsFile();
      const room = roomsFile.rooms.find((entry) => roomKey(entry) === roomKeyParam);
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
      console.log(`Deleted mode ${modeName} from room ${roomKey(room)}.`);
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete mode";
      console.error(
        `DELETE /api/rooms/${req.params.roomKey}/modes/${req.params.modeName} failed: ${message}`
      );
      return res.status(400).json({ error: message });
    }
  });

  // Updates the active mode for a room.
  app.patch("/api/rooms/:roomKey/active-mode", (req, res) => {
    try {
      const roomKeyParam = req.params.roomKey;
      const { activeModeName } = req.body as { activeModeName?: string };
      if (!activeModeName) {
        throw new Error("activeModeName is required");
      }
      const roomsFile = loadRoomsFile();
      const room = roomsFile.rooms.find((entry) => roomKey(entry) === roomKeyParam);
      if (!room) {
        return res.status(404).json({ error: "room not found" });
      }
      if (!room.modes.some((mode) => mode.name === activeModeName)) {
        return res.status(400).json({ error: "mode not found in room" });
      }
      room.activeModeName = activeModeName;
      saveRoomsFile(roomsFile);
      publishRoomStateIfPossible(room, options.mqttService, options.timeZone);
      console.log(`Updated active mode for room ${roomKey(room)} to ${activeModeName}.`);
      return res.json(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid active mode payload";
      console.error(`PATCH /api/rooms/${req.params.roomKey}/active-mode failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });

  // Replaces a schedule for a specific room mode.
  app.put("/api/rooms/:roomKey/modes/:modeName/schedule", (req, res) => {
    try {
      const roomKeyParam = req.params.roomKey;
      const modeName = req.params.modeName;
      const { schedule } = req.body as { schedule?: RoomConfig["modes"][number]["schedule"] };
      if (!Array.isArray(schedule)) {
        throw new Error("schedule must be an array");
      }
      const roomsFile = loadRoomsFile();
      const room = roomsFile.rooms.find((entry) => roomKey(entry) === roomKeyParam);
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
      publishRoomStateIfPossible(room, options.mqttService, options.timeZone);
      console.log(`Updated schedule for room ${roomKey(room)} mode ${modeName}.`);
      return res.json(mode);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid schedule payload";
      console.error(
        `PUT /api/rooms/${req.params.roomKey}/modes/${req.params.modeName}/schedule failed: ${message}`
      );
      return res.status(400).json({ error: message });
    }
  });
}
