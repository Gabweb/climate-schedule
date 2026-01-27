import mqtt, { MqttClient } from "mqtt";

export type MqttConfig = {
  url: string;
  username?: string;
  password?: string;
};

let client: MqttClient | null = null;

export function getMqttClient(config: MqttConfig): MqttClient {
  if (client) return client;
  client = mqtt.connect(config.url, {
    username: config.username,
    password: config.password
  });
  client.on("connect", () => {
    console.log("mqtt connected");
  });
  client.on("error", (error) => {
    console.warn(`mqtt error: ${error.message}`);
  });
  return client;
}

export function closeMqttClient() {
  if (client) {
    client.end(true);
    client = null;
  }
}
