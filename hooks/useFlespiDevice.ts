/**
 * hooks/useFlespiDevice.ts
 *
 * Data strategy:
 *   1. REST snapshot on mount  (2 calls: devices + telemetry batch)
 *   2. MQTT WebSocket          (zero REST calls for live updates)
 *   3. REST poll every 30s     (safety net — catches any MQTT gaps)
 *
 * Token usage:
 *   REST  → server-side proxy (/api/flespi) — token never in browser
 *   MQTT  → client WebSocket  — needs NEXT_PUBLIC_FLESPI_TOKEN
 */

"use client";

import { useEffect, useRef, useCallback, useReducer } from "react";
import { getDevices, getTelemetry, getLatestMessages, DeviceInfo, Telemetry, Message } from "@/lib/flespiApi";

// Re-export API types so components can import everything from one place
export type { DeviceInfo, Telemetry, TelemetryParam, Message } from "@/lib/flespiApi";
import { connect as mqttConnect, disconnect as mqttDisconnect, TelemetryUpdate, MessageUpdate } from "@/lib/flespiMqtt";

// ── types ──────────────────────────────────────────────────────────────────
export interface DeviceState {
  info: DeviceInfo | null;
  telemetry: Telemetry;
  latestMessage: Message | null;
  fallDetected: boolean;
  lastFallTs: number | null;
}

export interface FlespiState {
  devices: Record<number, DeviceState>;
  connected: boolean;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "INIT_DEVICES"; infos: DeviceInfo[] }
  | { type: "INIT_TELEMETRY"; deviceId: number; telemetry: Telemetry }
  | { type: "INIT_MESSAGE"; deviceId: number; message: Message }
  | { type: "TELEMETRY_UPDATE"; update: TelemetryUpdate }
  | { type: "MESSAGE_UPDATE"; update: MessageUpdate }
  | { type: "MQTT_STATUS"; connected: boolean }
  | { type: "SNAPSHOT_DONE"; error: string | null };

function blank(): DeviceState {
  return { info: null, telemetry: {}, latestMessage: null, fallDetected: false, lastFallTs: null };
}

function isFall(p: Record<string, unknown>) {
  return p["alarm.type"] === "fall" || p["sensor.fall"] === 1;
}

function reducer(state: FlespiState, action: Action): FlespiState {
  switch (action.type) {
    case "INIT_DEVICES": {
      const devices = { ...state.devices };
      for (const info of action.infos) devices[info.id] = { ...(devices[info.id] ?? blank()), info };
      return { ...state, devices };
    }
    case "INIT_TELEMETRY": {
      const dev = state.devices[action.deviceId] ?? blank();
      return { ...state, devices: { ...state.devices, [action.deviceId]: { ...dev, telemetry: action.telemetry } } };
    }
    case "INIT_MESSAGE": {
      const dev = state.devices[action.deviceId] ?? blank();
      return { ...state, devices: { ...state.devices, [action.deviceId]: { ...dev, latestMessage: action.message } } };
    }
    case "TELEMETRY_UPDATE": {
      const { deviceId, param, value, ts } = action.update;
      const dev = state.devices[deviceId] ?? blank();
      return {
        ...state,
        devices: {
          ...state.devices,
          [deviceId]: { ...dev, telemetry: { ...dev.telemetry, [param]: { value, ts } } },
        },
      };
    }
    case "MESSAGE_UPDATE": {
      const { deviceId, payload } = action.update;
      const dev = state.devices[deviceId] ?? blank();
      const fall = isFall(payload);
      return {
        ...state,
        devices: {
          ...state.devices,
          [deviceId]: {
            ...dev,
            latestMessage: payload as Message,
            fallDetected: fall || dev.fallDetected,
            lastFallTs: fall ? (payload.timestamp as number ?? dev.lastFallTs) : dev.lastFallTs,
          },
        },
      };
    }
    case "MQTT_STATUS": return { ...state, connected: action.connected };
    // A cycle that fully succeeds clears any stale error from a previous
    // one — otherwise a transient failure's banner would stick around
    // forever even after the next poll recovers.
    case "SNAPSHOT_DONE": return { ...state, loading: false, error: action.error };
    default: return state;
  }
}

const INIT: FlespiState = { devices: {}, connected: false, loading: true, error: null };

// ── hook ───────────────────────────────────────────────────────────────────
export function useFlespiDevice(mqttToken: string, deviceIds: number[], pollIntervalMs = 60_000) {
  const [state, dispatch] = useReducer(reducer, INIT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idsKey = deviceIds.join(",");

  // Each step recovers independently — a rate-limited/failed call for one
  // piece (or one device's latest message) must not block the others from
  // updating. Previously a single try/catch around the whole cycle meant
  // any one failure aborted the entire snapshot, silently freezing the UI
  // for as long as Flespi kept erroring.
  const fetchSnapshot = useCallback(async () => {
    if (!deviceIds.length) return;
    let lastError: string | null = null;

    try {
      const infos = await getDevices(deviceIds);
      dispatch({ type: "INIT_DEVICES", infos });
    } catch (err) {
      lastError = (err as Error).message;
    }

    try {
      const telemetries = await getTelemetry(deviceIds);
      for (const t of telemetries) {
        dispatch({ type: "INIT_TELEMETRY", deviceId: t.device_id, telemetry: t.telemetry });
      }
    } catch (err) {
      lastError = (err as Error).message;
    }

    for (const id of deviceIds) {
      try {
        const msgs = await getLatestMessages(id, 1);
        if (msgs[0]) dispatch({ type: "INIT_MESSAGE", deviceId: id, message: msgs[0] });
      } catch (err) {
        lastError = (err as Error).message;
      }
    }

    dispatch({ type: "SNAPSHOT_DONE", error: lastError });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => {
    if (!deviceIds.length) return;

    fetchSnapshot();

    // MQTT for live updates — zero REST cost
    if (mqttToken) {
      void mqttConnect(mqttToken, deviceIds, {
        onConnect:    () => dispatch({ type: "MQTT_STATUS", connected: true }),
        onDisconnect: () => dispatch({ type: "MQTT_STATUS", connected: false }),
        onError:      (e) => console.warn("[MQTT]", e.message),
        onTelemetry:  (u) => dispatch({ type: "TELEMETRY_UPDATE", update: u }),
        onMessage:    (u) => dispatch({ type: "MESSAGE_UPDATE", update: u }),
      });
    }

    // Safety-net poll — cadence is user-configurable (rate-limit headroom)
    timerRef.current = setInterval(fetchSnapshot, pollIntervalMs);

    return () => {
      if (mqttToken) mqttDisconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mqttToken, idsKey, pollIntervalMs]);

  return state;
}
