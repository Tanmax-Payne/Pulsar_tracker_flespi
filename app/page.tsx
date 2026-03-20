"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useFlespiDevice } from "@/hooks/useFlespiDevice";
import { StatusBar }      from "@/components/StatusBar";
import { DeviceCard }     from "@/components/DeviceCard";
import { TelemetryStrip } from "@/components/TelemetryStrip";
import { FallAlert }      from "@/components/FallAlert";

const TrackerMap = dynamic(() => import("@/components/TrackerMap"), {
  ssr: false,
  loading: () => <div className="map-skeleton" />,
});

// REST calls use server-side FLESPI_TOKEN (via /api/flespi proxy)
// MQTT still needs a client-side token for the WebSocket connection
const MQTT_TOKEN = process.env.NEXT_PUBLIC_FLESPI_TOKEN ?? "";
const DEVICE_IDS = (process.env.NEXT_PUBLIC_DEVICE_IDS ?? "")
  .split(",").map(Number).filter(Boolean);

export default function Home() {
  const { devices, connected, loading, error } = useFlespiDevice(MQTT_TOKEN, DEVICE_IDS);
  const [selectedId, setSelectedId]         = useState<number | null>(DEVICE_IDS[0] ?? null);
  const [dismissed, setDismissed]           = useState<Set<number>>(new Set());

  const allDevices    = Object.values(devices);
  const selectedDev   = selectedId != null ? devices[selectedId] ?? null : null;
  const activeAlerts  = allDevices.filter(d => d.fallDetected && d.info && !dismissed.has(d.info.id));

  const dismiss = useCallback((id: number) =>
    setDismissed(p => new Set([...p, id])), []);

  return (
    <>
      <div className="dashboard">
        <StatusBar
          mqttConnected={connected}
          loading={loading}
          error={error}
          deviceCount={allDevices.length}
        />

        <div className="body">
          <aside className="sidebar">
            <p className="sidebar-label">DEVICES</p>
            {loading && allDevices.length === 0 && <p className="hint">Fetching…</p>}

            {allDevices.map(dev => (
              <DeviceCard
                key={dev.info?.id}
                device={dev}
                selected={dev.info?.id === selectedId}
                onSelect={() => setSelectedId(dev.info?.id ?? null)}
              />
            ))}

            {activeAlerts.length > 0 && <p className="sidebar-label" style={{ marginTop: 8, color: "#7a1f1c" }}>ALERTS</p>}
            {activeAlerts.map(d => (
              <FallAlert
                key={d.info?.id}
                deviceName={d.info?.name ?? `Device ${d.info?.id}`}
                ts={d.lastFallTs}
                onDismiss={() => d.info && dismiss(d.info.id)}
              />
            ))}
          </aside>

          <main className="map-area">
            <TrackerMap
              devices={allDevices}
              selectedId={selectedId}
              token={MQTT_TOKEN}
              onSelect={setSelectedId}
            />
          </main>
        </div>

        {selectedDev && (
          <TelemetryStrip
            telemetry={selectedDev.telemetry}
            latestMessage={selectedDev.latestMessage}
          />
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden;
          font-family: "IBM Plex Mono", monospace; background: #0d1117; color: #c9d1d9; }
        @keyframes shimmer {
          0%,100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
      `}</style>

      <style jsx>{`
        .dashboard {
          display: grid;
          grid-template-rows: 40px 1fr 56px;
          height: 100dvh;
          overflow: hidden;
        }
        .body {
          display: grid;
          grid-template-columns: 260px 1fr;
          min-height: 0;
          overflow: hidden;
        }
        .sidebar {
          background: #0d1117;
          border-right: 1px solid #21262d;
          overflow-y: auto;
          padding: 10px 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          scrollbar-width: thin;
          scrollbar-color: #30363d transparent;
        }
        .sidebar-label {
          margin: 0 0 2px 2px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #484f58;
        }
        .hint { font-size: 11px; color: #484f58; margin: 0; padding: 4px 6px; }
        .map-area { position: relative; overflow: hidden; min-width: 0; min-height: 0; }
        .map-skeleton {
          width: 100%; height: 100%;
          background: linear-gradient(135deg, #161b22 25%, #1c2128 50%, #161b22 75%);
          background-size: 400% 400%;
          animation: shimmer 1.5s ease infinite;
        }
        @media (max-width: 600px) {
          .dashboard { grid-template-rows: 40px 1fr auto; }
          .body { grid-template-columns: 1fr; grid-template-rows: 1fr auto; }
          .map-area { order: 1; }
          .sidebar { order: 2; flex-direction: row; height: 130px; overflow-x: auto; overflow-y: hidden; border-right: none; border-top: 1px solid #21262d; }
        }
      `}</style>
    </>
  );
}
