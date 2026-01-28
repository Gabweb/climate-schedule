import type { FloorLevel, RoomConfig } from "./models";

export function roomKeyFromParts(floor: FloorLevel, name: string): string {
  return `${floor}::${name}`;
}

export function roomKey(room: Pick<RoomConfig, "floor" | "name">): string {
  return roomKeyFromParts(room.floor, room.name);
}
