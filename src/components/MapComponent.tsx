import React, { useEffect, useRef, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker, OverlayView } from '@react-google-maps/api';
import { mapContainerStyle, MAP_ZOOM, getMapCenter, mapOptions, libraries, PIN_SVG, CHECK_SVG, X_SVG } from '@/config/mapConfig';
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
  
  @keyframes gold-pulse {
    0% { transform: scale(0.95); opacity: 0.7; box-shadow: 0 0 20px 10px rgba(234, 179, 8, 0.4); }
    50% { transform: scale(1.05); opacity: 0.9; box-shadow: 0 0 30px 15px rgba(234, 179, 8, 0.5); }
    100% { transform: scale(0.95); opacity: 0.7; box-shadow: 0 0 20px 10px rgba(234, 179, 8, 0.4); }
  }
  
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0); }
    50% { opacity: 1; transform: scale(1); }
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
    position: relative;
  }
  
  .marker-production {
    animation: gold-pulse 3s infinite ease-in-out;
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
  onViewChange: (view: 'status' | 'history' | 'feed' | 'leaderboard' | 'about') => void;
  isAuthenticated: boolean;
  currentView?: 'status' | 'history' | 'feed' | 'leaderboard' | 'about';
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
  selectedUserAddress = null,
  onViewChange,
  isAuthenticated,
  currentView,
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

  // Zoom out to show all attestations when viewing feed or leaderboard
  useEffect(() => {
    if (mapRef.current && (currentView === 'feed' || currentView === 'leaderboard') && feedAttestations.length > 0) {
      // If there's a selected attestation, don't override the zoom
      if (selectedAttestation) return;

      // Create bounds object to encompass all attestations
      const bounds = new google.maps.LatLngBounds();
      
      // Add all attestation locations to bounds
      const attestationsToShow = feedAttestations.filter(attestation => 
        !showOnlyGrass || attestation.isTouchingGrass
      );
      
      // Only proceed if we have attestations to show
      if (attestationsToShow.length === 0) {
        Logger.info(`No attestations to show in ${currentView} view with current filters`);
        return;
      }
      
      attestationsToShow.forEach(attestation => {
        bounds.extend({ lat: attestation.lat, lng: attestation.lon });
      });
      
      // Fit the map to these bounds with some padding
      mapRef.current.fitBounds(bounds, 50); // 50px padding
      
      Logger.info(`Zoomed out to show all attestations in ${currentView} view`, {
        attestationCount: attestationsToShow.length
      });
    }
  }, [currentView, feedAttestations, showOnlyGrass, selectedAttestation]);

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
              <>
                {!isAnalyzing && (
                  <Marker
                    position={manualLocation}
                    icon={{
                      path: PIN_SVG,
                      scale: 1,
                      fillColor: '#000000',
                      fillOpacity: 0.15,
                      strokeWeight: 0,
                      anchor: new google.maps.Point(0, 0),
                    }}
                    clickable={false}
                    zIndex={1}
                  />
                )}
                
                <Marker
                  position={manualLocation}
                  icon={{
                    path: PIN_SVG,
                    scale: 1,
                    fillColor: isAnalyzing ? '#9CA3AF' : (isTouchingGrass ? '#88D4B5' : '#F0A5A5'),
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 1.5,
                    anchor: new google.maps.Point(0, 0),
                  }}
                  zIndex={2}
                />
                
                {!isAnalyzing && (
                  <Marker
                    position={manualLocation}
                    icon={{
                      path: isTouchingGrass ? CHECK_SVG : X_SVG,
                      scale: 1,
                      strokeColor: '#FFFFFF',
                      strokeWeight: 2,
                      anchor: new google.maps.Point(0, 0),
                    }}
                    clickable={false}
                    zIndex={3}
                  />
                )}
              </>
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
                const isProductionVersion = attestation.mediaVersion === "1.0";
                
                // Give production version markers the highest z-index priority
                const finalZIndex = isProductionVersion ? 1000 + (isSelected ? 2 : 0) : 
                                   isSelected ? (group.length * 2) + 4 : baseZIndex;

                return (
                  <>
                    {/* Glow effect for production version markers */}
                    {isProductionVersion && (
                      <>
                        {/* Single radial gradient glow - placed in a lower map pane */}
                        <OverlayView
                          position={{ lat: attestation.lat, lng: attestation.lon }}
                          mapPaneName={OverlayView.OVERLAY_LAYER}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: 'radial-gradient(circle, rgba(234, 179, 8, 0.7) 0%, rgba(234, 179, 8, 0.6) 30%, rgba(234, 179, 8, 0.5) 40%, rgba(234, 179, 8, 0.3) 75%)',
                              boxShadow: '0 0 20px 10px rgba(234, 179, 8, 0.3)',
                              pointerEvents: 'none',
                              marginLeft: '-10px',
                              marginTop: '-10px',
                            }}
                            className="marker-production"
                          />
                        </OverlayView>
                      </>
                    )}
                  
                    {/* Pin marker - now with explicit higher z-index */}
                    <Marker
                      key={`pin-${attestation.id}`}
                      position={{ lat: attestation.lat, lng: attestation.lon }}
                      icon={{
                        path: PIN_SVG,
                        scale: 1,
                        fillColor: attestation.isTouchingGrass 
                          ? (isProductionVersion ? '#34D399' : '#88D4B5') // Desaturated green for 0.1
                          : (isProductionVersion ? '#F87171' : '#F0A5A5'), // Desaturated red for 0.1
                        fillOpacity: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: isSelected ? 2 : 1.5,
                        anchor: new google.maps.Point(0, 0),
                      }}
                      onClick={() => {
                        onSelectAttestation(attestation);
                        onViewChange('feed');
                      }}
                      zIndex={finalZIndex + 100} // Much higher z-index to ensure it's on top
                    />

                    <Marker
                      key={`symbol-${attestation.id}`}
                      position={{ lat: attestation.lat, lng: attestation.lon }}
                      icon={{
                        path: attestation.isTouchingGrass ? CHECK_SVG : X_SVG,
                        scale: 1,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2.5,
                        anchor: new google.maps.Point(0, 0),
                      }}
                      clickable={false}
                      zIndex={finalZIndex + 101} // Even higher to ensure symbol is on top
                    />
                  </>
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