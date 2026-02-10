import express from "express";
import path from "path";
import type { MqttService } from "./mqtt/service";
import { registerRoomRoutes } from "./routes/rooms";
import { registerSettingsRoutes } from "./routes/settings";
import { registerStatusRoutes } from "./routes/status";
import { registerWaterHeaterRoutes } from "./routes/waterHeater";

export type AppOptions = {
  publicDir?: string;
  mqttService?: MqttService;
};

export function createApp(options: AppOptions = {}) {
  const app = express();
  const publicDir =
    options.publicDir || process.env.PUBLIC_DIR || path.resolve(process.cwd(), "public");
  const timeZone = "Europe/Berlin";

  app.use(express.json());

  // Health check endpoint used during development.
  app.get("/api/hello", (_req, res) => {
    res.json({ message: "hello world" });
  });

  registerSettingsRoutes(app);
  registerStatusRoutes(app);
  registerRoomRoutes(app, { mqttService: options.mqttService, timeZone });
  registerWaterHeaterRoutes(app);

  app.use(express.static(publicDir));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  return app;
}
