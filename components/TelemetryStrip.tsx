"use client";

import type { Telemetry, Message } from "@/hooks/useFlespiDevice";

interface TelemetryStripProps {
  telemetry: Telemetry;
  latestMessage: Message | null;
}

// Parameters to highlight / display prominently
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

function getValueColor(param: string, value: unknown): string {
  if (param === "sensor.fall" && value === 1) return "#f85149";
  if (param === "alarm.type" && value === "fall") return "#f85149";
  if (param === "engine.ignition.status") return value ? "#3fb950" : "#f85149";
  if (param === "battery.voltage" && typeof value === "number") {
    return value < 3.4 ? "#f85149" : value < 3.7 ? "#d29922" : "#3fb950";
  }
  if (param === "position.speed" && typeof value === "number") {
    return value > 120 ? "#f85149" : value > 80 ? "#d29922" : "#c9d1d9";
  }
  return "#c9d1d9";
}

export function TelemetryStrip({ telemetry, latestMessage }: TelemetryStripProps) {
  if (!Object.keys(telemetry).length) return null;

  // Sort: priority params first, then alphabetical
  const sorted = Object.entries(telemetry).sort(([a], [b]) => {
    const ai = PRIORITY_PARAMS.indexOf(a);
    const bi = PRIORITY_PARAMS.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="strip" role="region" aria-label="Live telemetry">
      {sorted.map(([param, { value, ts }]) => {
        const isPriority = PRIORITY_PARAMS.includes(param);
        const label = param.replace(/\./g, "\u200B."); // allow wrapping at dots
        const color = getValueColor(param, value);

        return (
          <div key={param} className={`cell ${isPriority ? "cell--priority" : ""}`}>
            <div className="cell-label">{label}</div>
            <div className="cell-value" style={{ color }}>
              {formatValue(value)}
            </div>
            {ts && (
              <div className="cell-ts">
                {new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
            )}
          </div>
        );
      })}

      {/* Raw message timestamp */}
      {latestMessage?.timestamp && (
        <div className="cell cell--msg">
          <div className="cell-label">MSG TS</div>
          <div className="cell-value" style={{ color: "#58a6ff" }}>
            {new Date(latestMessage.timestamp * 1000).toLocaleTimeString()}
          </div>
        </div>
      )}

      <style jsx>{`
        .strip {
          display: flex;
          align-items: stretch;
          overflow-x: auto;
          background: #0d1117;
          border-top: 1px solid #21262d;
          height: 56px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .strip::-webkit-scrollbar { display: none; }

        .cell {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 12px;
          border-right: 1px solid #161b22;
          min-width: 90px;
          transition: background 0.15s;
        }

        .cell:hover { background: #161b22; }

        .cell--priority {
          background: #0d1117;
          border-right-color: #21262d;
        }

        .cell--msg {
          border-left: 1px solid #21262d;
          margin-left: auto;
          flex-shrink: 0;
        }

        .cell-label {
          font-family: "IBM Plex Mono", monospace;
          font-size: 8px;
          color: #484f58;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 2px;
          white-space: nowrap;
        }

        .cell-value {
          font-family: "IBM Plex Mono", monospace;
          font-size: 13px;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          line-height: 1;
        }

        .cell-ts {
          font-family: "IBM Plex Mono", monospace;
          font-size: 8px;
          color: #30363d;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}