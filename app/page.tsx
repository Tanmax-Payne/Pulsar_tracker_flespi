/**
 * app/page.tsx  –  Pulsar Tracker Dashboard
 *
 * Grid layout (no overlapping):
 *   row 1: <StatusBar>           40px
 *   row 2: sidebar | map         1fr (fills viewport)
 *   row 3: <TelemetryStrip>      56px
 */
"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useFlespiDevice } from "@/hooks/useFlespiDevice";
import { StatusBar }       from "@/components/StatusBar";
import { DeviceCard }      from "@/components/DeviceCard";
import { TelemetryStrip }  from "@/components/TelemetryStrip";
import { FallAlert }       from "@/components/FallAlert";
//import { MqttHandlers } from "@/lib/flespiMqtt";


// Leaflet must be client-only
const TrackerMap = dynamic(() => import("@/components/TrackerMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%", height: "100%",
        background: "linear-gradient(135deg,#161b22 25%,#1c2128 50%,#161b22 75%)",
        backgroundSize: "400% 400%",
        animation: "shimmer 1.5s ease infinite",
      }}
      aria-label="Loading map…"
    />
  ),
});

const TOKEN      = process.env.NEXT_PUBLIC_FLESPI_TOKEN ?? "";
const DEVICE_IDS = (process.env.NEXT_PUBLIC_DEVICE_IDS ?? "")
  .split(",").map(Number).filter(Boolean);

export default function Home() {
  const { devices, connected, loading, error } = useFlespiDevice(TOKEN, DEVICE_IDS);
  const [selectedId, setSelectedId]            = useState<number | null>(DEVICE_IDS[0] ?? null);
  const [dismissedFalls, setDismissedFalls]    = useState<Set<number>>(new Set());

  const selectedDevice = selectedId != null ? (devices[selectedId] ?? null) : null;

  const dismissFall = useCallback((id: number) => {
    setDismissedFalls((prev) => new Set([...prev, id]));
  }, []);

  const allDevices = Object.values(devices);
  const activeAlerts = allDevices.filter(
    (d) => d.fallDetected && d.info && !dismissedFalls.has(d.info.id)
  );

  return (
    <>
      <div className="dashboard">
        {/* row 1 — status bar */}
        <StatusBar
          mqttConnected={connected}
          loading={loading}
          error={error}
          deviceCount={allDevices.length}
        />

        {/* row 2 — sidebar + map */}
        <div className="dashboard-body">
          <aside className="sidebar">
            <p className="sidebar-label">DEVICES</p>

            {loading && allDevices.length === 0 && (
              <p className="sidebar-hint">Fetching devices…</p>
            )}

            {allDevices.map((dev) => (
              <DeviceCard
                key={dev.info?.id ?? "unknown"}
                device={dev}
                selected={dev.info?.id === selectedId}
                onSelect={() => setSelectedId(dev.info?.id ?? null)}
              />
            ))}

            {/* fall alerts stacked below device list */}
            {activeAlerts.length > 0 && (
              <div className="sidebar-section-label">ALERTS</div>
            )}
            {activeAlerts.map((d) => (
              <FallAlert
                key={d.info?.id}
                deviceName={d.info?.name ?? `Device ${d.info?.id}`}
                ts={d.lastFallTs}
                onDismiss={() => d.info && dismissFall(d.info.id)}
              />
            ))}
          </aside>

          {/* map — fills remaining grid cell */}
          <main className="map-area">
            <TrackerMap
              devices={allDevices}
              selectedId={selectedId}
              token={TOKEN}
              onSelect={setSelectedId}
            />
          </main>
        </div>

        {/* row 3 — telemetry strip */}
        {selectedDevice && (
          <TelemetryStrip
            telemetry={selectedDevice.telemetry}
            latestMessage={selectedDevice.latestMessage}
          />
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        html, body {
          margin: 0; padding: 0;
          height: 100%; overflow: hidden;
          font-family: "IBM Plex Mono", "Fira Code", monospace;
          background: #0d1117;
          color: #c9d1d9;
        }

        @keyframes shimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <style jsx>{`
        .dashboard {
          display: grid;
          grid-template-rows: 40px 1fr 56px;
          height: 100dvh;
          overflow: hidden;
        }

        /* sidebar + map side by side */
        .dashboard-body {
          display: grid;
          grid-template-columns: 260px 1fr;
          overflow: hidden;
          min-height: 0; /* critical — lets children scroll independently */
        }

        .sidebar {
          background: #0d1117;
          border-right: 1px solid #21262d;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 10px 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          scrollbar-width: thin;
          scrollbar-color: #30363d #0d1117;
        }

        .sidebar-label {
          margin: 0 0 2px 2px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #484f58;
        }

        .sidebar-section-label {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #7a1f1c;
          margin-top: 4px;
          padding-top: 6px;
          border-top: 1px solid #21262d;
        }

        .sidebar-hint {
          font-size: 11px;
          color: #484f58;
          padding: 4px 6px;
          margin: 0;
        }

        /* Leaflet's parent must be position:relative */
        .map-area {
          position: relative;
          overflow: hidden;
          min-width: 0;
          min-height: 0;
        }

        /* ── responsive ── */
        @media (max-width: 600px) {
          .dashboard {
            /* strip hidden on mobile to save space */
            grid-template-rows: 40px 1fr auto;
          }

          .dashboard-body {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr auto;
          }

          .map-area { order: 1; }

          .sidebar {
            order: 2;
            border-right: none;
            border-top: 1px solid #21262d;
            flex-direction: row;
            overflow-x: auto;
            overflow-y: hidden;
            height: 130px;
            padding: 6px;
          }
        }
      `}</style>
    </>
  );
}
