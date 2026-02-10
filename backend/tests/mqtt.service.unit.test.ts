import { describe, expect, it, vi, beforeEach } from "vitest";
import type { RoomConfig } from "../../shared/models";
import { buildDiscoveryConfig } from "../src/mqtt/discovery";

const { publishMock, subscribeMock, onMock, offMock, getMqttClientMock } = vi.hoisted(() => {
  const publish = vi.fn();
  const subscribe = vi.fn();
  const on = vi.fn();
  const off = vi.fn();
  const client = {
    connected: true,
    publish,
    subscribe,
    on,
    off
  };
  return {
    publishMock: publish,
    subscribeMock: subscribe,
    onMock: on,
    offMock: off,
    getMqttClientMock: vi.fn(() => client)
  };
});

vi.mock("../src/mqtt/client", () => ({
  getMqttClient: getMqttClientMock
}));

import { createMqttService } from "../src/mqtt/service";

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
    },
    {
      name: "Holiday",
      schedule: [
        { start: "00:00", end: "23:59", targetC: 18 }
      ]
    }
  ]
};

describe("mqtt service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes discovery and retained state topics", () => {
    const service = createMqttService({
      config: { url: "mqtt://test", username: "u", password: "p" },
      onPresetChange: vi.fn().mockResolvedValue(undefined)
    });

    service.initializeRooms([roomFixture]);

    expect(publishMock).toHaveBeenCalled();
    expect(subscribeMock).toHaveBeenCalled();
    expect(getMqttClientMock).toHaveBeenCalled();
  });

  it("publishes room state including current temperature", () => {
    const service = createMqttService({
      config: { url: "mqtt://test", username: "u", password: "p" },
      onPresetChange: vi.fn().mockResolvedValue(undefined)
    });

    service.publishRoomState(roomFixture, 20, 21);

    expect(publishMock).toHaveBeenCalledWith(
      expect.stringContaining("/state/target_temperature"),
      "20",
      { retain: true }
    );
    expect(publishMock).toHaveBeenCalledWith(
      expect.stringContaining("/state/current_temperature"),
      "21",
      { retain: true }
    );
  });

  it("routes preset command messages to preset handler", async () => {
    const onPresetChange = vi.fn().mockResolvedValue(undefined);
    const service = createMqttService({
      config: { url: "mqtt://test", username: "u", password: "p" },
      onPresetChange
    });
    service.initializeRooms([roomFixture]);

    const messageHandler = onMock.mock.calls.find((call) => call[0] === "message")?.[1];
    expect(messageHandler).toBeTypeOf("function");
    const presetCommandTopic = buildDiscoveryConfig(roomFixture).presetModeCommandTopic;
    await messageHandler(presetCommandTopic, Buffer.from("Holiday"));
    expect(onPresetChange).toHaveBeenCalledWith("EG::Office", "Holiday");
  });
});
