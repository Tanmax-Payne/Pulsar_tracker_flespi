"use client";

import { useNow } from "@/hooks/useNow";
import { isFresh, relativeTime } from "@/lib/freshness";
import type { DeviceState } from "@/hooks/useFlespiDevice";

interface LastPacketBadgeProps {
  device: DeviceState | null;
}

// The single most important number on the default screen: how old is
// the data on screen, right now. Green within 30s, red past it.
export function LastPacketBadge({ device }: LastPacketBadgeProps) {
  const now = useNow(1000);
  if (!device?.info) return null;

  const ts = device.latestMessage?.timestamp ?? device.telemetry["position.latitude"]?.ts ?? null;
  const fresh = isFresh(ts, now);

  return (
    <div className={`badge ${fresh ? "badge--fresh" : "badge--stale"}`}>
      <span className="dot" />
      <span className="name">{device.info.name}</span>
      <span className="sep">·</span>
      <span className="ts">last packet {relativeTime(ts, now)}</span>

      <style jsx>{`
        .badge {
          display: flex;
          align-items: center;
          gap: 7px;
          background: #0d1117ee;
          backdrop-filter: blur(4px);
          border: 1px solid #30363d;
          border-radius: 20px;
          padding: 6px 14px;
          font-family: "IBM Plex Mono", monospace;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        }

        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .badge--fresh .dot { background: #3fb950; box-shadow: 0 0 6px #3fb950; animation: pulse 2s ease-in-out infinite; }
        .badge--stale .dot { background: #f85149; box-shadow: 0 0 6px #f85149; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        .name { color: #c9d1d9; }
        .sep  { color: #30363d; }

        .badge--fresh .ts { color: #3fb950; }
        .badge--stale .ts { color: #f85149; }
      `}</style>
    </div>
  );
}
