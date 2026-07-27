'use client';

import React, { useEffect, useRef } from 'react';
import { Map, Marker as MapboxMarker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup as LeafletPopup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bike } from 'lucide-react';

// Leaflet custom marker configuration
const customLeafletIcon = (color: string, label: string) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; color: white; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800;">${label}</div>`,
    className: 'custom-leaflet-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
};

interface TrackingMapProps {
  restaurantCoords: [number, number]; // [lat, lng]
  customerCoords?: [number, number] | null; // [lat, lng]
  agentCoords?: [number, number] | null; // [lat, lng]
}

// Leaflet Map Pan Handler
const LeafletPanView: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

export const TrackingMap: React.FC<TrackingMapProps> = ({
  restaurantCoords,
  customerCoords,
  agentCoords,
}) => {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const centerCoords = agentCoords || customerCoords || restaurantCoords;
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Clean up Leaflet ID on container to prevent "Map container is already initialized" error
  useEffect(() => {
    return () => {
      if (mapContainerRef.current) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }
    };
  }, []);

  // Render Leaflet fallback if Mapbox Access Token is missing
  if (!token) {
    return (
      <div ref={mapContainerRef} className="w-full h-80 rounded-lg overflow-hidden border border-zinc-800 shadow-sm relative">
        <MapContainer
          key={`leaflet-track-${centerCoords[0]}-${centerCoords[1]}`}
          center={centerCoords}
          zoom={14}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Restaurant Marker */}
          <LeafletMarker position={restaurantCoords} icon={customLeafletIcon('#FF6B00', 'K')}>
            <LeafletPopup>IPL Dhaba (Kitchen)</LeafletPopup>
          </LeafletMarker>

          {/* Customer Marker */}
          {customerCoords && (
            <LeafletMarker position={customerCoords} icon={customLeafletIcon('#3B82F6', 'C')}>
              <LeafletPopup>Your Delivery Address</LeafletPopup>
            </LeafletMarker>
          )}

          {/* Driver Marker */}
          {agentCoords && (
            <LeafletMarker position={agentCoords} icon={customLeafletIcon('#8B5CF6', '🏍️')}>
              <LeafletPopup>Delivery Rider</LeafletPopup>
            </LeafletMarker>
          )}

          <LeafletPanView center={centerCoords} />
        </MapContainer>
      </div>
    );
  }

  // Render Premium Mapbox Map
  return (
    <div className="w-full h-80 rounded-lg overflow-hidden border border-zinc-800 shadow-sm">
      <Map
        key={`mapbox-track-${centerCoords[0]}:${centerCoords[1]}`}
        initialViewState={{
          longitude: centerCoords[1],
          latitude: centerCoords[0],
          zoom: 14,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={token}
      >
        <NavigationControl position="top-right" />

        {/* Restaurant Pin */}
        <MapboxMarker longitude={restaurantCoords[1]} latitude={restaurantCoords[0]}>
          <div className="w-8 h-8 rounded-full bg-saffron border-2 border-white shadow-premium flex items-center justify-center text-sm font-bold text-white animate-bounce">
            K
          </div>
        </MapboxMarker>

        {/* Customer Pin */}
        {customerCoords && (
          <MapboxMarker longitude={customerCoords[1]} latitude={customerCoords[0]}>
            <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white shadow-premium flex items-center justify-center text-xs font-bold text-white">
              C
            </div>
          </MapboxMarker>
        )}

        {/* Driver Pin */}
        {agentCoords && (
          <MapboxMarker longitude={agentCoords[1]} latitude={agentCoords[0]}>
            <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow-premium flex items-center justify-center text-sm animate-bounce">
              <Bike size={16} className="text-white" />
            </div>
          </MapboxMarker>
        )}
      </Map>
    </div>
  );
};

export default TrackingMap;
