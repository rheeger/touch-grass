import React, { useEffect, useState, useRef, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker, OverlayView } from '@react-google-maps/api';
import { mapContainerStyle, MAP_ZOOM, getMapCenter, mapOptions, libraries, PIN_SVG, CHECK_SVG, X_SVG, GLOW_CIRCLE_SVG } from '@/config/mapConfig';
import { type Attestation } from '@/utils/attestations';
import { GrassDetectionResult, analyzeGrassAtCoordinates } from '@/services/outdoors';
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

// Function to check if Google Maps API is available
function isGoogleMapsAvailable(): boolean {
  return typeof window !== 'undefined' && 
    typeof window.google !== 'undefined' && 
    typeof window.google.maps !== 'undefined';
}

// Check if lat/lng values are valid numbers
function isValidLatLng(lat: number | undefined | null, lng: number | undefined | null): boolean {
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' && 
    !isNaN(lat) && 
    !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

// Function to safely create a Google Maps Point
function createGoogleMapsPoint(x: number, y: number): google.maps.Point | null {
  if (isGoogleMapsAvailable() && window.google?.maps?.Point) {
    return new window.google.maps.Point(x, y);
  }
  // Return null if Google Maps isn't available yet
  return null;
}

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
  onAnalysisComplete: (result: GrassDetectionResult) => void;
  onMapLoad?: (map: google.maps.Map) => void;
  showOnlyGrass?: boolean;
  currentUserAddress?: string;
  selectedUserAddress?: string | null;
  onViewChange: (view: 'status' | 'history' | 'feed' | 'leaderboard' | 'about') => void;
  currentView?: 'status' | 'history' | 'feed' | 'leaderboard' | 'about';
}

