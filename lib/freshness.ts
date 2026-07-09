// Single source of truth for "is this data recent enough to trust?"
// across markers, badges, and the parameter grid.
export const FRESH_THRESHOLD_SEC = 30;

export function isFresh(ts: number | null | undefined, nowMs: number, thresholdSec = FRESH_THRESHOLD_SEC): boolean {
  if (ts == null) return false;
  return nowMs / 1000 - ts <= thresholdSec;
}

export function relativeTime(ts: number | null | undefined, nowMs: number): string {
  if (ts == null) return "—";
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
