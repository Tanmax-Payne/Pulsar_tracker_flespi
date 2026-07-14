export interface PollIntervalOption {
  ms: number;
  label: string;
}

// Matches Grafana's own dashboard refresh-rate convention (the pattern
// Flespi's own Grafana plugins rely on for staying under rate limits —
// there's no special backoff magic in their datasource code, just a
// user-controlled poll cadence).
export const POLL_INTERVALS: PollIntervalOption[] = [
  { ms: 10_000,  label: "10s" },
  { ms: 30_000,  label: "30s" },
  { ms: 60_000,  label: "1m" },
  { ms: 300_000, label: "5m" },
];

export const DEFAULT_POLL_MS = 30_000;
export const POLL_STORAGE_KEY = "pulsar:pollIntervalMs";

export function isValidPollMs(ms: number): boolean {
  return POLL_INTERVALS.some(o => o.ms === ms);
}
