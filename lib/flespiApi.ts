/**
 * lib/flespiApi.ts — browser-only REST client via local proxy.
 *
 * Uses /api/flespi/* (same-origin) to avoid CORS.
 * All calls happen inside useEffect → always client-side → relative URL safe.
 *
 * Rate strategy:
 *   - Token bucket: 85 rpm (hard limit is 100)
 *   - In-memory cache per endpoint
 *   - Device IDs batched with comma selector (1 call for N devices)
 */

// Relative URL — safe because this module is only ever called
// from useEffect / event handlers (never during SSR).
const PROXY_BASE = "/api/flespi";

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
type QItem = {
  fn:  () => Promise<unknown>;
  res: (v: unknown) => void;
  rej: (e: unknown) => void;
};
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
    if (_queue.length) await new Promise<void>(r => setTimeout(r, INTERVAL_MS));
  }
  _draining = false;
}

// ── core fetch ─────────────────────────────────────────────────────────────
async function flespiGet<T>(path: string, ttlMs = 5_000): Promise<T> {
  const hit = getCached<T>(path);
  if (hit) return hit;

  return enqueue(async () => {
    const res = await fetch(`${PROXY_BASE}${path}`);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Flespi ${res.status}${text ? ": " + text : ""}`);
    }
    const json = (await res.json()) as { result: T };
    setCached(path, json.result, ttlMs);
    return json.result;
  }) as Promise<T>;
}

// ── types ──────────────────────────────────────────────────────────────────
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
  "position.latitude"?:  number;
  "position.longitude"?: number;
  "position.speed"?:     number;
  "alarm.type"?:         string;
  [k: string]: unknown;
}

// ── public API ─────────────────────────────────────────────────────────────
export function getDevices(ids: number[]): Promise<DeviceInfo[]> {
  return flespiGet<DeviceInfo[]>(`/gw/devices/${ids.join(",")}`, 30_000);
}
export function getTelemetry(ids: number[]): Promise<{ device_id: number; telemetry: Telemetry }[]> {
  return flespiGet(`/gw/devices/${ids.join(",")}/telemetry`, 4_000);
}
const MESSAGE_PAGE_SIZE = 1000;

// Paginates through Flespi's messages endpoint so arbitrarily long ranges
// come back complete instead of silently sparse (a single call with a
// fixed `count` only ever returns the first page). `maxTotal` is a safety
// valve against pathological ranges (millions of points would hang the
// tab rendering the track), not a product-level restriction.
export async function getMessageRange(
  deviceId: number,
  fromTs: number,
  toTs: number,
  maxTotal = 20_000,
): Promise<Message[]> {
  const out: Message[] = [];
  const seenTs = new Set<number>(); // Flespi doesn't guarantee page order — guards against re-fetched overlap inflating/duplicating the result
  let cursor = fromTs;

  while (cursor < toTs && out.length < maxTotal) {
    const page = await flespiGet<Message[]>(
      `/gw/devices/${deviceId}/messages?from=${cursor}&to=${toTs}&count=${MESSAGE_PAGE_SIZE}`,
      60_000,
    );
    if (!page.length) break;

    let maxTs = cursor;
    for (const m of page) {
      if (m.timestamp > maxTs) maxTs = m.timestamp;
      if (!seenTs.has(m.timestamp)) {
        seenTs.add(m.timestamp);
        out.push(m);
      }
    }

    if (maxTs <= cursor) break; // no progress — avoid an infinite loop
    cursor = maxTs + 1;

    if (page.length < MESSAGE_PAGE_SIZE) break; // short page — reached `to`
  }

  // Hard invariant, not an assumption: never trust that Flespi's `from`/`to`
  // actually bounded the result. A device that was offline and bursts a
  // backlog on reconnect can return messages whose own timestamps fall
  // well outside the requested window even though they arrived "now" —
  // this is what "10 minutes selected, 8000 points spanning way more than
  // 10 minutes" looks like. Enforce the window ourselves unconditionally.
  const bounded = out.filter(m => m.timestamp >= fromTs && m.timestamp <= toTs);

  // Don't trust page order for the final track — sort chronologically so
  // the polyline draws a coherent path instead of zigzagging between
  // out-of-order points.
  bounded.sort((a, b) => a.timestamp - b.timestamp);
  return bounded.slice(0, maxTotal);
}
