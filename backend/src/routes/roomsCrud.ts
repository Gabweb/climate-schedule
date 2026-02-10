import type { Express } from "express";
import type { RoomConfig, RoomsFile } from "../../../shared/models";
import { roomKey } from "../../../shared/roomKey";
import { createRoom, loadRoomsFile, saveRoomsFile } from "../rooms";
import { validateRoomsFile } from "../validation";
import type { MqttService } from "../mqtt/service";

export type RegisterRoomsCrudOptions = {
  mqttService?: MqttService;
};

export function registerRoomsCrudRoutes(app: Express, options: RegisterRoomsCrudOptions): void {
  const findRoomIndex = (rooms: RoomConfig[], key: string) =>
    rooms.findIndex((entry) => roomKey(entry) === key);

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
      const nextKey = roomKey({ name: input.name, floor: input.floor });
      if (roomsFile.rooms.some((room) => roomKey(room) === nextKey)) {
        throw new Error("room with the same floor and name already exists");
      }
      const created = createRoom(input);
      roomsFile.rooms.push(created);
      validateRoomsFile(roomsFile);
      saveRoomsFile(roomsFile);
      options.mqttService?.publishDiscovery(created, { force: true });
      console.log(`Created room ${roomKey(created)}.`);
      res.status(201).json(created);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid room payload";
      console.error(`POST /api/rooms failed: ${message}`);
      res.status(400).json({ error: message });
    }
  });

  // Deletes a room by id.
  app.delete("/api/rooms/:roomKey", (req, res) => {
    try {
      const roomsFile = loadRoomsFile();
      const roomKeyParam = req.params.roomKey;
      const index = findRoomIndex(roomsFile.rooms, roomKeyParam);
      if (index === -1) {
        return res.status(404).json({ error: "room not found" });
      }
      const roomToDelete = roomsFile.rooms[index];
      const nextRooms = roomsFile.rooms.filter((_, idx) => idx !== index);
      const nextRoomsFile: RoomsFile = { ...roomsFile, rooms: nextRooms };
      saveRoomsFile(nextRoomsFile);
      if (roomToDelete) {
        options.mqttService?.removeDiscovery(roomToDelete);
        console.log(`Deleted room ${roomToDelete.name}.`);
      }
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete room";
      console.error(`DELETE /api/rooms/${req.params.roomKey} failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });

  // Replaces a single room configuration by id.
  app.put("/api/rooms/:roomKey", (req, res) => {
    try {
      const roomKeyParam = req.params.roomKey;
      const payload = req.body as RoomConfig;
      const roomsFile = loadRoomsFile();
      const index = findRoomIndex(roomsFile.rooms, roomKeyParam);
      if (index === -1) {
        return res.status(404).json({ error: "room not found" });
      }
      const nextRoomsFile: RoomsFile = {
        ...roomsFile,
        rooms: roomsFile.rooms.map((room, idx) => (idx === index ? payload : room))
      };
      validateRoomsFile(nextRoomsFile);
      saveRoomsFile(nextRoomsFile);
      options.mqttService?.publishDiscovery(payload, { force: true });
      console.log(`Updated room ${payload.name}.`);
      return res.json(nextRoomsFile.rooms[index]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid room payload";
      console.error(`PUT /api/rooms/${req.params.roomKey} failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });
}
