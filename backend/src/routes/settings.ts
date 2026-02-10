import type { Express } from "express";
import { loadSettings, saveSettings, validateSettings } from "../settings";

export function registerSettingsRoutes(app: Express): void {
  // Returns global settings shared across all rooms.
  app.get("/api/settings", (_req, res) => {
    const settings = loadSettings();
    res.json(settings);
  });

  // Replaces global settings.
  app.put("/api/settings", (req, res) => {
    try {
      const payload = validateSettings(req.body);
      saveSettings(payload);
      console.log(`Updated global settings (holidayModeEnabled=${payload.holidayModeEnabled}).`);
      return res.json(loadSettings());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid settings payload";
      console.error(`PUT /api/settings failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });
}
