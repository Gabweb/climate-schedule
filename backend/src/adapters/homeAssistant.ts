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
}

export function createHomeAssistantAdapterFromEnv(): ClimateAdapter {
  const baseUrl = process.env.HA_BASE_URL ?? "http://supervisor/core";
  const token = process.env.HA_TOKEN ?? process.env.SUPERVISOR_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("HA_BASE_URL/HA_TOKEN or SUPERVISOR_TOKEN must be set for HomeAssistant adapter");
  }
  return new HomeAssistantClimateAdapter({ baseUrl, token });
}
