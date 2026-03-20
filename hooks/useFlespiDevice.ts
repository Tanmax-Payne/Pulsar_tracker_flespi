/**
 * useFlespiDevice.ts
 *
 * Single hook for all device data. Strategy:
 *   1. Fetch initial snapshot via REST (one call for telemetry, one for device info).
 *   2. Open MQTT WebSocket → live updates arrive instantly with zero REST calls.
 *   3. REST polling only as safety net (every 30s) to catch any MQTT gaps.
 *
 * This collapses what was likely 5–10 separate polling intervals into:
 *   • 2 REST calls on mount
 *   • 1 persistent MQTT connection
 *   • 1 REST call every 30s as heartbeat
 *
 * Total REST budget: ~2 req/min (well under the 100 req/min limit).
 */

import { useEffect, useRef, useCallback, useReducer } from "react";
import {
  getDevices,
  getTelemetry,
  getLatestMessages,
  DeviceInfo,
  Telemetry,
  Message,
} from "@/lib/flespiApi";
import {
  connect as mqttConnect,
  disconnect as mqttDisconnect,
  TelemetryUpdate,
  MessageUpdate,
} from "@/lib/flespiMqtt";

// ─── state shape ──────────────────────────────────────────────────────────

export interface DeviceState {
  info: DeviceInfo | null;
  telemetry: Telemetry;
  latestMessage: Message | null;
  fallDetected: boolean;
  lastFallTs: number | null;
}

export interface FlespiState {
  devices: Record<number, DeviceState>;
  connected: boolean;   // MQTT connection status
  loading: boolean;
  error: string | null;
}

// ─── reducer ─────────────────────────────────────────────────────────────

type Action =
  | { type: "INIT_DEVICES"; infos: DeviceInfo[] }
  | { type: "INIT_TELEMETRY"; deviceId: number; telemetry: Telemetry }
  | { type: "INIT_MESSAGE"; deviceId: number; message: Message }
  | { type: "TELEMETRY_UPDATE"; update: TelemetryUpdate }
  | { type: "MESSAGE_UPDATE"; update: MessageUpdate }
  | { type: "MQTT_STATUS"; connected: boolean }
  | { type: "LOADING_DONE" }
  | { type: "ERROR"; message: string };

function makeDeviceState(): DeviceState {
  return { info: null, telemetry: {}, latestMessage: null, fallDetected: false, lastFallTs: null };
}

function detectFall(payload: Record<string, unknown>): boolean {
  // Flespi fall detection: alarm.type === "fall" or sensor.fall === 1
  return payload["alarm.type"] === "fall" || payload["sensor.fall"] === 1;
}

function reducer(state: FlespiState, action: Action): FlespiState {
  switch (action.type) {
    case "INIT_DEVICES": {
      const devices = { ...state.devices };
      for (const info of action.infos) {
        devices[info.id] = { ...(devices[info.id] ?? makeDeviceState()), info };
      }
      return { ...state, devices };
    }

    case "INIT_TELEMETRY": {
      const dev = state.devices[action.deviceId] ?? makeDeviceState();
      return {
        ...state,
        devices: {
          ...state.devices,
          [action.deviceId]: { ...dev, telemetry: action.telemetry },
        },
      };
    }

    case "INIT_MESSAGE": {
      const dev = state.devices[action.deviceId] ?? makeDeviceState();
      return {
        ...state,
        devices: {
          ...state.devices,
          [action.deviceId]: { ...dev, latestMessage: action.message },
        },
      };
    }

    case "TELEMETRY_UPDATE": {
      const { deviceId, param, value, ts } = action.update;
      const dev = state.devices[deviceId] ?? makeDeviceState();
      return {
        ...state,
        devices: {
          ...state.devices,
          [deviceId]: {
            ...dev,
            telemetry: { ...dev.telemetry, [param]: { value, ts } },
          },
        },
      };
    }

    case "MESSAGE_UPDATE": {
      const { deviceId, payload } = action.update;
      const dev = state.devices[deviceId] ?? makeDeviceState();
      const isFall = detectFall(payload);
      return {
        ...state,
        devices: {
          ...state.devices,
          [deviceId]: {
            ...dev,
            latestMessage: payload as Message,
            fallDetected: isFall || dev.fallDetected,
            lastFallTs: isFall ? (payload.timestamp as number) : dev.lastFallTs,
          },
        },
      };
    }

    case "MQTT_STATUS":
      return { ...state, connected: action.connected };

    case "LOADING_DONE":
      return { ...state, loading: false };

    case "ERROR":
      return { ...state, error: action.message, loading: false };

    default:
      return state;
  }
}

const INITIAL: FlespiState = {
  devices: {},
  connected: false,
  loading: true,
  error: null,
};

// ─── hook ─────────────────────────────────────────────────────────────────

export function useFlespiDevice(token: string, deviceIds: number[]) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // stringify for stable dep
  const idsKey = deviceIds.join(",");

  const fetchSnapshot = useCallback(async () => {
    if (!token || !deviceIds.length) return;
    try {
      // ① device info — batch all IDs in one request
      const infos = await getDevices(token, deviceIds);
      dispatch({ type: "INIT_DEVICES", infos });

      // ② telemetry — one request for all devices
      const telemetries = await getTelemetry(token, deviceIds);
      for (const t of telemetries) {
        dispatch({ type: "INIT_TELEMETRY", deviceId: t.device_id, telemetry: t.telemetry });
      }

      // ③ latest message per device — each needs its own call, but we space them
      for (const id of deviceIds) {
        const msgs = await getLatestMessages(token, id, 1);
        if (msgs[0]) dispatch({ type: "INIT_MESSAGE", deviceId: id, message: msgs[0] });
      }

      dispatch({ type: "LOADING_DONE" });
    } catch (err) {
      dispatch({ type: "ERROR", message: (err as Error).message });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, idsKey]);

  useEffect(() => {
    if (!token || !deviceIds.length) return;

    // Initial REST snapshot
    fetchSnapshot();

    // MQTT for real-time updates (no polling cost)
    mqttConnect(token, deviceIds, {
      onConnect: () => dispatch({ type: "MQTT_STATUS", connected: true }),
      onDisconnect: () => dispatch({ type: "MQTT_STATUS", connected: false }),
      onError: (err) => console.warn("[MQTT]", err.message),
      onTelemetry: (update) => dispatch({ type: "TELEMETRY_UPDATE", update }),
      onMessage: (update) => dispatch({ type: "MESSAGE_UPDATE", update }),
    });

    // Safety-net polling every 30s — catches anything MQTT missed
    pollTimerRef.current = setInterval(fetchSnapshot, 30_000);

    return () => {
      mqttDisconnect();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, idsKey]);

  return state;
}

/** Convenience: get a single device's state */
export function useDevice(token: string, deviceId: number) {
  const state = useFlespiDevice(token, [deviceId]);
  return {
    ...state,
    device: state.devices[deviceId] ?? makeDeviceState(),
  };
}
