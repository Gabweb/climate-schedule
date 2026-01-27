import { createApp } from "./app";
import { createHomeAssistantAdapterFromEnv } from "./adapters/homeAssistant";
import { createNoopAdapter } from "./adapters/climate";
import { startScheduler } from "./scheduler/scheduler";

const port = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(port, () => {
  console.log("backend listening on http://localhost:" + port);
});

try {
  const adapter =
    process.env.HA_BASE_URL && process.env.HA_TOKEN
      ? createHomeAssistantAdapterFromEnv()
      : createNoopAdapter();
  startScheduler({ adapter });
  console.log("scheduler started");
} catch (error) {
  const message = error instanceof Error ? error.message : "scheduler failed to start";
  console.warn(message);
}
