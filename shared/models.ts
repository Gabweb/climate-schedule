export type FloorLevel = "UG" | "EG" | "1OG" | "2OG";

export type ClimateEntity = {
  type: "ha_climate";
  entityId: string;
};

export type ScheduleBlock = {
  start: string; // HH:MM
  end: string; // HH:MM
  targetC: number;
};

export type RoomMode = {
  name: string;
  schedule: ScheduleBlock[];
};

export type RoomConfig = {
  name: string;
  floor: FloorLevel;
  entities: ClimateEntity[];
  modes: RoomMode[];
  activeModeName: string;
};

export type RoomsFile = {
  version: number;
  rooms: RoomConfig[];
  updatedAt: string;
};
