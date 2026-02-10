import type { ScheduleBlock, WaterHeaterConfig } from "../../../shared/models";

function apiUrl(path: string) {
  const normalized = path.replace(/^\/+/, "");
  try {
    return new URL(normalized, window.location.href).toString();
  } catch {
    return `./${normalized}`;
  }
}

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
  return (await response.json()) as T;
}

export async function fetchWaterHeater(): Promise<WaterHeaterConfig> {
  return request<WaterHeaterConfig>(apiUrl("api/water-heater"));
}

export async function updateWaterHeater(payload: WaterHeaterConfig): Promise<WaterHeaterConfig> {
  return request<WaterHeaterConfig>(apiUrl("api/water-heater"), {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function setWaterHeaterActiveMode(activeModeName: string): Promise<WaterHeaterConfig> {
  return request<WaterHeaterConfig>(apiUrl("api/water-heater/active-mode"), {
    method: "PATCH",
    body: JSON.stringify({ activeModeName })
  });
}

export async function createWaterHeaterMode(payload: {
  name: string;
  schedule?: ScheduleBlock[];
}) {
  return request<{ name: string; schedule: ScheduleBlock[] }>(apiUrl("api/water-heater/modes"), {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function deleteWaterHeaterMode(modeName: string) {
  const response = await fetch(apiUrl(`api/water-heater/modes/${encodeURIComponent(modeName)}`), {
    method: "DELETE"
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }
}

export async function updateWaterHeaterSchedule(modeName: string, schedule: ScheduleBlock[]) {
  return request<{ name: string; schedule: ScheduleBlock[] }>(
    apiUrl(`api/water-heater/modes/${encodeURIComponent(modeName)}/schedule`),
    {
      method: "PUT",
      body: JSON.stringify({ schedule })
    }
  );
}
