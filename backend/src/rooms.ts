import fs from "fs";
import path from "path";
import type { RoomConfig, RoomMode, RoomsFile, ScheduleBlock } from "../../shared/models";
import { validateRoomsFile } from "./validation";

export const CURRENT_ROOMS_VERSION = 1;

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
    version: CURRENT_ROOMS_VERSION,
    rooms: [],
    updatedAt: new Date().toISOString()
  };
}

type MigrateResult<T> = {
  data: T;
  changed: boolean;
};

function migrateRoomsFile(input: unknown): MigrateResult<RoomsFile> {
  if (!input || typeof input !== "object") {
    throw new Error("rooms payload must be an object");
  }

  const candidate = input as Partial<RoomsFile>;
  let changed = false;

  if (candidate.version === undefined && Array.isArray(candidate.rooms)) {
    candidate.version = 1;
    changed = true;
  }

  if (typeof candidate.version !== "number" || !Number.isInteger(candidate.version)) {
    throw new Error("rooms version must be an integer");
  }

  if (candidate.version > CURRENT_ROOMS_VERSION) {
    throw new Error(
      `rooms version ${candidate.version} is newer than supported version ${CURRENT_ROOMS_VERSION}`
    );
  }

  // Future migrations should be applied step-by-step here.
  while (candidate.version < CURRENT_ROOMS_VERSION) {
    throw new Error(`No migration implemented for rooms version ${candidate.version}`);
  }

  return {
    data: candidate as RoomsFile,
    changed
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
  const parsed = JSON.parse(raw) as unknown;
  const migrated = migrateRoomsFile(parsed);
  const validated = validateRoomsFile(migrated.data);
  if (migrated.changed) {
    saveRoomsFile(validated);
  }
  return validated;
}

export function saveRoomsFile(data: RoomsFile): void {
  ensureDataDir();
  const withMeta: RoomsFile = {
    ...data,
    version: data.version ?? CURRENT_ROOMS_VERSION,
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
