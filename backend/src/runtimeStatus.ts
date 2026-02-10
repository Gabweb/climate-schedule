export type RuntimeStatus = {
  startupSuccessful: boolean;
};

let runtimeStatus: RuntimeStatus = {
  startupSuccessful: true
};

export function setRuntimeStatus(next: RuntimeStatus): void {
  runtimeStatus = next;
}

export function getRuntimeStatus(): RuntimeStatus {
  return runtimeStatus;
}
