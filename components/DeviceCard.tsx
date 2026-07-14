"use client";

import { useNow } from "@/hooks/useNow";
import { isFresh, relativeTime } from "@/lib/freshness";
import type { DeviceState } from "@/hooks/useFlespiDevice";

interface DeviceCardProps {
  device: DeviceState;
  selected: boolean;
  onSelect: () => void;
}

export function DeviceCard({ device, selected, onSelect }: DeviceCardProps) {
  const { info, telemetry, fallDetected, lastFallTs } = device;

  const lat = telemetry["position.latitude"]?.value as number | undefined;
  const lng = telemetry["position.longitude"]?.value as number | undefined;
  const speed = telemetry["position.speed"]?.value as number | undefined;
  const battery = telemetry["battery.voltage"]?.value as number | undefined;
  const altitude = telemetry["position.altitude"]?.value as number | undefined;
  const satellites = telemetry["position.satellites"]?.value as number | undefined;
  const lastTs = telemetry["position.latitude"]?.ts;

  const batteryPct = battery != null ? Math.round(((battery - 3.2) / (4.2 - 3.2)) * 100) : null;
  const batteryColor =
    batteryPct == null ? "var(--text-muted)"
    : batteryPct > 50 ? "var(--success)"
    : batteryPct > 20 ? "var(--warning)"
    : "var(--danger)";

  const hasGps = lat != null && lng != null;

  const now = useNow(1000);
  const isStale = !isFresh(lastTs, now); // >30s since last packet

  return (
    <button onClick={onSelect} className={`card ${selected ? "card--selected" : ""} ${fallDetected ? "card--fall" : ""}`}>
      {/* header row */}
      <div className="card-header">
        <span className="card-name">{info?.name ?? `Device ${info?.id}`}</span>
        <div className="card-badges">
          {isStale && <span className="badge badge--stale">STALE</span>}
          {fallDetected && <span className="badge badge--fall">FALL</span>}
        </div>
      </div>

      {/* GPS row */}
      <div className="card-row">
        <span className={`card-gps-dot ${hasGps ? "gps-ok" : "gps-no"}`} />
        {hasGps ? (
          <span className="card-coord">{lat!.toFixed(5)}, {lng!.toFixed(5)}</span>
        ) : (
          <span className="card-muted">No GPS fix</span>
        )}
      </div>

      {/* data grid */}
      <div className="card-grid">
        {speed != null && (
          <div className="card-cell">
            <span className="cell-label">Speed</span>
            <span className="cell-value">{speed.toFixed(1)} <small>km/h</small></span>
          </div>
        )}
        {altitude != null && (
          <div className="card-cell">
            <span className="cell-label">Alt</span>
            <span className="cell-value">{Math.round(altitude)} <small>m</small></span>
          </div>
        )}
        {satellites != null && (
          <div className="card-cell">
            <span className="cell-label">Sats</span>
            <span className="cell-value" style={{ color: satellites < 4 ? "var(--warning)" : "var(--text)" }}>
              {satellites}
            </span>
          </div>
        )}
        {battery != null && (
          <div className="card-cell">
            <span className="cell-label">Batt</span>
            <span className="cell-value" style={{ color: batteryColor }}>
              {battery.toFixed(2)} <small>V</small>
              {batteryPct != null && <> · {batteryPct}%</>}
            </span>
          </div>
        )}
      </div>

      {/* fall timestamp */}
      {fallDetected && lastFallTs && (
        <div className="card-fall-ts">
          Last fall: {new Date(lastFallTs * 1000).toLocaleString()}
        </div>
      )}

      {/* last seen */}
      {lastTs && (
        <div className={`card-lastseen ${isStale ? "lastseen--stale" : "lastseen--fresh"}`}>
          {relativeTime(lastTs, now)}
        </div>
      )}

      <style jsx>{`
        .card {
          display: block;
          width: 100%;
          text-align: left;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 10px;
          cursor: pointer;
          font-family: "IBM Plex Mono", monospace;
          color: inherit;
          transition: border-color 0.15s, background 0.15s;
          position: relative;
        }

        .card:hover {
          border-color: var(--accent-border);
          background: var(--bg-hover);
        }

        .card--selected {
          border-color: var(--accent) !important;
          background: var(--bg-selected) !important;
        }

        .card--fall {
          border-color: var(--danger);
          animation: fall-pulse 2s ease-in-out infinite;
        }

        @keyframes fall-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(248, 81, 73, 0); }
          50%       { box-shadow: 0 0 0 4px rgba(248, 81, 73, 0.2); }
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .card-name {
          font-size: 12px;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }

        .card-badges {
          display: flex;
          gap: 4px;
        }

        .badge {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 3px;
          letter-spacing: 0.06em;
        }

        .badge--fall { background: var(--danger-bg-soft); color: var(--danger); border: 1px solid var(--danger-border); }
        .badge--stale { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning-border); }

        .card-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }

        .card-gps-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .gps-ok { background: var(--success); box-shadow: 0 0 4px var(--success); }
        .gps-no { background: var(--text-dim); }

        .card-coord {
          font-size: 10px;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }

        .card-muted { font-size: 10px; color: var(--text-dim); }

        .card-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3px 6px;
        }

        .card-cell {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 2px 0;
          border-bottom: 1px solid var(--border);
        }

        .cell-label {
          font-size: 9px;
          color: var(--text-dim);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .cell-value {
          font-size: 11px;
          color: var(--text);
          font-variant-numeric: tabular-nums;
        }

        .cell-value small { font-size: 9px; color: var(--text-muted); }

        .card-fall-ts {
          margin-top: 5px;
          font-size: 9px;
          color: var(--danger);
          border-top: 1px solid var(--danger-bg-soft);
          padding-top: 4px;
        }

        .card-lastseen {
          margin-top: 4px;
          font-size: 9px;
          text-align: right;
          font-weight: 600;
        }

        .lastseen--fresh { color: var(--success); }
        .lastseen--stale { color: var(--danger); }
      `}</style>
    </button>
  );
}
