import { describe, expect, it } from "vitest";
import {
  applyGlobalTemperatureSettings,
  HOLIDAY_OFFSET_C,
  MIN_TARGET_TEMPERATURE_C
} from "../../shared/temperature";

describe("global temperature settings", () => {
  it("keeps scheduled target when holiday mode is disabled", () => {
    expect(applyGlobalTemperatureSettings(20, { holidayModeEnabled: false })).toBe(20);
  });

  it("reduces scheduled target by holiday offset when enabled", () => {
    expect(applyGlobalTemperatureSettings(20, { holidayModeEnabled: true })).toBe(
      20 - HOLIDAY_OFFSET_C
    );
  });

  it("clamps adjusted temperature to minimum target", () => {
    expect(
      applyGlobalTemperatureSettings(MIN_TARGET_TEMPERATURE_C, {
        holidayModeEnabled: true
      })
    ).toBe(MIN_TARGET_TEMPERATURE_C);
  });
});
