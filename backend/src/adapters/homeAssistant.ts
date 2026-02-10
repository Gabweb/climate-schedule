import type { ClimateAdapter, ClimateTarget } from "./climate";

export type HomeAssistantConfig = {
  baseUrl: string;
  token: string;
};

export class HomeAssistantClimateAdapter implements ClimateAdapter {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: HomeAssistantConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token;
  }

  async setTargetTemperature(target: ClimateTarget): Promise<void> {
    const url = `${this.baseUrl}/api/services/climate/set_temperature`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        entity_id: target.entityId,
        temperature: target.temperatureC
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HA service call failed: ${response.status} ${body}`);
    }
  }

  async getCurrentTemperature(entityId: string): Promise<number | null> {
    const url = `${this.baseUrl}/api/states/${encodeURIComponent(entityId)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HA state fetch failed: ${response.status} ${body}`);
    }
    const data = (await response.json()) as { attributes?: { current_temperature?: number } };
    const current = data?.attributes?.current_temperature;
    return typeof current === "number" ? current : null;
  }

  async turnOff(entityId: string): Promise<void> {
    const url = `${this.baseUrl}/api/services/climate/turn_off`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ entity_id: entityId })
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HA turn_off failed: ${response.status} ${body}`);
    }
  }
}

export function createHomeAssistantAdapterFromEnv(): ClimateAdapter {
  const config = getHomeAssistantConfigFromEnv();
  if (!config) {
    throw new Error("HA_BASE_URL/HA_TOKEN or SUPERVISOR_TOKEN must be set for HomeAssistant adapter");
  }
  return new HomeAssistantClimateAdapter(config);
}

export function getHomeAssistantConfigFromEnv(): HomeAssistantConfig | null {
  if (process.env.SUPERVISOR_TOKEN) {
    return { baseUrl: "http://supervisor/core", token: process.env.SUPERVISOR_TOKEN };
  }
  if (process.env.HA_BASE_URL && process.env.HA_TOKEN) {
    return { baseUrl: process.env.HA_BASE_URL, token: process.env.HA_TOKEN };
  }
  return null
}

export async function validateEntitiesExist(
  config: HomeAssistantConfig,
  entityIds: string[]
): Promise<{ missing: string[]; errors: string[] }> {
  const unique = Array.from(new Set(entityIds));
  const missing: string[] = [];
  const errors: string[] = [];

  await Promise.all(
    unique.map(async (entityId) => {
      try {
        const url = `${config.baseUrl.replace(/\/$/, "")}/api/states/${encodeURIComponent(entityId)}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${config.token}`,
            "Content-Type": "application/json"
          }
        });
        if (response.status === 404) {
          missing.push(entityId);
          return;
        }
        if (!response.ok) {
          const body = await response.text().catch(() => "");
          errors.push(`${entityId}: ${response.status} ${body}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        errors.push(`${entityId}: ${message}`);
      }
    })
  );

  return { missing, errors };
}
