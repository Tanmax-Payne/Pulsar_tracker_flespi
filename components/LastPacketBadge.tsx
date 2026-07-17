"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNow } from "@/hooks/useNow";
import { isFresh, relativeTime } from "@/lib/freshness";
import type { DeviceState } from "@/hooks/useFlespiDevice";

interface LastPacketBadgeProps {
  devices: DeviceState[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function formatAbsolute(ts: number | null, nowMs: number | null): string {
  if (ts == null || nowMs == null) return "—";
  const d = new Date(ts * 1000);
  const sameDay = d.toDateString() === new Date(nowMs).toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (sameDay) return time;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

function batteryPct(v: number | undefined): number | null {
  return v != null ? Math.round(((v - 3.2) / (4.2 - 3.2)) * 100) : null;
}

// The headline info on the default screen: where is this device, and how
// old is that data, right now (green within 30s, red past it). Tap to
// expand — Dynamic-Island style — for a few more key parameters, and use
// the chevrons to step through the fleet without opening the drawer.
export function LastPacketBadge({ devices, selectedId, onSelect }: LastPacketBadgeProps) {
  const now = useNow(1000);
  const [expanded, setExpanded] = useState(false);

  const device = selectedId != null ? devices.find(d => d.info?.id === selectedId) ?? null : null;
  if (!device?.info) return null;

  const lat     = device.telemetry["position.latitude"]?.value as number | undefined;
  const lng     = device.telemetry["position.longitude"]?.value as number | undefined;
  const battery = device.telemetry["battery.voltage"]?.value as number | undefined;
  const panic   = device.telemetry["ain.3"]?.value;
  const ts      = device.latestMessage?.timestamp ?? device.telemetry["position.latitude"]?.ts ?? null;
  const fresh   = isFresh(ts, now);
  const pct     = batteryPct(battery);
  const panicActive = panic === 1 || panic === true;

  const step = (dir: 1 | -1) => {
    const ids = devices.map(d => d.info?.id).filter((id): id is number => id != null);
    if (ids.length < 2) return;
    const i = ids.indexOf(selectedId ?? ids[0]);
    onSelect(ids[(i + dir + ids.length) % ids.length]);
  };

  return (
    <div className={`badge ${fresh ? "badge--fresh" : "badge--stale"} ${expanded ? "badge--expanded" : ""}`}>
      {devices.length > 1 && (
        <button className="chevron" onClick={() => step(-1)} aria-label="Previous device">
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>
      )}

      <button className="main" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}>
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

          {expanded && (
            <div className="expanded-rows">
              <div className="stat">
                <span className="stat-label">Battery</span>
                <span className="stat-value">{battery != null ? `${battery.toFixed(2)}V${pct != null ? ` · ${pct}%` : ""}` : "—"}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Last online</span>
                <span className="stat-value">{relativeTime(ts, now)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Panic (AIN3)</span>
                <span className={`stat-value ${panicActive ? "stat-value--panic" : ""}`}>
                  {panic == null ? "—" : panicActive ? "TRIGGERED" : "OK"}
                </span>
              </div>
            </div>
          )}
        </div>
      </button>

      {devices.length > 1 && (
        <button className="chevron" onClick={() => step(1)} aria-label="Next device">
          <ChevronRight size={14} strokeWidth={2.5} />
        </button>
      )}

      <style jsx>{`
        .badge {
          display: flex;
          align-items: flex-start;
          gap: 2px;
          background: color-mix(in srgb, var(--bg) 93%, transparent);
          backdrop-filter: blur(4px);
          border: 1px solid var(--border-strong);
          border-radius: 14px;
          padding: 5px;
          font-family: "IBM Plex Mono", monospace;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
          transition: border-radius 0.25s ease;
        }

        .main {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: none;
          border: none;
          padding: 2px 6px;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
        }

        .chevron {
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: center;
          width: 22px;
          height: 22px;
          background: none;
          border: none;
          border-radius: 50%;
          color: var(--text-muted);
          cursor: pointer;
          flex-shrink: 0;
        }
        .chevron:hover { background: var(--bg-hover); color: var(--text); }

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 5px;
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

        .expanded-rows {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 7px;
          padding-top: 7px;
          border-top: 1px solid var(--border);
          animation: expand-in 0.18s ease;
        }

        @keyframes expand-in {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .stat { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .stat-label { font-size: 9px; color: var(--text-dim); letter-spacing: 0.05em; text-transform: uppercase; }
        .stat-value { font-size: 11px; font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums; }
        .stat-value--panic { color: var(--danger); }
      `}</style>
    </div>
  );
}
