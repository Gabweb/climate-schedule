import type { Express } from "express";
import type { WaterHeaterConfig } from "../../../shared/models";
import {
  defaultWaterHeaterConfig,
  loadWaterHeaterConfig,
  saveWaterHeaterConfig,
  validateWaterHeaterConfig
} from "../waterHeater";

export function registerWaterHeaterRoutes(app: Express): void {
  // Returns water heater configuration.
  app.get("/api/water-heater", (_req, res) => {
    const config = loadWaterHeaterConfig();
    res.json(config);
  });

  // Replaces full water heater configuration.
  app.put("/api/water-heater", (req, res) => {
    try {
      const payload = validateWaterHeaterConfig(req.body);
      saveWaterHeaterConfig(payload);
      console.log("Updated water heater config.");
      return res.json(loadWaterHeaterConfig());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid water heater payload";
      console.error(`PUT /api/water-heater failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });

  // Updates active water heater mode.
  app.patch("/api/water-heater/active-mode", (req, res) => {
    try {
      const { activeModeName } = req.body as { activeModeName?: string };
      if (!activeModeName) {
        throw new Error("activeModeName is required");
      }
      const config = loadWaterHeaterConfig();
      if (!config.modes.some((mode) => mode.name === activeModeName)) {
        return res.status(400).json({ error: "mode not found" });
      }
      config.activeModeName = activeModeName;
      saveWaterHeaterConfig(config);
      console.log(`Updated water heater active mode to ${activeModeName}.`);
      return res.json(config);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid active mode payload";
      console.error(`PATCH /api/water-heater/active-mode failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });

  // Creates a water heater mode.
  app.post("/api/water-heater/modes", (req, res) => {
    try {
      const { name, schedule } = req.body as {
        name?: string;
        schedule?: WaterHeaterConfig["modes"][number]["schedule"];
      };
      if (!name) {
        throw new Error("mode name is required");
      }
      const config = loadWaterHeaterConfig();
      if (config.modes.some((mode) => mode.name === name)) {
        return res.status(400).json({ error: "mode name already exists" });
      }
      const fallbackSchedule = defaultWaterHeaterConfig().modes[0].schedule;
      config.modes.push({ name, schedule: schedule ?? fallbackSchedule });
      validateWaterHeaterConfig(config);
      saveWaterHeaterConfig(config);
      console.log(`Created water heater mode ${name}.`);
      return res.status(201).json(config.modes[config.modes.length - 1]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid mode payload";
      console.error(`POST /api/water-heater/modes failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });

  // Deletes a water heater mode.
  app.delete("/api/water-heater/modes/:modeName", (req, res) => {
    try {
      const modeName = req.params.modeName;
      const config = loadWaterHeaterConfig();
      if (config.modes.length <= 1) {
        return res.status(400).json({ error: "water heater must have at least one mode" });
      }
      const nextModes = config.modes.filter((mode) => mode.name !== modeName);
      if (nextModes.length === config.modes.length) {
        return res.status(404).json({ error: "mode not found" });
      }
      config.modes = nextModes;
      if (!config.modes.some((mode) => mode.name === config.activeModeName)) {
        config.activeModeName = config.modes[0].name;
      }
      saveWaterHeaterConfig(config);
      console.log(`Deleted water heater mode ${modeName}.`);
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete mode";
      console.error(`DELETE /api/water-heater/modes/${req.params.modeName} failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });

  // Replaces schedule of a water heater mode.
  app.put("/api/water-heater/modes/:modeName/schedule", (req, res) => {
    try {
      const modeName = req.params.modeName;
      const { schedule } = req.body as { schedule?: WaterHeaterConfig["modes"][number]["schedule"] };
      if (!Array.isArray(schedule)) {
        throw new Error("schedule must be an array");
      }
      const config = loadWaterHeaterConfig();
      const mode = config.modes.find((entry) => entry.name === modeName);
      if (!mode) {
        return res.status(404).json({ error: "mode not found" });
      }
      mode.schedule = schedule;
      validateWaterHeaterConfig(config);
      saveWaterHeaterConfig(config);
      console.log(`Updated water heater schedule for mode ${modeName}.`);
      return res.json(mode);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid schedule payload";
      console.error(`PUT /api/water-heater/modes/${req.params.modeName}/schedule failed: ${message}`);
      return res.status(400).json({ error: message });
    }
  });
}
