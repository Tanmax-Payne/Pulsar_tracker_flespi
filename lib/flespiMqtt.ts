/**
 * flespiMqtt.ts
 * Real-time data via Flespi MQTT over WebSocket.
 *
 * Why MQTT instead of polling?
 *   - Zero REST calls for live updates → no rate-limit impact.
 *   - Sub-second latency (push model, not pull).
 *   - One persistent connection replaces N interval timers.
 *
 * Topics used:
 *   flespi/state/gw/devices/{id}/telemetry/+   → telemetry snapshot per param
 *   flespi/message/gw/devices/{id}/#           → raw incoming messages
 */

import mqtt, { MqttClient, IClientOptions } from "mqtt";

export type TelemetryUpdate = {
  deviceId: number;
  param: string;
  value: unknown;
  ts: number;
};

export type MessageUpdate = {
  deviceId: number;
  payload: Record<string, unknown>;
};

export type MqttHandlers = {
  onTelemetry?: (update: TelemetryUpdate) => void;
  onMessage?: (update: MessageUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (err: Error) => void;
};

let client: MqttClient | null = null;
let refCount = 0;

const BROKER_URL = "wss://mqtt.flespi.io:443";

/**
 * Connect (or reuse an existing connection) and subscribe to device topics.
 * Call `disconnect()` when done to avoid memory leaks.
 */
export function connect(token: string, deviceIds: number[], handlers: MqttHandlers) {
  refCount++;

  if (client && client.connected) {
    _subscribe(client, deviceIds, handlers);
    return;
  }

  const options: IClientOptions = {
    username: `FlespiToken ${token}`,
    password: "",
    reconnectPeriod: 3_000,
    keepalive: 30,
    clean: true,
    clientId: `pulsar-tracker-${Math.random().toString(16).slice(2, 8)}`,
  };

  client = mqtt.connect(BROKER_URL, options);

  client.on("connect", () => {
    handlers.onConnect?.();
    _subscribe(client!, deviceIds, handlers);
  });

  client.on("message", (topic, payload) => {
    try {
      _routeMessage(topic, payload.toString(), handlers);
    } catch {
      // ignore malformed messages
    }
  });

  client.on("reconnect", () => {
    // re-subscribe after reconnect
    _subscribe(client!, deviceIds, handlers);
  });

  client.on("disconnect", () => handlers.onDisconnect?.());
  client.on("error", (err) => handlers.onError?.(err));
  client.on("offline", () => handlers.onDisconnect?.());
}

function _subscribe(c: MqttClient, deviceIds: number[], handlers: MqttHandlers) {
  for (const id of deviceIds) {
    if (handlers.onTelemetry) {
      c.subscribe(`flespi/state/gw/devices/${id}/telemetry/+`, { qos: 1 });
    }
    if (handlers.onMessage) {
      c.subscribe(`flespi/message/gw/devices/${id}/#`, { qos: 0 });
    }
  }
}

function _routeMessage(topic: string, raw: string, handlers: MqttHandlers) {
  // telemetry: flespi/state/gw/devices/12345/telemetry/position.latitude
  const telemetryMatch = topic.match(/flespi\/state\/gw\/devices\/(\d+)\/telemetry\/(.+)/);
  if (telemetryMatch && handlers.onTelemetry) {
    const data = JSON.parse(raw) as { value: unknown; ts: number };
    handlers.onTelemetry({
      deviceId: Number(telemetryMatch[1]),
      param: telemetryMatch[2],
      value: data.value,
      ts: data.ts,
    });
    return;
  }

  // message: flespi/message/gw/devices/12345/...
  const msgMatch = topic.match(/flespi\/message\/gw\/devices\/(\d+)/);
  if (msgMatch && handlers.onMessage) {
    handlers.onMessage({
      deviceId: Number(msgMatch[1]),
      payload: JSON.parse(raw),
    });
  }
}

export function disconnect() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && client) {
    client.end(true);
    client = null;
  }
}

export function isConnected() {
  return client?.connected ?? false;
}
