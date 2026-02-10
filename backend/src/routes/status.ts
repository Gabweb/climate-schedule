import type { Express } from "express";
import { getRuntimeStatus } from "../runtimeStatus";

export function registerStatusRoutes(app: Express): void {
  // Returns transient runtime status (not persisted).
  app.get("/api/status", (_req, res) => {
    res.json(getRuntimeStatus());
  });
}
