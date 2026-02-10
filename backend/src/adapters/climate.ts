export type ClimateTarget = {
  entityId: string;
  temperatureC: number;
};

export type ClimateAdapter = {
  setTargetTemperature: (target: ClimateTarget) => Promise<void>;
  getCurrentTemperature: (entityId: string) => Promise<number | null>;
  turnOff: (entityId: string) => Promise<void>;
};

export function createNoopAdapter(): ClimateAdapter {
  return {
    async setTargetTemperature() {
      return;
    },
    async getCurrentTemperature() {
      return null;
    },
    async turnOff() {
      return;
    }
  };
}
