"use client";

import { useNow } from "@/hooks/useNow";
import { isFresh, relativeTime } from "@/lib/freshness";
import type { DeviceState } from "@/hooks/useFlespiDevice";

interface LastPacketBadgeProps {
  device: DeviceState | null;
}

function formatAbsolute(ts: number | null, nowMs: number): string {
  if (ts == null) return "—";
  const d = new Date(ts * 1000);
  const sameDay = d.toDateString() === new Date(nowMs).toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (sameDay) return time;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

// The headline info on the default screen: where is this device, and
// how old is that data, right now. Green within 30s, red past it.
export function LastPacketBadge({ device }: LastPacketBadgeProps) {
  const now = useNow(1000);
  if (!device?.info) return null;

  const lat = device.telemetry["position.latitude"]?.value as number | undefined;
  const lng = device.telemetry["position.longitude"]?.value as number | undefined;
  const ts  = device.latestMessage?.timestamp ?? device.telemetry["position.latitude"]?.ts ?? null;
  const fresh = isFresh(ts, now);

  return (
    <div className={`badge ${fresh ? "badge--fresh" : "badge--stale"}`}>
      <span className="dot" />
      <div className="body">
        <div className="row-top">
          <span className="name">{device.info.name}</span>
          <span className="rel">{relativeTime(ts, now)}</span>
        </div>
        <div className="row-bottom">
          <span className="loc">{lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "No GPS fix"}</span>
          <span className="sep">·</span>
          <span className="abs">{formatAbsolute(ts, now)}</span>
        </div>
      </div>

      <style jsx>{`
        .badge {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: color-mix(in srgb, var(--bg) 93%, transparent);
          backdrop-filter: blur(4px);
          border: 1px solid var(--border-strong);
          border-radius: 10px;
          padding: 7px 12px;
          font-family: "IBM Plex Mono", monospace;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        }

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 4px;
        }

        .badge--fresh .dot { background: var(--success); box-shadow: 0 0 6px var(--success); animation: pulse 2s ease-in-out infinite; }
        .badge--stale .dot { background: var(--danger); box-shadow: 0 0 6px var(--danger); }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        .body { display: flex; flex-direction: column; gap: 2px; }

        .row-top { display: flex; align-items: baseline; gap: 8px; }
        .name { font-size: 12px; font-weight: 700; color: var(--text); }
        .rel  { font-size: 11px; font-weight: 700; }
        .badge--fresh .rel { color: var(--success); }
        .badge--stale .rel { color: var(--danger); }

        .row-bottom { display: flex; align-items: center; gap: 6px; }
        .loc { font-size: 10px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
        .sep { font-size: 10px; color: var(--border-strong); }
        .abs { font-size: 10px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
      `}</style>
    </div>
  );
}
