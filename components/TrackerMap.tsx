/**
 * components/TrackerMap.tsx
 * Must be loaded with dynamic({ ssr: false }) — Leaflet is browser-only.
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Map as LMap, Marker, Polyline, TileLayer } from "leaflet";
import { Layers } from "lucide-react";
import type { DeviceState } from "@/hooks/useFlespiDevice";
import { HistoryPanel } from "./HistoryPanel";
import { FallAlert } from "./FallAlert";
import { LastPacketBadge } from "./LastPacketBadge";
import "leaflet/dist/leaflet.css";

interface AlertItem {
  id: number;
  deviceName: string;
  ts: number | null;
}

interface TrackerMapProps {
  devices: DeviceState[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  lastPacketDevice: DeviceState | null;
  alerts: AlertItem[];
  onDismissAlert: (id: number) => void;
  // token prop removed — HistoryPanel uses the server-side proxy directly
}

const COLORS = ["#58a6ff", "#3fb950", "#d29922", "#bc8cff", "#f0883e"];

// Free, no-API-key tile providers — swappable base layers.
const BASE_LAYERS = {
  dark: {
    name: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '© <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  light: {
    name: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '© <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  streets: {
    name: "Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
    maxZoom: 19,
  },
  terrain: {
    name: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
} as const;

type LayerKey = keyof typeof BASE_LAYERS;
const LAYER_KEYS = Object.keys(BASE_LAYERS) as LayerKey[];

export default function TrackerMap({ devices, selectedId, onSelect, lastPacketDevice, alerts, onDismissAlert }: TrackerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LMap | null>(null);
  const markersRef   = useRef(new Map<number, Marker>());
  const trackRef     = useRef<Polyline | null>(null);
  const layersRef    = useRef<Partial<Record<LayerKey, TileLayer>>>({});

  const [showHistory,   setShowHistory  ] = useState(false);
  const [hasTrack,      setHasTrack     ] = useState(false);
  const [activeLayer,   setActiveLayer  ] = useState<LayerKey>("dark");
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  // Map creation is async (dynamic leaflet import); other effects that
  // touch mapRef.current need to know when it's actually populated,
  // not just re-run when their own props change.
  const [mapReady, setMapReady] = useState(false);

  // ── mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let alive = true;

    (async () => {
      const L = (await import("leaflet")).default;
      if (!alive || !containerRef.current) return;

      const map = L.map(containerRef.current, { center: [20, 78], zoom: 5, zoomControl: false, attributionControl: false });
      L.control.zoom({ position: "bottomleft" }).addTo(map);
      L.control.attribution({ position: "bottomright", prefix: "" }).addTo(map);

      const def = BASE_LAYERS.dark;
      const base = L.tileLayer(def.url, { maxZoom: def.maxZoom, attribution: def.attribution }).addTo(map);
      layersRef.current.dark = base;

      mapRef.current = map;
      setMapReady(true);
    })();

    return () => {
      alive = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      layersRef.current = {};
    };
  }, []);

  // ── base layer switching ────────────────────────────────────────────────
  const switchLayer = useCallback(async (key: LayerKey) => {
    setLayerMenuOpen(false);
    if (!mapRef.current || key === activeLayer) return;
    const L = (await import("leaflet")).default;
    const map = mapRef.current;

    const current = layersRef.current[activeLayer];
    if (current) map.removeLayer(current);

    let next = layersRef.current[key];
    if (!next) {
      const def = BASE_LAYERS[key];
      next = L.tileLayer(def.url, { maxZoom: def.maxZoom, attribution: def.attribution });
      layersRef.current[key] = next;
    }
    next.addTo(map);
    setActiveLayer(key);
  }, [activeLayer]);

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
  }, [devices, selectedId, onSelect, mapReady]);

  // ── pan to selected ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const m = markersRef.current.get(selectedId);
    if (m) mapRef.current.panTo(m.getLatLng(), { animate: true, duration: 0.5 });
  }, [selectedId, mapReady, devices]);

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

      {/* layer switcher */}
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000 }}>
        <button
          onClick={() => setLayerMenuOpen(o => !o)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: layerMenuOpen ? "#132235" : "#161b22", border: `1px solid ${layerMenuOpen ? "#58a6ff" : "#30363d"}`, color: layerMenuOpen ? "#58a6ff" : "#8b949e", borderRadius: 5, padding: "5px 10px", fontFamily: "IBM Plex Mono,monospace", fontSize: 10, fontWeight: 600, cursor: "pointer", letterSpacing: ".06em" }}
        >
          <Layers size={12} strokeWidth={2.25} />
          {BASE_LAYERS[activeLayer].name.toUpperCase()}
        </button>

        {layerMenuOpen && (
          <div style={{ marginTop: 6, background: "#161b22", border: "1px solid #30363d", borderRadius: 6, overflow: "hidden", minWidth: 130, boxShadow: "0 4px 16px rgba(0,0,0,.4)" }}>
            {LAYER_KEYS.map((key, i) => (
              <button
                key={key}
                onClick={() => switchLayer(key)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: key === activeLayer ? "#132235" : "transparent",
                  color: key === activeLayer ? "#58a6ff" : "#8b949e",
                  border: "none",
                  borderBottom: i < LAYER_KEYS.length - 1 ? "1px solid #21262d" : "none",
                  padding: "7px 10px",
                  fontFamily: "IBM Plex Mono,monospace", fontSize: 10, fontWeight: 600,
                  letterSpacing: ".05em", cursor: "pointer",
                }}
              >
                {BASE_LAYERS[key].name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* last packet received — the headline stat, top-center */}
      <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 1000 }}>
        <LastPacketBadge device={lastPacketDevice} />
      </div>

      {/* overlay controls */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 1000, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        {alerts.length > 0 && (
          <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 6 }}>
            {alerts.map(a => (
              <FallAlert
                key={a.id}
                deviceName={a.deviceName}
                ts={a.ts}
                onDismiss={() => onDismissAlert(a.id)}
              />
            ))}
          </div>
        )}
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
