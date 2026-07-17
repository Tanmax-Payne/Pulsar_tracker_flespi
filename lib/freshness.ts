import type { Telemetry } from "@/lib/flespiApi";

// Single source of truth for "is this data recent enough to trust?"
// across markers, badges, and the parameter grid.
export const FRESH_THRESHOLD_SEC = 30;

// Most recent timestamp across all telemetry parameters — used as the
// freshness signal when there's no live MQTT message to fall back on
// (REST telemetry is fetched batched for all devices in one call, unlike
// per-device message fetches, so this is the cheap/correct source).
export function latestTelemetryTs(telemetry: Telemetry): number | null {
  let max: number | null = null;
  for (const p of Object.values(telemetry)) {
    if (max == null || p.ts > max) max = p.ts;
  }
  return max;
}

// nowMs is null until the client has mounted (see useNow) — treat that
// the same as "no timestamp": nothing can be judged fresh yet, and
// nothing has a relative time to show yet.
export function isFresh(ts: number | null | undefined, nowMs: number | null, thresholdSec = FRESH_THRESHOLD_SEC): boolean {
  if (ts == null || nowMs == null) return false;
  return nowMs / 1000 - ts <= thresholdSec;
}

export function relativeTime(ts: number | null | undefined, nowMs: number | null): string {
  if (ts == null || nowMs == null) return "—";
  const diff = Math.max(0, Math.floor(nowMs / 1000 - ts));
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ${diff % 60}s ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
