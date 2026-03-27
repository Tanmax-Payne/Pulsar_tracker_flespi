/**
 * components/TrackerMap.tsx
 * Must be loaded with dynamic({ ssr: false }) — Leaflet is browser-only.
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as LMap, Marker, Polyline } from "leaflet";
import type { DeviceState } from "@/hooks/useFlespiDevice";
import { HistoryPanel } from "./HistoryPanel";

interface TrackerMapProps {
  devices: DeviceState[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  // token prop removed — HistoryPanel uses the server-side proxy directly
}

const COLORS = ["#58a6ff", "#3fb950", "#d29922", "#bc8cff", "#f0883e"];

export default function TrackerMap({ devices, selectedId, onSelect }: TrackerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LMap | null>(null);
  const markersRef   = useRef(new Map<number, Marker>());
  const trackRef     = useRef<Polyline | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [hasTrack,    setHasTrack   ] = useState(false);

  // ── mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let alive = true;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!alive || !containerRef.current) return;

      const map = L.map(containerRef.current, { center: [20, 78], zoom: 5, zoomControl: true, attributionControl: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      L.control.attribution({ position: "bottomright", prefix: "" })
        .addAttribution('© <a href="https://carto.com/">CARTO</a>').addTo(map);
      mapRef.current = map;
    })();

    return () => {
      alive = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // ── update markers ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      devices.forEach((dev, idx) => {
        if (!dev.info) return;
        const id  = dev.info.id;
        const lat = dev.telemetry["position.latitude"]?.value  as number | undefined;
        const lng = dev.telemetry["position.longitude"]?.value as number | undefined;
        if (lat == null || lng == null) return;

        const color = COLORS[idx % COLORS.length];
        const sel   = id === selectedId;
        const fall  = dev.fallDetected;
        const sz    = sel ? 14 : 10;

        const icon = L.divIcon({
          className: "",
          html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${fall ? "#f85149" : color};border:${sel ? "2px solid #fff" : "1.5px solid rgba(255,255,255,.35)"};box-shadow:0 0 ${sel ? 10 : 4}px ${fall ? "#f85149" : color};transition:all .2s"></div>`,
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz / 2],
        });

        const existing = markersRef.current.get(id);
        if (existing) {
          existing.setLatLng([lat, lng]);
          existing.setIcon(icon);
        } else {
          const m = L.marker([lat, lng], { icon })
            .on("click", () => onSelect(id))
            .bindTooltip(`<b>${dev.info!.name}</b>`, { permanent: false, direction: "top", className: "leaflet-dark-tooltip" })
            .addTo(mapRef.current!);
          markersRef.current.set(id, m);
        }
      });
    })();
  }, [devices, selectedId, onSelect]);

  // ── pan to selected ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const m = markersRef.current.get(selectedId);
    if (m) mapRef.current.panTo(m.getLatLng(), { animate: true, duration: 0.5 });
  }, [selectedId]);

  // ── history track ───────────────────────────────────────────────────────
  const handleTrack = useCallback(async (pts: [number, number][]) => {
    if (!mapRef.current || !pts.length) return;
    const L = (await import("leaflet")).default;
    trackRef.current?.remove();
    trackRef.current = L.polyline(pts, { color: "#d29922", weight: 2.5, opacity: 0.85 }).addTo(mapRef.current);
    setHasTrack(true);
    mapRef.current.fitBounds(trackRef.current.getBounds(), { padding: [30, 30] });
  }, []);

  const clearTrack = useCallback(() => {
    trackRef.current?.remove();
    trackRef.current = null;
    setHasTrack(false);
  }, []);

  const selectedDevice = selectedId != null ? devices.find(d => d.info?.id === selectedId) : null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* overlay controls */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {selectedDevice && (
          <button
            onClick={() => setShowHistory(s => !s)}
            style={{ background: showHistory ? "#132235" : "#161b22", border: `1px solid ${showHistory ? "#58a6ff" : "#30363d"}`, color: showHistory ? "#58a6ff" : "#8b949e", borderRadius: 5, padding: "5px 10px", fontFamily: "IBM Plex Mono,monospace", fontSize: 10, fontWeight: 600, cursor: "pointer", letterSpacing: ".06em" }}
          >
            ⏱ HISTORY
          </button>
        )}
        {hasTrack && (
          <button
            onClick={clearTrack}
            style={{ background: "#161b22", border: "1px solid #30363d", color: "#8b949e", borderRadius: 5, padding: "5px 10px", fontFamily: "IBM Plex Mono,monospace", fontSize: 10, cursor: "pointer" }}
          >
            ✕ CLEAR TRACK
          </button>
        )}
        {showHistory && selectedDevice && (
          <div style={{ width: 220 }}>
            <HistoryPanel
              deviceId={selectedDevice.info!.id}
              onTrack={handleTrack}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}
      </div>

      <style jsx global>{`
        .leaflet-dark-tooltip { background:#161b22; border:1px solid #30363d; color:#c9d1d9; font-family:"IBM Plex Mono",monospace; font-size:11px; padding:3px 8px; border-radius:4px; box-shadow:none; }
        .leaflet-dark-tooltip::before { border-top-color:#30363d; }
        .leaflet-control-zoom a { background:#161b22 !important; color:#8b949e !important; border-color:#30363d !important; }
        .leaflet-control-zoom a:hover { background:#1c2128 !important; color:#c9d1d9 !important; }
      `}</style>
    </div>
  );
}
