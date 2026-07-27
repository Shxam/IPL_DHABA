'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const pinIcon = L.divIcon({
  html: `<div style="background-color: #FF6B00; color: white; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">P</div>`,
  className: 'custom-leaflet-marker',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

interface LocationPickerProps {
  initialCoords: [number, number];
  onLocationSelect: (lat: number, lng: number) => void;
}

const MapEventsHelper: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialCoords,
  onLocationSelect,
}) => {
  const [position, setPosition] = useState<[number, number]>(initialCoords);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean up Leaflet container ID to prevent "Map container is already initialized" error
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        (containerRef.current as any)._leaflet_id = null;
      }
    };
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
  };

  return (
    <div ref={containerRef} className="w-full h-64 rounded-md overflow-hidden border border-border shadow-sm">
      <MapContainer
        key={`loc-picker-${position[0]}-${position[1]}`}
        center={position}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker 
          position={position} 
          icon={pinIcon}
          draggable={true}
          eventHandlers={{
            dragend(e) {
              const marker = e.target;
              const pos = marker.getLatLng();
              handleMapClick(pos.lat, pos.lng);
            }
          }}
        />
        <MapEventsHelper onMapClick={handleMapClick} />
      </MapContainer>
    </div>
  );
};

export default LocationPicker;
