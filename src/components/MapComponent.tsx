import React, { useEffect, useRef, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker, OverlayView } from '@react-google-maps/api';
import { mapContainerStyle, MAP_ZOOM, getMapCenter, mapOptions, libraries, CIRCLE_SVG } from '@/config/mapConfig';
import { type Attestation } from '@/utils/attestations';
import { analyzeGrass } from '@/utils/grassDetection';
import Logger from '@/utils/logger';
import { LocationResult } from '@/utils/location';

// Add styles for markers
export const MARKER_STYLES = `
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.9; }
    100% { transform: scale(1); opacity: 1; }
  }
  .pulsating-dot {
    position: absolute;
    width: 16px;
    height: 16px;
    background-color: #3B82F6;
    border: 2px solid white;
    border-radius: 50%;
    animation: pulse 2s infinite;
    transform: translate(-50%, -50%);
  }
  .marker-emoji {
    transform: scale(0.8);
  }
`;

// Function to group overlapping attestations
const groupOverlappingAttestations = (attestations: Attestation[]): { [key: string]: Attestation[] } => {
  const groups: { [key: string]: Attestation[] } = {};
  
  // Round coordinates to 4 decimal places (approximately 11 meters at the equator)
  attestations.forEach(attestation => {
    const key = `${attestation.lat.toFixed(4)},${attestation.lon.toFixed(4)}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(attestation);
  });
  
  return groups;
};

interface MapComponentProps {
  location: LocationResult | null;
  initialLocation: LocationResult | null;
  manualLocation: LocationResult | null;
  selectedAttestation: Attestation | null;
  attestations: Attestation[];
  isAnalyzing: boolean;
  isTouchingGrass: boolean;
  isViewingFeed?: boolean;
  feedAttestations?: Attestation[];
  onSelectAttestation: (attestation: Attestation | null) => void;
  onLocationChange: (location: LocationResult) => void;
  onAnalysisStart: () => void;
  onAnalysisComplete: (result: { isTouchingGrass: boolean }) => void;
  onMapLoad?: (map: google.maps.Map) => void;
  showOnlyGrass?: boolean;
  currentUserAddress?: string;
  selectedUserAddress?: string | null;
  onViewChange: (view: 'status' | 'menu' | 'history' | 'feed' | 'leaderboard') => void;
  isAuthenticated: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({
  location,
  initialLocation,
  manualLocation,
  selectedAttestation,
  attestations,
  isAnalyzing,
  isTouchingGrass,
  isViewingFeed = false,
  feedAttestations = [],
  onSelectAttestation,
  onLocationChange,
  onAnalysisStart,
  onAnalysisComplete,
  onMapLoad,
  showOnlyGrass = false,
  currentUserAddress = '',
  selectedUserAddress = null,
  onViewChange,
  isAuthenticated,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);

  // Append style tag for marker styles once on mount
  useEffect(() => {
    const styleId = 'marker-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = MARKER_STYLES;
      document.head.appendChild(style);

      return () => {
        const styleToRemove = document.getElementById(styleId);
        if (styleToRemove) {
          styleToRemove.remove();
        }
      };
    }
  }, []);

  // Handle map initialization
  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    if (location) {
      map.setCenter(getMapCenter(location.lat, location.lng));
      map.setZoom(MAP_ZOOM);
    }
    onMapLoad?.(map);
  };

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !mapRef.current) return;

    const newLocation: LocationResult = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
      isPrecise: true // Manual clicks are considered precise
    };

    // Reset zoom and center map on clicked location
    mapRef.current.setZoom(MAP_ZOOM);
    mapRef.current.panTo(newLocation);

    // Clear selected attestation and change view back to status
    onSelectAttestation(null);
    onViewChange('status');

    onLocationChange(newLocation);
    onAnalysisStart();
    
    try {
      const result = await analyzeGrass(newLocation.lat, newLocation.lng, mapRef.current, false);
      onAnalysisComplete(result);
    } catch (error) {
      Logger.error('Map analysis failed', { error });
      onAnalysisComplete({ isTouchingGrass: false });
    }
  };

  // Handle selected attestation changes
  useEffect(() => {
    if (selectedAttestation && mapRef.current) {
      const center = getMapCenter(selectedAttestation.lat, selectedAttestation.lon);
      mapRef.current.panTo(center);
      mapRef.current.setZoom(MAP_ZOOM);
    }
  }, [selectedAttestation]);

  // Group overlapping attestations
  const groupedAttestations = useMemo(() => {
    // If viewing feed or not authenticated, use feedAttestations
    let attestationsToShow = isViewingFeed ? feedAttestations : attestations;

    // Filter by selected user if specified
    if (selectedUserAddress) {
      attestationsToShow = attestationsToShow.filter(attestation => 
        attestation.attester.toLowerCase() === selectedUserAddress.toLowerCase()
      );
    }

    // Filter based on showOnlyGrass setting
    const filteredAttestations = attestationsToShow.filter(attestation => 
      !showOnlyGrass || attestation.isTouchingGrass
    );

    return groupOverlappingAttestations(filteredAttestations);
  }, [isViewingFeed, feedAttestations, attestations, showOnlyGrass, selectedUserAddress]);

  // Center map on most recent attestation when user is selected
  useEffect(() => {
    if (selectedUserAddress && mapRef.current) {
      const userAttestations = attestations.filter(
        attestation => attestation.attester.toLowerCase() === selectedUserAddress.toLowerCase()
      );
      
      if (userAttestations.length > 0) {
        // Find most recent attestation (assuming attestations are sorted by timestamp)
        const mostRecent = userAttestations[userAttestations.length - 1];
        const center = getMapCenter(mostRecent.lat, mostRecent.lon);
        mapRef.current.panTo(center);
        mapRef.current.setZoom(MAP_ZOOM);
        onSelectAttestation(mostRecent);
      }
    }
  }, [selectedUserAddress, attestations, onSelectAttestation]);

  // Add debug logging for visibility
  useEffect(() => {
    Logger.debug('Map visibility state', {
      isViewingFeed,
      attestationsCount: attestations.length,
      feedAttestationsCount: feedAttestations.length,
      visibleAttestationsCount: Object.values(groupedAttestations).flat().length,
      isAuthenticated,
      showOnlyGrass,
      selectedUserAddress
    });
  }, [groupedAttestations, isViewingFeed, attestations, feedAttestations, isAuthenticated, showOnlyGrass, selectedUserAddress]);

  return (
    <>
      {location && (
        <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} libraries={libraries}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={location ? getMapCenter(location.lat, location.lng) : undefined}
            zoom={MAP_ZOOM}
            options={mapOptions}
            onClick={handleMapClick}
            onLoad={handleMapLoad}
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
                  text: isAnalyzing ? "❓" : (isTouchingGrass ? "🌿" : "❌"),
                  fontSize: "19px",
                  className: "marker-emoji"
                }}
                zIndex={2}
              />
            )}

            {/* Render grouped attestations */}
            {Object.entries(groupedAttestations).map(([, group]) => {
              // Sort group to ensure selected attestation is last (appears on top)
              const sortedGroup = [...group].sort((a, b) => {
                if (a.id === selectedAttestation?.id) return 1;
                if (b.id === selectedAttestation?.id) return -1;
                return 0;
              });

              return sortedGroup.map((attestation, index) => {
                const baseZIndex = index * 2;
                const isSelected = attestation.id === selectedAttestation?.id;
                const finalZIndex = isSelected ? (group.length * 2) + 2 : baseZIndex;
                const isUserAttestation = isAuthenticated && attestation.attester.toLowerCase() === currentUserAddress.toLowerCase();

                return (
                  <Marker
                    key={attestation.id}
                    position={{ lat: attestation.lat, lng: attestation.lon }}
                    icon={{
                      path: CIRCLE_SVG,
                      scale: 2,
                      fillColor: attestation.isTouchingGrass ? '#34D399' : '#F87171',
                      fillOpacity: isSelected ? 1 : 0.9,
                      strokeColor: '#FFFFFF',
                      strokeWeight: isSelected ? 3 : 2,
                    }}
                    label={{
                      text: attestation.isTouchingGrass ? "🌿" : "❌",
                      fontSize: "19px",
                      className: "marker-emoji"
                    }}
                    onClick={() => {
                      onSelectAttestation(attestation);
                      onViewChange(isAuthenticated && isUserAttestation ? 'history' : 'feed');
                    }}
                    zIndex={finalZIndex}
                  />
                );
              });
            })}
          </GoogleMap>
        </LoadScript>
      )}
    </>
  );
};

export default MapComponent; 