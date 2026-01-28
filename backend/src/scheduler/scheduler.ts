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

export type SchedulerOptions = {
  adapter: ClimateAdapter;
  timeZone?: string;
  intervalMs?: number;
  mqttService?: MqttService;
};

type LastApplied = Record<string, number>;

export function startScheduler(options: SchedulerOptions) {
  const timeZone = options.timeZone ?? "Europe/Berlin";
  const intervalMs = options.intervalMs ?? 60_000;
  const lastApplied: LastApplied = {};

  const tick = async () => {
    const roomsFile = loadRoomsFile();
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
          targetSummary.push(`${room.name}: no block`);
          continue;
        }
        targetSummary.push(
          `${room.name}(${room.activeModeName})=${block.targetC}C ${block.start}-${block.end}`
        );

        const primaryEntity = room.entities[0]?.entityId;
        let currentTemp: number | null = null;
        if (primaryEntity) {
          try {
            currentTemp = await options.adapter.getCurrentTemperature(primaryEntity);
          } catch (error) {
            const message = error instanceof Error ? error.message : "unknown temperature error";
            console.warn(`Scheduler room ${room.name} current temp error: ${message}`);
          }
        }

        for (const entity of room.entities) {
          const key = `${room.name}:${entity.entityId}`;
          if (lastApplied[key] === block.targetC) {
            continue;
          }
          await options.adapter.setTargetTemperature({
            entityId: entity.entityId,
            temperatureC: block.targetC
          });
          lastApplied[key] = block.targetC;
          console.log(
            `Scheduler applied ${block.targetC}C to ${entity.entityId} (room ${room.name}).`
          );
        }
        options.mqttService?.publishRoomState(room, block.targetC, currentTemp);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown scheduler error";
        console.error(`Scheduler room ${room.name} error: ${message}`);
      }
    }

    console.log(
      `Scheduler tick ${minutesToTime(nowMinute)} (next in ${nextRunMinutes}m) targets: ${targetSummary.join(
        " | "
      )}`
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
