import fs from "fs";
import path from "path";
import type { RoomConfig, RoomMode, RoomsFile, ScheduleBlock } from "../../shared/models";

export const DEFAULT_BLOCKS: ScheduleBlock[] = [
  { start: "00:00", end: "08:00", targetC: 19 },
  { start: "08:00", end: "20:00", targetC: 20 },
  { start: "20:00", end: "23:59", targetC: 19 }
];

export function createMode(name: string, schedule: ScheduleBlock[] = DEFAULT_BLOCKS) {
  return {
    name,
    schedule
  } satisfies RoomMode;
}

function defaultMode() {
  return {
    name: "Default",
    schedule: DEFAULT_BLOCKS
  } satisfies RoomMode;
}

function defaultRoomsFile(): RoomsFile {
  return {
    version: 1,
    rooms: [],
    updatedAt: new Date().toISOString()
  };
}

export function dataDir(): string {
  return process.env.DATA_DIR || "/data";
}

export function roomsFilePath(): string {
  return path.join(dataDir(), "rooms.json");
}

export function ensureDataDir(): void {
  fs.mkdirSync(dataDir(), { recursive: true });
}

export function loadRoomsFile(): RoomsFile {
  ensureDataDir();
  const filePath = roomsFilePath();

  if (!fs.existsSync(filePath)) {
    const initial = defaultRoomsFile();
    saveRoomsFile(initial);
    return initial;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as RoomsFile;
  return parsed;
}

export function saveRoomsFile(data: RoomsFile): void {
  ensureDataDir();
  const withMeta: RoomsFile = {
    ...data,
    version: data.version ?? 1,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(roomsFilePath(), JSON.stringify(withMeta, null, 2), "utf-8");
}

export function createRoom(input: Omit<RoomConfig, "modes" | "activeModeName">): RoomConfig {
  const mode = defaultMode();
  return {
    ...input,
    modes: [mode],
    activeModeName: mode.name
  };
}
