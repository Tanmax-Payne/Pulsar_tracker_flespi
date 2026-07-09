"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useFlespiDevice } from "@/hooks/useFlespiDevice";
import { StatusBar }        from "@/components/StatusBar";
import { Drawer }           from "@/components/Drawer";
import { DeviceListPanel }  from "@/components/DeviceListPanel";
import { ParameterGrid }    from "@/components/ParameterGrid";

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
  const [selectedId, setSelectedId] = useState<number | null>(DEVICE_IDS[0] ?? null);
  const [dismissed,  setDismissed ] = useState<Set<number>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allDevices  = Object.values(devices);
  const selectedDev = selectedId != null ? devices[selectedId] ?? null : null;

  const alerts = allDevices
    .filter(d => d.fallDetected && d.info && !dismissed.has(d.info.id))
    .map(d => ({ id: d.info!.id, deviceName: d.info!.name, ts: d.lastFallTs }));

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
          onOpenDrawer={() => setDrawerOpen(true)}
        />

        <main className="map-area">
          <TrackerMap
            devices={allDevices}
            selectedId={selectedId}
            onSelect={setSelectedId}
            lastPacketDevice={selectedDev}
            alerts={alerts}
            onDismissAlert={dismiss}
          />
        </main>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <section>
          <p className="section-label">DEVICES</p>
          <DeviceListPanel
            devices={allDevices}
            selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); setDrawerOpen(false); }}
          />
        </section>

        {selectedDev && (
          <section>
            <p className="section-label">PARAMETERS — {selectedDev.info?.name ?? `Device ${selectedId}`}</p>
            <ParameterGrid telemetry={selectedDev.telemetry} latestMessage={selectedDev.latestMessage} />
          </section>
        )}
      </Drawer>

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
          grid-template-rows: 40px 1fr;
          height: 100dvh;
          overflow: hidden;
        }
        .map-area { position: relative; overflow: hidden; min-height: 0; }
        .map-skeleton {
          width: 100%; height: 100%;
          background: linear-gradient(135deg, #161b22 25%, #1c2128 50%, #161b22 75%);
          background-size: 400% 400%;
          animation: shimmer 1.5s ease infinite;
        }
        .section-label {
          margin: 0 0 8px 2px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #484f58;
        }
      `}</style>
    </>
  );
}
