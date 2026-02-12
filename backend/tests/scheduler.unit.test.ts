import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomConfig } from "../../shared/models";
import type { ClimateAdapter } from "../src/adapters/climate";
import type { MqttService } from "../src/mqtt/service";

const {
  loadRoomsFileMock,
  loadSettingsMock,
  minuteOfDayInTimeZoneMock,
  loadWaterHeaterConfigMock
} = vi.hoisted(() => ({
  loadRoomsFileMock: vi.fn(),
  loadSettingsMock: vi.fn(),
  minuteOfDayInTimeZoneMock: vi.fn(),
  loadWaterHeaterConfigMock: vi.fn()
}));

vi.mock("../src/rooms", () => ({
  loadRoomsFile: loadRoomsFileMock
}));

vi.mock("../src/settings", () => ({
  loadSettings: loadSettingsMock
}));

vi.mock("../src/waterHeater", () => ({
  loadWaterHeaterConfig: loadWaterHeaterConfigMock
}));

vi.mock("../../shared/schedule", async () => {
  const actual = await vi.importActual<typeof import("../../shared/schedule")>(
    "../../shared/schedule"
  );
  return {
    ...actual,
    minuteOfDayInTimeZone: minuteOfDayInTimeZoneMock
  };
});

import { startScheduler } from "../src/scheduler/scheduler";

const roomFixture: RoomConfig = {
  name: "Office",
  floor: "EG",
  entities: [{ type: "ha_climate", entityId: "climate.office" }],
  activeModeName: "Default",
  modes: [
    {
      name: "Default",
      schedule: [
        { start: "00:00", end: "08:00", targetC: 19 },
        { start: "08:00", end: "20:00", targetC: 20 },
        { start: "20:00", end: "23:59", targetC: 19 }
      ]
    }
  ]
};

describe("scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loadRoomsFileMock.mockReturnValue({
      version: 1,
      updatedAt: new Date().toISOString(),
      rooms: [roomFixture]
    });
    loadSettingsMock.mockReturnValue({ version: 1, holidayModeEnabled: true });
    minuteOfDayInTimeZoneMock.mockReturnValue(9 * 60);
    loadWaterHeaterConfigMock.mockReturnValue({
      version: 2,
      entityId: "climate.water_heater",
      heatingTemperatureC: 55,
      activeModeName: "Default",
      modes: [{ name: "Default", schedule: [{ start: "00:00", end: "23:59", enabled: false }] }],
      updatedAt: new Date().toISOString()
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("applies holiday-adjusted target and publishes mqtt state", async () => {
    const adapter: ClimateAdapter = {
      setTargetTemperature: vi.fn().mockResolvedValue(undefined),
      getCurrentTemperature: vi.fn().mockResolvedValue(21),
      turnOff: vi.fn().mockResolvedValue(undefined)
    };
    const mqttService: MqttService = {
      initializeRooms: vi.fn(),
      publishDiscovery: vi.fn(),
      removeDiscovery: vi.fn(),
      publishRoomState: vi.fn(),
      waitForConnection: vi.fn()
    };

    const scheduler = startScheduler({
      adapter,
      mqttService,
      intervalMs: 60_000
    });

    await vi.runOnlyPendingTimersAsync();
    scheduler.stop();

    expect(adapter.setTargetTemperature).toHaveBeenCalledWith({
      entityId: "climate.office",
      temperatureC: 18
    });
    expect(mqttService.publishRoomState).toHaveBeenCalledWith(roomFixture, 18, 21);
  });

  it("does not reapply unchanged target on next tick", async () => {
    const adapter: ClimateAdapter = {
      setTargetTemperature: vi.fn().mockResolvedValue(undefined),
      getCurrentTemperature: vi.fn().mockResolvedValue(21),
      turnOff: vi.fn().mockResolvedValue(undefined)
    };

    const scheduler = startScheduler({
      adapter,
      intervalMs: 60_000
    });

    await vi.advanceTimersByTimeAsync(120_000);
    scheduler.stop();

    expect(adapter.setTargetTemperature).toHaveBeenCalledTimes(1);
    expect(adapter.turnOff).toHaveBeenCalledTimes(1);
  });

  it("turns off water heater when holiday mode is enabled", async () => {
    const adapter: ClimateAdapter = {
      setTargetTemperature: vi.fn().mockResolvedValue(undefined),
      getCurrentTemperature: vi.fn().mockResolvedValue(21),
      turnOff: vi.fn().mockResolvedValue(undefined)
    };
    loadSettingsMock.mockReturnValue({ version: 1, holidayModeEnabled: true });
    loadWaterHeaterConfigMock.mockReturnValue({
      version: 2,
      entityId: "climate.water_heater",
      heatingTemperatureC: 55,
      activeModeName: "Default",
      modes: [{ name: "Default", schedule: [{ start: "00:00", end: "23:59", enabled: true }] }],
      updatedAt: new Date().toISOString()
    });

    const scheduler = startScheduler({ adapter, intervalMs: 60_000 });
    await vi.runOnlyPendingTimersAsync();
    scheduler.stop();

    expect(adapter.turnOff).toHaveBeenCalledWith("climate.water_heater");
  });

  it("applies configured heating temperature when water heater schedule is on", async () => {
    const adapter: ClimateAdapter = {
      setTargetTemperature: vi.fn().mockResolvedValue(undefined),
      getCurrentTemperature: vi.fn().mockResolvedValue(21),
      turnOff: vi.fn().mockResolvedValue(undefined)
    };
    loadSettingsMock.mockReturnValue({ version: 1, holidayModeEnabled: false });
    loadWaterHeaterConfigMock.mockReturnValue({
      version: 2,
      entityId: "climate.water_heater",
      heatingTemperatureC: 62,
      activeModeName: "Default",
      modes: [{ name: "Default", schedule: [{ start: "00:00", end: "23:59", enabled: true }] }],
      updatedAt: new Date().toISOString()
    });

    const scheduler = startScheduler({ adapter, intervalMs: 60_000 });
    await vi.runOnlyPendingTimersAsync();
    scheduler.stop();

    expect(adapter.setTargetTemperature).toHaveBeenCalledWith({
      entityId: "climate.water_heater",
      temperatureC: 62
    });
    expect(adapter.turnOff).not.toHaveBeenCalledWith("climate.water_heater");
  });
});
