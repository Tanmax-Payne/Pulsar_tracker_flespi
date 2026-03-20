/**
 * flespiApi.ts
 * Rate-limited Flespi REST client.
 * Hard limit: 100 req/min → ~1 req/600ms.
 * Strategy:
 *  - Queue all requests through a token-bucket throttle.
 *  - Batch multi-device selectors into a single REST call.
 *  - Cache GET responses; only re-fetch when TTL expires.
 */

const BASE = "https://flespi.io";
const MAX_RPM = 90; // stay 10 req below the hard cap
const INTERVAL_MS = Math.ceil(60_000 / MAX_RPM); // ~667 ms between requests

// ─── tiny in-memory cache ──────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── token-bucket queue ────────────────────────────────────────────────────
type QueueItem = { fn: () => Promise<unknown>; resolve: (v: unknown) => void; reject: (e: unknown) => void };
const queue: QueueItem[] = [];
let draining = false;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ fn, resolve: resolve as (v: unknown) => void, reject });
    if (!draining) drain();
  });
}

async function drain() {
  draining = true;
  while (queue.length) {
    const item = queue.shift()!;
    try {
      const result = await item.fn();
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    }
    if (queue.length) await sleep(INTERVAL_MS);
  }
  draining = false;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ─── core fetch helper ─────────────────────────────────────────────────────
async function flespiGet<T>(token: string, path: string, ttlMs = 5_000): Promise<T> {
  const cacheKey = path;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  return enqueue(async () => {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `FlespiToken ${token}` },
    });
    if (!res.ok) throw new Error(`Flespi ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { result: T };
    setCached(cacheKey, json.result, ttlMs);
    return json.result;
  });
}

// ─── public API ───────────────────────────────────────────────────────────
export interface DeviceInfo {
  id: number;
  name: string;
  device_type_id: number;
  [k: string]: unknown;
}

export interface Telemetry {
  [param: string]: { value: unknown; ts: number };
}

export interface Message {
  timestamp: number;
  "position.latitude"?: number;
  "position.longitude"?: number;
  "position.speed"?: number;
  "alarm.type"?: string;
  [k: string]: unknown;
}

/**
 * Fetch one or more devices in a single request using comma-separated IDs.
 * e.g. getDevices(token, [123, 456])
 */
export function getDevices(token: string, ids: number[]): Promise<DeviceInfo[]> {
  const selector = ids.join(",");
  return flespiGet<DeviceInfo[]>(token, `/gw/devices/${selector}`, 30_000);
}

/**
 * Fetch telemetry (latest snapshot of all parameters) for one or many devices.
 * One REST call regardless of how many devices.
 */
export function getTelemetry(token: string, ids: number[]): Promise<{ device_id: number; telemetry: Telemetry }[]> {
  const selector = ids.join(",");
  return flespiGet<{ device_id: number; telemetry: Telemetry }[]>(
    token,
    `/gw/devices/${selector}/telemetry`,
    4_000, // short TTL — live snapshot
  );
}

/**
 * Fetch the N most-recent messages for a device. Default N=1 (latest only).
 * Uses `reverse=true` so we get newest first with minimal data transfer.
 */
export function getLatestMessages(token: string, deviceId: number, count = 1): Promise<Message[]> {
  return flespiGet<Message[]>(
    token,
    `/gw/devices/${deviceId}/messages?count=${count}&reverse=true`,
    4_000,
  );
}

/**
 * Fetch messages in a time range for history/track playback.
 */
export function getMessageRange(
  token: string,
  deviceId: number,
  fromTs: number,
  toTs: number,
  maxCount = 500,
): Promise<Message[]> {
  return flespiGet<Message[]>(
    token,
    `/gw/devices/${deviceId}/messages?from=${fromTs}&to=${toTs}&count=${maxCount}`,
    60_000, // history is immutable — cache for 60s
  );
}

/** Invalidate all cached entries (e.g. on token change) */
export function clearCache() {
  cache.clear();
}
