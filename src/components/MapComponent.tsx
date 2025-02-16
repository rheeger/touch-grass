import React, { useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, OverlayView } from '@react-google-maps/api';
import { mapContainerStyle, MAP_ZOOM, getMapCenter, mapOptions, libraries, CIRCLE_SVG, MARKER_STYLES } from '@/config/mapConfig';
import { type Attestation } from '@/utils/attestations';

interface MapComponentProps {
  location: { lat: number; lng: number } | null;
  initialLocation: { lat: number; lng: number } | null;
  manualLocation: { lat: number; lng: number } | null;
  selectedAttestation: Attestation | null;
  attestations: Attestation[];
  isAnalyzing: boolean;
  isTouchingGrass: boolean;
  onMapClick: (e: google.maps.MapMouseEvent) => void;
  onMapLoad: (map: google.maps.Map) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  location,
  initialLocation,
  manualLocation,
  selectedAttestation,
  attestations,
  isAnalyzing,
  isTouchingGrass,
  onMapClick,
  onMapLoad,
}) => {
  // Append style tag for marker styles once on mount
  useEffect(() => {
    const styleId = 'marker-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = MARKER_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <>
      {location && (
        <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} libraries={libraries}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={location ? getMapCenter(location.lat, location.lng) : undefined}
            zoom={MAP_ZOOM}
            options={mapOptions}
            onClick={onMapClick}
            onLoad={onMapLoad}
          >
            {initialLocation && (
              <OverlayView position={initialLocation} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div className="pulsating-dot" />
              </OverlayView>
            )}

            {manualLocation && !selectedAttestation && (
              <Marker
                position={manualLocation}
                icon={{
                  path: CIRCLE_SVG,
                  scale: 2,
                  fillColor: isAnalyzing ? '#9CA3AF' : (isTouchingGrass ? '#34D399' : '#F87171'),
                  fillOpacity: 0.9,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                }}
                label={{
                  text: "🚶",
                  fontSize: "24px",
                  className: "walking-person"
                }}
              />
            )}

            {attestations.map((attestation) => (
              <Marker
                key={attestation.id}
                position={{ lat: attestation.lat, lng: attestation.lon }}
                icon={{
                  path: CIRCLE_SVG,
                  scale: 2,
                  fillColor: attestation.isTouchingGrass ? '#34D399' : '#F87171',
                  fillOpacity: attestation.id === selectedAttestation?.id ? 1 : 0.9,
                  strokeColor: '#FFFFFF',
                  strokeWeight: attestation.id === selectedAttestation?.id ? 3 : 2,
                }}
                label={{
                  text: "🚶",
                  fontSize: "24px",
                  className: "walking-person"
                }}
                onClick={() => {
                  // You can bubble up the event through additional props if needed
                }}
              />
            ))}
          </GoogleMap>
        </LoadScript>
      )}
    </>
  );
};

export default MapComponent; 