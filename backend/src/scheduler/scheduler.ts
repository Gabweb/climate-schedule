import {
  minuteOfDayInTimeZone,
  findScheduleBlockAtMinute,
  minutesToTime
} from "../../../shared/schedule";
import type { RoomConfig } from "../../../shared/models";
import { activeScheduleForRoom, validateGranularity, validateScheduleBlocks } from "../schedule";
import type { ClimateAdapter } from "../adapters/climate";
import { loadRoomsFile } from "../rooms";
import type { MqttService } from "../mqtt/service";
import { roomKey } from "../../../shared/roomKey";
import { loadSettings } from "../settings";
import { applyGlobalTemperatureSettings } from "../../../shared/temperature";
import { loadWaterHeaterConfig } from "../waterHeater";
import { evaluateWaterHeaterAtMinute } from "../../../shared/waterHeater";

export type SchedulerOptions = {
  adapter: ClimateAdapter;
  timeZone?: string;
  intervalMs?: number;
  mqttService?: MqttService;
};

type LastApplied = Record<string, string>;

export function startScheduler(options: SchedulerOptions) {
  const timeZone = options.timeZone ?? "Europe/Berlin";
  const intervalMs = options.intervalMs ?? 60_000;
  const lastApplied: LastApplied = {};

  const tick = async () => {
    const roomsFile = loadRoomsFile();
    const settings = loadSettings();
    const nowMinute = minuteOfDayInTimeZone(new Date(), timeZone);
    const nextRunMinutes = Math.round(intervalMs / 60000);
    const targetSummary: string[] = [];

    for (const room of roomsFile.rooms) {
      try {
        const schedule = activeScheduleForRoom(room);
        validateScheduleBlocks(schedule);
        validateGranularity(schedule, 10);
        const block = findScheduleBlockAtMinute(schedule, nowMinute);
        if (!block) {
          targetSummary.push(`${roomKey(room)}: no block`);
          continue;
        }
        const targetC = applyGlobalTemperatureSettings(block.targetC, settings);
        targetSummary.push(
          `${roomKey(room)}(${room.activeModeName})=${targetC}C ${block.start}-${block.end}`
        );

        const primaryEntity = room.entities[0]?.entityId;
        let currentTemp: number | null = null;
        if (primaryEntity) {
          try {
            currentTemp = await options.adapter.getCurrentTemperature(primaryEntity);
          } catch (error) {
            const message = error instanceof Error ? error.message : "unknown temperature error";
            console.warn(`Scheduler room ${roomKey(room)} current temp error: ${message}`);
          }
        }

        for (const entity of room.entities) {
          const key = `${roomKey(room)}:${entity.entityId}`;
          if (lastApplied[key] === `temp:${targetC}`) {
            continue;
          }
          await options.adapter.setTargetTemperature({
            entityId: entity.entityId,
            temperatureC: targetC
          });
          lastApplied[key] = `temp:${targetC}`;
          console.log(
            `Scheduler applied ${targetC}C to ${entity.entityId} (room ${roomKey(room)}).`
          );
        }
        options.mqttService?.publishRoomState(room, targetC, currentTemp);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown scheduler error";
        console.error(`Scheduler room ${roomKey(room)} error: ${message}`);
      }
    }

    try {
      const waterHeater = loadWaterHeaterConfig();
      if (!waterHeater.entityId) {
        targetSummary.push("water-heater: no entity configured");
      } else {
        const waterHeaterState = evaluateWaterHeaterAtMinute(waterHeater, nowMinute, settings);
        const key = `water-heater:${waterHeater.entityId}`;
        if (waterHeaterState.isOff) {
          targetSummary.push(`water-heater(${waterHeater.activeModeName})=OFF`);
          if (lastApplied[key] !== "off") {
            await options.adapter.turnOff(waterHeater.entityId);
            lastApplied[key] = "off";
            console.log(`Scheduler turned off water heater ${waterHeater.entityId}.`);
          }
        } else if (typeof waterHeaterState.temperatureC === "number") {
          const targetC = waterHeaterState.temperatureC;
          targetSummary.push(`water-heater(${waterHeater.activeModeName})=${targetC}C`);
          if (lastApplied[key] !== `temp:${targetC}`) {
            await options.adapter.setTargetTemperature({
              entityId: waterHeater.entityId,
              temperatureC: targetC
            });
            lastApplied[key] = `temp:${targetC}`;
            console.log(`Scheduler applied ${targetC}C to water heater ${waterHeater.entityId}.`);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown water heater error";
      console.error(`Scheduler water heater error: ${message}`);
    }

    const summaryLines = targetSummary.map((entry) => `> ${entry}`).join("\n");
    console.log(
      `Scheduler tick ${minutesToTime(nowMinute)} (next in ${nextRunMinutes}m)\n${summaryLines}`
    );
  };

  const handle = setInterval(() => {
    tick().catch((error) => {
      const message = error instanceof Error ? error.message : "unknown scheduler error";
      console.error(`Scheduler tick error: ${message}`);
    });
  }, intervalMs);

  // Run immediately on start.
  tick().catch(() => undefined);

  return {
    stop: () => clearInterval(handle)
  };
}
