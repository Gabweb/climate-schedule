import type { Express } from "express";
import type { MqttService } from "../mqtt/service";
import { registerRoomModeRoutes } from "./roomModes";
import { registerRoomsCrudRoutes } from "./roomsCrud";

export type RegisterRoomRoutesOptions = {
  mqttService?: MqttService;
  timeZone: string;
};

export function registerRoomRoutes(app: Express, options: RegisterRoomRoutesOptions): void {
  registerRoomsCrudRoutes(app, { mqttService: options.mqttService });
  registerRoomModeRoutes(app, options);
}
