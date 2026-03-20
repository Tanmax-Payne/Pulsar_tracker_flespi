/**
 * lib/flespiApi.ts
 *
 * REST client — calls /api/flespi/* (local proxy) instead of flespi.io
 * directly, so no CORS issues in the browser.
 *
 * Rate budget: 100 req/min hard limit from Flespi.
 * Strategy:
 *   - Token bucket: ~1 req / 700ms (~85 rpm, safe headroom)
 *   - In-memory cache with per-endpoint TTL
 *   - Batch device IDs into a single request using comma selector
 */

const PROXY_BASE  = "/api/flespi";          // same-origin → no CORS
const MAX_RPM     = 85;
const INTERVAL_MS = Math.ceil(60_000 / MAX_RPM); // ~706 ms

// ── cache ──────────────────────────────────────────────────────────────────
interface CacheEntry { data: unknown; expiresAt: number }
const _cache = new Map<string, CacheEntry>();

function getCached<T>(key: string): T | null {
  const e = _cache.get(key);
  if (!e || Date.now() > e.expiresAt) return null;
  return e.data as T;
}
function setCached<T>(key: string, data: T, ttlMs: number) {
  _cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}
export function clearCache() { _cache.clear(); }

// ── token-bucket queue ─────────────────────────────────────────────────────
type QItem = { fn: () => Promise<unknown>; res: (v: unknown) => void; rej: (e: unknown) => void };
const _queue: QItem[] = [];
let _draining = false;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((res, rej) => {
    _queue.push({ fn, res: res as (v: unknown) => void, rej });
    if (!_draining) _drain();
  });
}

async function _drain() {
  _draining = true;
  while (_queue.length) {
    const item = _queue.shift()!;
    try { item.res(await item.fn()); }
    catch (e) { item.rej(e); }
    if (_queue.length) await _sleep(INTERVAL_MS);
  }
  _draining = false;
}
const _sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ── core GET ───────────────────────────────────────────────────────────────
async function flespiGet<T>(path: string, ttlMs = 5_000): Promise<T> {
  const cached = getCached<T>(path);
  if (cached) return cached;

  return enqueue(async () => {
    const res = await fetch(`${PROXY_BASE}${path}`);
    if (!res.ok) throw new Error(`Flespi ${res.status} — ${path}`);
    const json = (await res.json()) as { result: T };
    setCached(path, json.result, ttlMs);
    return json.result;
  }) as Promise<T>;
}

// ── public types ───────────────────────────────────────────────────────────
export interface DeviceInfo {
  id: number;
  name: string;
  device_type_id: number;
  [k: string]: unknown;
}

export interface TelemetryParam { value: unknown; ts: number }
export type Telemetry = Record<string, TelemetryParam>;

export interface Message {
  timestamp: number;
  "position.latitude"?: number;
  "position.longitude"?: number;
  "position.speed"?: number;
  "alarm.type"?: string;
  [k: string]: unknown;
}

// ── public API ─────────────────────────────────────────────────────────────

/** One REST call for N devices — comma-separated selector */
export function getDevices(ids: number[]): Promise<DeviceInfo[]> {
  return flespiGet<DeviceInfo[]>(`/gw/devices/${ids.join(",")}`, 30_000);
}

/** Telemetry snapshot for N devices — one call */
export function getTelemetry(ids: number[]): Promise<{ device_id: number; telemetry: Telemetry }[]> {
  return flespiGet(`/gw/devices/${ids.join(",")}/telemetry`, 4_000);
}

/** Latest N messages for one device */
export function getLatestMessages(deviceId: number, count = 1): Promise<Message[]> {
  return flespiGet<Message[]>(`/gw/devices/${deviceId}/messages?count=${count}&reverse=true`, 4_000);
}

/** Time-ranged message history */
export function getMessageRange(
  deviceId: number,
  fromTs: number,
  toTs: number,
  maxCount = 500
): Promise<Message[]> {
  return flespiGet<Message[]>(
    `/gw/devices/${deviceId}/messages?from=${fromTs}&to=${toTs}&count=${maxCount}`,
    60_000
  );
}