import type { RoomConfig, RoomsFile } from "../../shared/models";
import { validateGranularity, validateScheduleBlocks } from "../../shared/schedule";

const FLOOR_LEVELS = new Set(["UG", "EG", "1OG", "2OG"]);

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateRoomsFile(data: unknown): RoomsFile {
  if (!data || typeof data !== "object") {
    throw new Error("rooms payload must be an object");
  }

  const version = (data as RoomsFile).version;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    throw new Error("rooms version must be an integer");
  }

  const rooms = (data as RoomsFile).rooms;
  if (!Array.isArray(rooms)) {
    throw new Error("rooms must be an array");
  }

  rooms.forEach((room, index) => validateRoom(room, index));

  return data as RoomsFile;
}

export function validateRoom(room: RoomConfig, index = 0): void {
  if (!isString(room.name)) throw new Error(`rooms[${index}].name must be a string`);
  if (!isString(room.floor) || !FLOOR_LEVELS.has(room.floor)) {
    throw new Error(`rooms[${index}].floor must be one of UG, EG, 1OG, 2OG`);
  }
  if (!Array.isArray(room.entities)) throw new Error(`rooms[${index}].entities must be an array`);
  room.entities.forEach((entity, eIndex) => {
    if (!entity || typeof entity !== "object") {
      throw new Error(`rooms[${index}].entities[${eIndex}] must be an object`);
    }
    if (entity.type !== "ha_climate") {
      throw new Error(`rooms[${index}].entities[${eIndex}].type must be ha_climate`);
    }
    if (!isString(entity.entityId)) {
      throw new Error(`rooms[${index}].entities[${eIndex}].entityId must be a string`);
    }
  });

  if (!Array.isArray(room.modes)) throw new Error(`rooms[${index}].modes must be an array`);
  room.modes.forEach((mode, mIndex) => {
    if (!isString(mode.name)) throw new Error(`rooms[${index}].modes[${mIndex}].name must be a string`);
    if (!Array.isArray(mode.schedule)) {
      throw new Error(`rooms[${index}].modes[${mIndex}].schedule must be an array`);
    }
    mode.schedule.forEach((block, bIndex) => {
      if (!isString(block.start)) {
        throw new Error(`rooms[${index}].modes[${mIndex}].schedule[${bIndex}].start must be a string`);
      }
      if (!isString(block.end)) {
        throw new Error(`rooms[${index}].modes[${mIndex}].schedule[${bIndex}].end must be a string`);
      }
      if (!isNumber(block.targetC)) {
        throw new Error(`rooms[${index}].modes[${mIndex}].schedule[${bIndex}].targetC must be a number`);
      }
    });

    validateScheduleBlocks(mode.schedule);
    validateGranularity(mode.schedule, 10);
  });

  if (!isString(room.activeModeName)) {
    throw new Error(`rooms[${index}].activeModeName must be a string`);
  }
}
