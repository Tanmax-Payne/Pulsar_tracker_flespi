"use client";

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
    batteryPct == null ? "#8b949e"
    : batteryPct > 50 ? "#3fb950"
    : batteryPct > 20 ? "#d29922"
    : "#f85149";

  const hasGps = lat != null && lng != null;
  const isStale = lastTs ? Date.now() / 1000 - lastTs > 300 : false; // >5 min

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
            <span className="cell-value" style={{ color: satellites < 4 ? "#d29922" : "#c9d1d9" }}>
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
        <div className="card-lastseen">
          {new Date(lastTs * 1000).toLocaleTimeString()}
        </div>
      )}

      <style jsx>{`
        .card {
          display: block;
          width: 100%;
          text-align: left;
          background: #161b22;
          border: 1px solid #21262d;
          border-radius: 6px;
          padding: 10px;
          cursor: pointer;
          font-family: "IBM Plex Mono", monospace;
          color: inherit;
          transition: border-color 0.15s, background 0.15s;
          position: relative;
        }

        .card:hover {
          border-color: #388bfd;
          background: #1c2128;
        }

        .card--selected {
          border-color: #58a6ff !important;
          background: #131d2e !important;
        }

        .card--fall {
          border-color: #f85149;
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
          color: #c9d1d9;
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

        .badge--fall { background: #3d0f0e; color: #f85149; border: 1px solid #7a1f1c; }
        .badge--stale { background: #2d2010; color: #d29922; border: 1px solid #4d3a10; }

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

        .gps-ok { background: #3fb950; box-shadow: 0 0 4px #3fb950; }
        .gps-no { background: #484f58; }

        .card-coord {
          font-size: 10px;
          color: #8b949e;
          font-variant-numeric: tabular-nums;
        }

        .card-muted { font-size: 10px; color: #484f58; }

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
          border-bottom: 1px solid #21262d;
        }

        .cell-label {
          font-size: 9px;
          color: #484f58;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .cell-value {
          font-size: 11px;
          color: #c9d1d9;
          font-variant-numeric: tabular-nums;
        }

        .cell-value small { font-size: 9px; color: #8b949e; }

        .card-fall-ts {
          margin-top: 5px;
          font-size: 9px;
          color: #f85149;
          border-top: 1px solid #3d0f0e;
          padding-top: 4px;
        }

        .card-lastseen {
          margin-top: 4px;
          font-size: 9px;
          color: #484f58;
          text-align: right;
        }
      `}</style>
    </button>
  );
}
