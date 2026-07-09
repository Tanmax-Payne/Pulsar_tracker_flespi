"use client";

import { useNow } from "@/hooks/useNow";
import { isFresh, relativeTime } from "@/lib/freshness";
import type { Telemetry, Message } from "@/hooks/useFlespiDevice";

interface ParameterGridProps {
  telemetry: Telemetry;
  latestMessage: Message | null;
}

// Priority params surface first; everything else follows alphabetically.
const PRIORITY_PARAMS = [
  "position.latitude",
  "position.longitude",
  "position.speed",
  "position.altitude",
  "position.course",
  "battery.voltage",
  "sensor.fall",
  "alarm.type",
  "gsm.signal",
  "engine.ignition.status",
];

function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "ON" : "OFF";
  if (typeof v === "number") {
    if (v % 1 === 0) return String(v);
    return v.toFixed(Math.abs(v) < 1 ? 6 : 3);
  }
  return String(v);
}

export function ParameterGrid({ telemetry, latestMessage }: ParameterGridProps) {
  const now = useNow(1000);
  const entries = Object.entries(telemetry);

  if (!entries.length) {
    return <p className="empty">No telemetry received yet.</p>;
  }

  const sorted = entries.sort(([a], [b]) => {
    const ai = PRIORITY_PARAMS.indexOf(a);
    const bi = PRIORITY_PARAMS.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="grid">
      {sorted.map(([param, { value, ts }]) => {
        const fresh = isFresh(ts, now);
        return (
          <div key={param} className={`cell ${fresh ? "cell--fresh" : "cell--stale"}`}>
            <div className="cell-label">{param.replace(/\./g, "​.")}</div>
            <div className="cell-value">{formatValue(value)}</div>
            <div className="cell-ts">{relativeTime(ts, now)}</div>
          </div>
        );
      })}

      {latestMessage?.timestamp && (
        <div className={`cell ${isFresh(latestMessage.timestamp, now) ? "cell--fresh" : "cell--stale"}`}>
          <div className="cell-label">msg ts</div>
          <div className="cell-value">{relativeTime(latestMessage.timestamp, now)}</div>
        </div>
      )}

      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        .empty { font-size: 11px; color: #484f58; margin: 8px 0; }

        .cell {
          border-radius: 5px;
          padding: 7px 9px;
          border: 1px solid;
          transition: background 0.3s, border-color 0.3s;
        }

        .cell--fresh {
          background: rgba(63, 185, 80, 0.08);
          border-color: rgba(63, 185, 80, 0.35);
        }

        .cell--stale {
          background: rgba(248, 81, 73, 0.06);
          border-color: rgba(248, 81, 73, 0.3);
        }

        .cell-label {
          font-family: "IBM Plex Mono", monospace;
          font-size: 8px;
          color: #8b949e;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 3px;
        }

        .cell-value {
          font-family: "IBM Plex Mono", monospace;
          font-size: 13px;
          font-weight: 600;
          color: #e6edf3;
          font-variant-numeric: tabular-nums;
        }

        .cell-ts {
          font-family: "IBM Plex Mono", monospace;
          font-size: 9px;
          color: #6e7681;
          margin-top: 3px;
        }
      `}</style>
    </div>
  );
}