// Track if script is already loaded at the module level
let googleMapsLoaded = false;

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
  currentView,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(googleMapsLoaded || isGoogleMapsAvailable());
  const [hasLoadError, setHasLoadError] = useState(false);
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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

  // Check for already loaded Google Maps on component mount
  useEffect(() => {
    if (isGoogleMapsAvailable()) {
      setIsGoogleMapsLoaded(true);
      googleMapsLoaded = true;
    }
  }, []);

  // Handle map initialization
  const handleMapLoad = (map: google.maps.Map) => {
    Logger.info('Google Maps loaded');
    mapRef.current = map;
    setIsGoogleMapsLoaded(true);
    googleMapsLoaded = true;

    // Only set center if location is valid
    if (location && isValidLatLng(location.lat, location.lng)) {
      map.setCenter(getMapCenter(location.lat, location.lng));
      map.setZoom(MAP_ZOOM);
    }
    
    onMapLoad?.(map);
  };

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !mapRef.current) {
      return;
    }

    const newLocation: LocationResult = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
      isPrecise: true // Manual clicks are considered precise
    };

    mapRef.current.setZoom(MAP_ZOOM);
    mapRef.current.panTo(newLocation);

    // Clear selected attestation and change view back to status
    onSelectAttestation(null);
    onViewChange('status');

    onLocationChange(newLocation);
    onAnalysisStart();
    
    try {
      // Use the grass detection service
      const result = await analyzeGrassAtCoordinates(
        { lat: newLocation.lat, lng: newLocation.lng },
        mapRef.current
      );
      
      onAnalysisComplete(result);
    } catch (error) {
      Logger.error('Map analysis failed', { error });
      // Provide a fallback result
      onAnalysisComplete({
        isTouchingGrass: false,
        confidence: 20,
        reasons: ['Detection failed', error instanceof Error ? error.message : 'Unknown error'],
        explanations: {
          positive: [],
          negative: ["We couldn't determine if you're touching grass."]
        },
        debugInfo: {
          isInPark: false,
          isInBuilding: false,
          placeTypes: []
        }
      });
    }
  };

  // Handle selected attestation changes
  useEffect(() => {
    if (selectedAttestation && mapRef.current && 
        isValidLatLng(selectedAttestation.lat, selectedAttestation.lon)) {
      // Reset the map view for the selected attestation
      const center = getMapCenter(selectedAttestation.lat, selectedAttestation.lon);
      
      // First set zoom to ensure proper centering
      mapRef.current.setZoom(MAP_ZOOM);
      
      // Center the map with a slight delay to ensure smooth animation
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.panTo(center);
        }
      }, 50);
    }
  }, [selectedAttestation]);

  // Create grouped attestations using memo
  const groupedAttestations = useMemo(() => {
    let filteredAttestations = attestations;
    
    if (isViewingFeed && feedAttestations.length > 0) {
      filteredAttestations = feedAttestations;
    }
    
    // Filter for grass-only if needed
    if (showOnlyGrass) {
      filteredAttestations = filteredAttestations.filter(att => att.isTouchingGrass);
    }
    
    // Filter for selected user if needed
    if (selectedUserAddress) {
      filteredAttestations = filteredAttestations.filter(
        attestation => attestation.attester.toLowerCase() === selectedUserAddress.toLowerCase()
      );
    }

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
        if (isValidLatLng(mostRecent.lat, mostRecent.lon)) {
          const center = getMapCenter(mostRecent.lat, mostRecent.lon);
          mapRef.current.panTo(center);
          mapRef.current.setZoom(MAP_ZOOM);
          onSelectAttestation(mostRecent);
        }
      }
    }
  }, [selectedUserAddress, attestations, onSelectAttestation]);

  // Create a safe version of the LatLngBounds for use in templating
  const createSafeBounds = () => {
    if (isGoogleMapsAvailable() && window.google?.maps?.LatLngBounds) {
      return new window.google.maps.LatLngBounds();
    }
    return null;
  };

  // Zoom out to show all attestations when viewing feed or leaderboard
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapRef.current) return;
    
    if ((currentView === 'feed' || currentView === 'leaderboard') && feedAttestations.length > 0) {
      // If there's a selected attestation, don't override the zoom
      if (selectedAttestation) return;

      try {
        // Create bounds object to encompass all attestations
        const bounds = createSafeBounds();
        if (!bounds) return;
        
        // Add all attestation locations to bounds
        const attestationsToShow = feedAttestations.filter(attestation => 
          (!showOnlyGrass || attestation.isTouchingGrass) && 
          isValidLatLng(attestation.lat, attestation.lon)
        );
        
        // Only proceed if we have attestations to show
        if (attestationsToShow.length === 0) return;
        
        attestationsToShow.forEach(attestation => {
          bounds.extend({lat: attestation.lat, lng: attestation.lon});
        });
        
        // Fit the map to these bounds with some padding
        mapRef.current.fitBounds(bounds, 50); // 50px padding
        
        Logger.info(`Zoomed out to show all attestations in ${currentView} view`, {
          attestationCount: attestationsToShow.length
        });
      } catch (error) {
        Logger.error('Error setting map bounds', { error });
      }
    }
  }, [currentView, feedAttestations, showOnlyGrass, selectedAttestation, isGoogleMapsLoaded]);

  // Render a loading state if Maps isn't available
  if (!location || hasLoadError) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[50vh] bg-gray-100">
        <div className="text-center p-4">
          <p className="text-lg font-semibold mb-2">
            {hasLoadError ? 'Error loading maps' : 'Loading location...'}
          </p>
          <p className="text-sm text-gray-600">
            {hasLoadError 
              ? 'Please check your internet connection and try again.' 
              : 'Determining your location...'}
          </p>
          {hasLoadError && (
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          )}
        </div>
      </div>
    );
  }

  // Validate location coordinates before rendering the map
  const validLocation = location && isValidLatLng(location.lat, location.lng) 
    ? location 
    : { lat: 0, lng: 0, isPrecise: false };

  return (
    <>
      {/* Only render LoadScript if Google Maps isn't already loaded */}
      {!isGoogleMapsLoaded ? (
        <LoadScript 
          googleMapsApiKey={googleMapsKey} 
          libraries={libraries}
          onLoad={() => {
            setIsGoogleMapsLoaded(true);
            googleMapsLoaded = true;
          }}
          onError={(error) => {
            Logger.error('Error loading Google Maps script', { error });
            setHasLoadError(true);
          }}
          loadingElement={
            <div className="flex items-center justify-center w-full h-full min-h-[50vh] bg-gray-100">
              <p className="text-lg font-semibold">Loading maps...</p>
            </div>
          }
        >
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={getMapCenter(validLocation.lat, validLocation.lng)}
            zoom={MAP_ZOOM}
            options={mapOptions}
            onClick={handleMapClick}
            onLoad={handleMapLoad}
          >
            {renderMapContent()}
          </GoogleMap>
        </LoadScript>
      ) : (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={getMapCenter(validLocation.lat, validLocation.lng)}
          zoom={MAP_ZOOM}
          options={mapOptions}
          onClick={handleMapClick}
          onLoad={handleMapLoad}
        >
          {renderMapContent()}
        </GoogleMap>
      )}
    </>
  );

  // Separate function to render map content to avoid code duplication
  function renderMapContent() {
    return (
      <>
        {isGoogleMapsLoaded && initialLocation && isValidLatLng(initialLocation.lat, initialLocation.lng) && (
          <OverlayView 
            position={initialLocation} 
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="pulsating-dot" />
          </OverlayView>
        )}

        {isGoogleMapsLoaded && manualLocation && !selectedAttestation && 
          isValidLatLng(manualLocation.lat, manualLocation.lng) && (
          <>
            {!isAnalyzing && (
              <>
                {/* Glowing background for manual location marker */}
                <Marker
                  position={manualLocation}
                  icon={{
                    path: GLOW_CIRCLE_SVG,
                    scale: 1,
                    fillColor: isTouchingGrass ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                    fillOpacity: 0.8,
                    strokeColor: 'rgba(255, 255, 255, 0.3)',
                    strokeWeight: 1,
                    anchor: isGoogleMapsAvailable() ? createGoogleMapsPoint(0, 0) : undefined,
                  }}
                  clickable={false}
                  zIndex={1}
                />
                
                <Marker
                  position={manualLocation}
                  icon={{
                    path: PIN_SVG,
                    scale: 1,
                    fillColor: isAnalyzing ? '#9CA3AF' : (isTouchingGrass ? '#34D399' : '#F87171'),
                    fillOpacity: 1,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2,
                    anchor: isGoogleMapsAvailable() ? createGoogleMapsPoint(0, 0) : undefined,
                  }}
                  zIndex={2}
                />
              </>
            )}
            
            {isGoogleMapsLoaded && !isAnalyzing && (
              <Marker
                position={manualLocation}
                icon={{
                  path: isTouchingGrass ? CHECK_SVG : X_SVG,
                  scale: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2.5,
                  anchor: isGoogleMapsAvailable() ? createGoogleMapsPoint(0, 0) : undefined,
                }}
                clickable={false}
                zIndex={3}
              />
            )}
          </>
        )}

        {/* Only render attestations if Google Maps is available */}
        {isGoogleMapsLoaded && Object.entries(groupedAttestations).map(([, group]) => {
          // Sort group to ensure selected attestation is last (appears on top)
          const sortedGroup = [...group].sort((a, b) => {
            if (a.id === selectedAttestation?.id) return 1;
            if (b.id === selectedAttestation?.id) return -1;
            return 0;
          });

          return sortedGroup.map((attestation, index) => {
            // Skip invalid locations
            if (!isValidLatLng(attestation.lat, attestation.lon)) return null;
            
            const baseZIndex = index * 2;
            const isSelected = attestation.id === selectedAttestation?.id;
            const isProductionVersion = attestation.mediaVersion === "1.0";
            
            // Give production version markers the highest z-index priority
            // Then, selected attestations get higher priority
            // Finally, "touching grass" attestations get higher priority than "not touching grass"
            const priorityBoost = 
              (isProductionVersion ? 400 : 0) +
              (isSelected ? 200 : 0) + 
              (attestation.isTouchingGrass ? 100 : 0);
            
            const finalZIndex = baseZIndex + priorityBoost;

            return (
              <React.Fragment key={`attestation-${attestation.id}`}>
                {/* Production version glowing background for v1.0 */}
                {isGoogleMapsLoaded && isProductionVersion && (
                  <Marker
                    key={`glow-${attestation.id}`}
                    position={{ lat: attestation.lat, lng: attestation.lon }}
                    icon={{
                      path: GLOW_CIRCLE_SVG,
                      scale: 1,
                      fillColor: attestation.isTouchingGrass ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                      fillOpacity: 0.8,
                      strokeColor: 'rgba(255, 255, 255, 0.3)',
                      strokeWeight: 1,
                      anchor: isGoogleMapsAvailable() ? createGoogleMapsPoint(0, 0) : undefined,
                    }}
                    clickable={false}
                    zIndex={finalZIndex - 1}
                  />
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
                    anchor: isGoogleMapsAvailable() ? createGoogleMapsPoint(0, 0) : undefined,
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
                    anchor: isGoogleMapsAvailable() ? createGoogleMapsPoint(0, 0) : undefined,
                  }}
                  clickable={false}
                  zIndex={finalZIndex + 101} // Even higher to ensure symbol is on top
                />
              </React.Fragment>
            );
          });
        })}
      </>
    );
  }
};

export default MapComponent;