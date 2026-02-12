import fs from "fs";
import path from "path";
import type { WaterHeaterConfig } from "../../shared/models";
import { validateGranularity, validateScheduleBlocks } from "../../shared/schedule";
import { dataDir, ensureDataDir } from "./rooms";
import {
  clampWaterHeaterTemperature,
  DEFAULT_WATER_HEATER_TEMPERATURE_C
} from "../../shared/waterHeater";

export const CURRENT_WATER_HEATER_VERSION = 2;

export function waterHeaterFilePath(): string {
  return path.join(dataDir(), "water-heater.json");
}

export function defaultWaterHeaterConfig(): WaterHeaterConfig {
  return {
    version: CURRENT_WATER_HEATER_VERSION,
    entityId: "",
    heatingTemperatureC: DEFAULT_WATER_HEATER_TEMPERATURE_C,
    activeModeName: "Default",
    modes: [
      {
        name: "Default",
        schedule: [{ start: "00:00", end: "23:59", enabled: false }]
      }
    ],
    updatedAt: new Date().toISOString()
  };
}

export function validateWaterHeaterConfig(data: unknown): WaterHeaterConfig {
  if (!data || typeof data !== "object") {
    throw new Error("water heater payload must be an object");
  }
  const value = data as Partial<WaterHeaterConfig>;
  if (typeof value.version !== "number" || !Number.isInteger(value.version)) {
    throw new Error("water heater version must be an integer");
  }
  if (typeof value.entityId !== "string") {
    throw new Error("water heater entityId must be a string");
  }
  if (typeof value.heatingTemperatureC !== "number" || !Number.isFinite(value.heatingTemperatureC)) {
    throw new Error("water heater heatingTemperatureC must be a number");
  }
  if (typeof value.activeModeName !== "string") {
    throw new Error("water heater activeModeName must be a string");
  }
  if (!Array.isArray(value.modes) || value.modes.length === 0) {
    throw new Error("water heater must include at least one mode");
  }
  for (const mode of value.modes) {
    if (!mode || typeof mode !== "object" || typeof mode.name !== "string") {
      throw new Error("water heater mode must include a name");
    }
    if (!Array.isArray(mode.schedule)) {
      throw new Error(`water heater mode ${mode.name} must include a schedule`);
    }
    for (const block of mode.schedule) {
      if (typeof block.enabled !== "boolean") {
        throw new Error(`water heater mode ${mode.name} schedule block enabled must be boolean`);
      }
    }
    validateScheduleBlocks(mode.schedule);
    validateGranularity(mode.schedule, 10);
  }
  if (!value.modes.some((mode) => mode.name === value.activeModeName)) {
    throw new Error("water heater active mode must exist");
  }
  return {
    version: value.version,
    entityId: value.entityId,
    heatingTemperatureC: clampWaterHeaterTemperature(value.heatingTemperatureC),
    activeModeName: value.activeModeName,
    modes: value.modes,
    updatedAt:
      typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString()
  };
}

type MigrateResult<T> = { data: T; changed: boolean };

function migrateWaterHeaterConfig(input: unknown): MigrateResult<WaterHeaterConfig> {
  if (!input || typeof input !== "object") {
    throw new Error("water heater payload must be an object");
  }
  const candidate = input as Partial<WaterHeaterConfig>;
  let changed = false;

  if (candidate.version === undefined && Array.isArray(candidate.modes)) {
    candidate.version = 1;
    changed = true;
  }

  if (typeof candidate.version !== "number" || !Number.isInteger(candidate.version)) {
    throw new Error("water heater version must be an integer");
  }
  if (candidate.version > CURRENT_WATER_HEATER_VERSION) {
    throw new Error(
      `water heater version ${candidate.version} is newer than supported version ${CURRENT_WATER_HEATER_VERSION}`
    );
  }
  while (candidate.version < CURRENT_WATER_HEATER_VERSION) {
    if (candidate.version === 1) {
      const anyCandidate = candidate as {
        version: number;
        entityId?: string;
        activeModeName?: string;
        modes?: Array<{ name: string; schedule: Array<{ start: string; end: string; targetC: number }> }>;
        updatedAt?: string;
      };
      candidate.version = 2;
      candidate.entityId = anyCandidate.entityId ?? "";
      candidate.activeModeName = anyCandidate.activeModeName ?? "Default";
      candidate.heatingTemperatureC = DEFAULT_WATER_HEATER_TEMPERATURE_C;
      candidate.updatedAt = anyCandidate.updatedAt ?? new Date().toISOString();
      candidate.modes = (anyCandidate.modes ?? []).map((mode) => ({
        name: mode.name,
        schedule: mode.schedule.map((block) => ({
          start: block.start,
          end: block.end,
          enabled: block.targetC >= 30
        }))
      }));
      changed = true;
      continue;
    }
    throw new Error(`No migration implemented for water heater version ${candidate.version}`);
  }

  return { data: candidate as WaterHeaterConfig, changed };
}

export function loadWaterHeaterConfig(): WaterHeaterConfig {
  ensureDataDir();
  const filePath = waterHeaterFilePath();
  if (!fs.existsSync(filePath)) {
    const initial = defaultWaterHeaterConfig();
    saveWaterHeaterConfig(initial);
    return initial;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const migrated = migrateWaterHeaterConfig(parsed);
  const validated = validateWaterHeaterConfig(migrated.data);
  if (migrated.changed) {
    saveWaterHeaterConfig(validated);
  }
  return validated;
}

export function saveWaterHeaterConfig(config: WaterHeaterConfig): void {
  ensureDataDir();
  const normalized: WaterHeaterConfig = {
    ...config,
    version: config.version ?? CURRENT_WATER_HEATER_VERSION,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(waterHeaterFilePath(), JSON.stringify(normalized, null, 2), "utf-8");
}
