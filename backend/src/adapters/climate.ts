export type ClimateTarget = {
  entityId: string;
  temperatureC: number;
};

export type ClimateAdapter = {
  setTargetTemperature: (target: ClimateTarget) => Promise<void>;
};

export function createNoopAdapter(): ClimateAdapter {
  return {
    async setTargetTemperature() {
      return;
    }
  };
}
