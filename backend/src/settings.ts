import fs from "fs";
import path from "path";
import type { GlobalSettings } from "../../shared/models";
import { dataDir, ensureDataDir } from "./rooms";

export const CURRENT_SETTINGS_VERSION = 1;

export function settingsFilePath(): string {
  return path.join(dataDir(), "settings.json");
}

export function defaultSettings(): GlobalSettings {
  return {
    version: CURRENT_SETTINGS_VERSION,
    holidayModeEnabled: false
  };
}

type MigrateResult<T> = {
  data: T;
  changed: boolean;
};

function migrateSettings(input: unknown): MigrateResult<GlobalSettings> {
  if (!input || typeof input !== "object") {
    throw new Error("settings payload must be an object");
  }

  const candidate = input as Partial<GlobalSettings>;
  let changed = false;

  if (candidate.version === undefined && typeof candidate.holidayModeEnabled === "boolean") {
    candidate.version = 1;
    changed = true;
  }

  if (typeof candidate.version !== "number" || !Number.isInteger(candidate.version)) {
    throw new Error("settings version must be an integer");
  }

  if (candidate.version > CURRENT_SETTINGS_VERSION) {
    throw new Error(
      `settings version ${candidate.version} is newer than supported version ${CURRENT_SETTINGS_VERSION}`
    );
  }

  // Future migrations should be applied step-by-step here.
  while (candidate.version < CURRENT_SETTINGS_VERSION) {
    throw new Error(`No migration implemented for settings version ${candidate.version}`);
  }

  return {
    data: candidate as GlobalSettings,
    changed
  };
}

export function loadSettings(): GlobalSettings {
  ensureDataDir();
  const filePath = settingsFilePath();
  if (!fs.existsSync(filePath)) {
    const initial = defaultSettings();
    saveSettings(initial);
    return initial;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  const migrated = migrateSettings(parsed);
  const validated = validateSettings(migrated.data);
  if (migrated.changed) {
    saveSettings(validated);
  }
  return validated;
}

export function saveSettings(settings: GlobalSettings): void {
  ensureDataDir();
  const normalized: GlobalSettings = {
    version: settings.version ?? CURRENT_SETTINGS_VERSION,
    holidayModeEnabled: Boolean(settings.holidayModeEnabled)
  };
  fs.writeFileSync(settingsFilePath(), JSON.stringify(normalized, null, 2), "utf-8");
}

export function validateSettings(data: unknown): GlobalSettings {
  if (!data || typeof data !== "object") {
    throw new Error("settings payload must be an object");
  }
  const value = data as Partial<GlobalSettings>;
  if (typeof value.version !== "number" || !Number.isInteger(value.version)) {
    throw new Error("settings version must be an integer");
  }
  if (typeof value.holidayModeEnabled !== "boolean") {
    throw new Error("holidayModeEnabled must be a boolean");
  }
  return {
    version: value.version,
    holidayModeEnabled: value.holidayModeEnabled
  };
}
