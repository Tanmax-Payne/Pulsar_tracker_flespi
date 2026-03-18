'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet default icon issue
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

interface MapSectionProps {
  lat: number;
  lon: number;
  trail: [number, number][];
  trailColor: string;
  trailWeight: number;
  trailHidden: boolean;
}

export default function MapSection({ lat, lon, trail, trailColor, trailWeight, trailHidden }: MapSectionProps) {
  return (
    <MapContainer 
      center={[lat, lon]} 
      zoom={15} 
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lon]}>
        <Popup>
          <div className="text-xs font-bold uppercase">
            Current Location<br/>
            {lat.toFixed(4)}, {lon.toFixed(4)}
          </div>
        </Popup>
      </Marker>
      {trail.length > 1 && !trailHidden && (
        <Polyline 
          positions={trail} 
          color={trailColor} 
          weight={trailWeight} 
          opacity={0.6} 
          dashArray="10, 10"
        />
      )}
      <MapUpdater center={[lat, lon]} />
    </MapContainer>
  );
}
