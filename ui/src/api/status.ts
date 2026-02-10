export type RuntimeStatusResponse = {
  startupSuccessful: boolean;
};

function apiUrl(path: string) {
  const normalized = path.replace(/^\/+/, "");
  try {
    return new URL(normalized, window.location.href).toString();
  } catch {
    return `./${normalized}`;
  }
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export async function fetchRuntimeStatus(): Promise<RuntimeStatusResponse> {
  return request<RuntimeStatusResponse>(apiUrl("api/status"));
}
