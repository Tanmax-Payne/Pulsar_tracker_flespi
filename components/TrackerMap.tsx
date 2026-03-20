/**
 * components/TrackerMap.tsx
 * Leaflet map — device markers + optional history polyline.
 * Loaded via dynamic({ ssr: false }) from page.tsx.
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as LMap, Marker, Polyline, DivIcon } from "leaflet";
import type { DeviceState } from "@/hooks/useFlespiDevice";
import { HistoryPanel } from "./HistoryPanel";

interface TrackerMapProps {
  devices: DeviceState[];
  selectedId: number | null;
  token: string;
  onSelect: (id: number) => void;
}

const MARKER_COLORS = ["#58a6ff", "#3fb950", "#d29922", "#bc8cff", "#f0883e"];

export default function TrackerMap({ devices, selectedId, token, onSelect }: TrackerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markersRef = useRef<Map<number, Marker>>(new Map() as any);
  const trackRef = useRef<Polyline | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [hasTrack, setHasTrack] = useState(false);

  // ── mount Leaflet map ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let mounted = true;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!mounted || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [20, 78],
        zoom: 5,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      L.control.attribution({ position: "bottomright", prefix: "" })
        .addAttribution('© <a href="https://carto.com/">CARTO</a>')
        .addTo(map);

      mapRef.current = map;
    })();

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // ── update markers when devices change ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    (async () => {
      const L = (await import("leaflet")).default;

      devices.forEach((dev, idx) => {
        if (!dev.info) return;
        const id = dev.info.id;
        const lat = dev.telemetry["position.latitude"]?.value as number | undefined;
        const lng = dev.telemetry["position.longitude"]?.value as number | undefined;
        if (lat == null || lng == null) return;

        const color = MARKER_COLORS[idx % MARKER_COLORS.length];
        const isSelected = id === selectedId;
        const hasFall = dev.fallDetected;
        const sz = isSelected ? 14 : 10;

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:${sz}px;height:${sz}px;border-radius:50%;
            background:${hasFall ? "#f85149" : color};
            border:${isSelected ? "2px solid #fff" : "1.5px solid rgba(255,255,255,0.35)"};
            box-shadow:0 0 ${isSelected ? 10 : 4}px ${hasFall ? "#f85149" : color};
            transition:all 0.2s;
          "></div>`,
          iconSize: [sz, sz],
          iconAnchor: [sz / 2, sz / 2],
        });

        const existing = markersRef.current.get(id);
        if (existing) {
          existing.setLatLng([lat, lng]);
          existing.setIcon(icon);
        } else {
          const marker = L.marker([lat, lng], { icon })
            .on("click", () => onSelect(id))
            .bindTooltip(`<b>${dev.info!.name}</b>`, {
              permanent: false,
              direction: "top",
              className: "leaflet-dark-tooltip",
            })
            .addTo(map);
          markersRef.current.set(id, marker);
        }
      });
    })();
  }, [devices, selectedId, onSelect]);

  // ── pan to selected device ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const marker = markersRef.current.get(selectedId);
    if (marker) mapRef.current.panTo(marker.getLatLng(), { animate: true, duration: 0.5 });
  }, [selectedId]);

  // ── draw history polyline ────────────────────────────────────────────────
  const handleTrack = useCallback(async (points: Array<[number, number]>) => {
    const map = mapRef.current;
    if (!map || !points.length) return;
    const L = (await import("leaflet")).default;

    trackRef.current?.remove();
    trackRef.current = L.polyline(points, {
      color: "#d29922",
      weight: 2.5,
      opacity: 0.85,
    }).addTo(map);

    setHasTrack(true);
    map.fitBounds(trackRef.current.getBounds(), { padding: [30, 30] });
  }, []);

  const clearTrack = useCallback(() => {
    trackRef.current?.remove();
    trackRef.current = null;
    setHasTrack(false);
  }, []);

  const selectedDevice = selectedId != null ? devices.find((d) => d.info?.id === selectedId) : null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Leaflet container — fills its grid cell */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Floating overlay controls — top-right */}
      <div style={{
        position: "absolute", top: 10, right: 10, zIndex: 1000,
        display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end",
      }}>
        {selectedDevice && (
          <button
            onClick={() => setShowHistory((s) => !s)}
            style={{
              background: showHistory ? "#132235" : "#161b22",
              border: `1px solid ${showHistory ? "#58a6ff" : "#30363d"}`,
              color: showHistory ? "#58a6ff" : "#8b949e",
              borderRadius: 5, padding: "5px 10px",
              fontFamily: "IBM Plex Mono, monospace", fontSize: 10,
              fontWeight: 600, cursor: "pointer", letterSpacing: "0.06em",
            }}
          >
            ⏱ HISTORY
          </button>
        )}

        {hasTrack && (
          <button
            onClick={clearTrack}
            style={{
              background: "#161b22", border: "1px solid #30363d",
              color: "#8b949e", borderRadius: 5, padding: "5px 10px",
              fontFamily: "IBM Plex Mono, monospace", fontSize: 10, cursor: "pointer",
            }}
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
        .leaflet-dark-tooltip {
          background: #161b22; border: 1px solid #30363d;
          color: #c9d1d9; font-family: "IBM Plex Mono", monospace;
          font-size: 11px; padding: 3px 8px; border-radius: 4px; box-shadow: none;
        }
        .leaflet-dark-tooltip::before { border-top-color: #30363d; }
        .leaflet-control-zoom a {
          background: #161b22 !important; color: #8b949e !important; border-color: #30363d !important;
        }
        .leaflet-control-zoom a:hover {
          background: #1c2128 !important; color: #c9d1d9 !important;
        }
      `}</style>
    </div>
  );
}
