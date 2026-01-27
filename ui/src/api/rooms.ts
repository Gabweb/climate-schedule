import type { RoomConfig, RoomsFile, ScheduleBlock } from "../../../shared/models";

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function fetchRooms(): Promise<RoomsFile> {
  return request<RoomsFile>("/api/rooms");
}

export async function createRoom(payload: {
  name: string;
  floor: RoomConfig["floor"];
  entities: RoomConfig["entities"];
}): Promise<RoomConfig> {
  return request<RoomConfig>("/api/rooms", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function deleteRoom(roomId: string): Promise<void> {
  return request<void>(`/api/rooms/${roomId}`, { method: "DELETE" });
}

export async function updateRoom(roomId: string, payload: RoomConfig): Promise<RoomConfig> {
  return request<RoomConfig>(`/api/rooms/${roomId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function setActiveMode(roomId: string, activeModeName: string): Promise<RoomConfig> {
  return request<RoomConfig>(`/api/rooms/${roomId}/active-mode`, {
    method: "PATCH",
    body: JSON.stringify({ activeModeName })
  });
}

export async function createMode(
  roomId: string,
  payload: { name: string; schedule?: ScheduleBlock[] }
) {
  return request(`/api/rooms/${roomId}/modes`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function deleteMode(roomId: string, modeName: string): Promise<void> {
  return request<void>(`/api/rooms/${roomId}/modes/${modeName}`, { method: "DELETE" });
}

export async function updateSchedule(
  roomId: string,
  modeName: string,
  schedule: ScheduleBlock[]
) {
  return request(`/api/rooms/${roomId}/modes/${modeName}/schedule`, {
    method: "PUT",
    body: JSON.stringify({ schedule })
  });
}
