import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  position: [number, number];
  avatarUrl: string;
}

// A component to recenter the map when position changes
function RecenterAutomatically({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

export const Map: React.FC<MapProps> = ({ position, avatarUrl }) => {
  // Create a custom icon using the generated avatar
  const avatarIcon = new L.Icon({
    iconUrl: avatarUrl,
    iconSize: [64, 64],
    iconAnchor: [32, 64],
    className: 'drop-shadow-lg bg-white rounded-full p-1 border-4 border-blue-500',
  });

  return (
    <MapContainer
      center={position}
      zoom={17}
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={avatarIcon} />
      <RecenterAutomatically lat={position[0]} lng={position[1]} />
    </MapContainer>
  );
};
