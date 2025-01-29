'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { usePrivy } from '@privy-io/react-auth';
import { createGrassAttestation } from '@/utils/eas';
import { useWalletClient } from 'wagmi';
import { analyzePlacesData } from '@/utils/places';
import { type Attestation } from '@/utils/eas';
import { StatusCards } from '@/components/StatusCards';

const mapContainerStyle = {
  width: '100vw',
  height: '100vh',
  position: 'fixed',
  top: 0,
  left: 0,
} as const;

// Constants for map positioning
const MAP_ZOOM = 16; // Less zoomed in for better context
const MAP_OFFSET = 0.003; // Center offset to keep pin above status card

const mapOptions = {
  mapTypeId: 'satellite',
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  minZoom: 14, // Prevent zooming out too far
  maxZoom: 20, // Prevent zooming in too far
} as const;

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

interface GrassDetectionResult {
  isTouchingGrass: boolean;
  confidence: number;
  reasons: string[];
  explanations: {
    positive: string[];
    negative: string[];
  };
  debugInfo?: {
    isInPark?: boolean;
    isInBuilding?: boolean;
    placeTypes?: string[];
  };
}

export default function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTouchingGrass, setIsTouchingGrass] = useState(false);
  const [isCreatingAttestation, setIsCreatingAttestation] = useState(false);
  const [detectionResult, setDetectionResult] = useState<GrassDetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const { login, authenticated, ready, logout, user } = usePrivy();
  const { data: walletClient } = useWalletClient();
  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);

  // Function to calculate the proper center position
  const getMapCenter = (lat: number, lng: number) => {
    return {
      lat: lat - MAP_OFFSET,
      lng: lng
    };
  };

  const handleMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;

    // If we already have a location, center the map properly
    if (location) {
      map.setCenter(getMapCenter(location.lat, location.lng));
      map.setZoom(MAP_ZOOM);
    }
    };

  // Function to check if user is touching grass
  const checkTouchingGrass = async (lat: number, lng: number) => {
    if (!mapRef.current) {
      console.error('Map not initialized');
      return;
    }
    
    setIsAnalyzing(true);
    try {
      // Phase 1: Analyze places data
      const placesResult = await analyzePlacesData(lat, lng, mapRef.current, isManualOverride);

      // Calculate final result
      const isTouchingGrass = placesResult.isInPark && !placesResult.isInBuilding;
      const confidence = Math.max(0, Math.min(100, placesResult.confidence));

      const result: GrassDetectionResult = {
        isTouchingGrass,
        confidence,
        reasons: placesResult.reasons,
        explanations: placesResult.explanations,
        debugInfo: {
          isInPark: placesResult.isInPark,
          isInBuilding: placesResult.isInBuilding,
          placeTypes: placesResult.placeTypes,
        }
  };

      setDetectionResult(result);
      setIsTouchingGrass(isTouchingGrass);
    } catch (error) {
      console.error('Error analyzing location:', error);
      setDetectionResult({
        isTouchingGrass: false,
        confidence: 0,
        reasons: ['Error analyzing location'],
        explanations: {
          positive: [],
          negative: ["We encountered an error analyzing your location."]
        }
      });
      setIsTouchingGrass(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLocation);
          setIsLoading(false);
          // Only run checkTouchingGrass if map is initialized
          if (mapRef.current) {
            checkTouchingGrass(newLocation.lat, newLocation.lng);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLoading(false);
        }
      );
    }
  }, [mapRef.current]); // Add mapRef.current as a dependency

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !mapRef.current) return;

    // In production, only allow using current location
    if (process.env.NEXT_PUBLIC_APP_ENV === 'production') {
      alert('In production mode, you can only use your current location.');
      return;
    }

    const newLocation = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };

    // Reset zoom and center consistently
    mapRef.current.setZoom(MAP_ZOOM);
    mapRef.current.setCenter(getMapCenter(newLocation.lat, newLocation.lng));
    
    setLocation(newLocation);
    setIsManualOverride(false);
    await checkTouchingGrass(newLocation.lat, newLocation.lng);
  };

  const handleCreateAttestation = async () => {
    if (!location || !authenticated || !walletClient) {
      console.error('Missing required data:', {
        hasLocation: !!location,
        isAuthenticated: authenticated,
        hasWalletClient: !!walletClient
      });
      alert('Please ensure you are connected with your wallet and have a valid location.');
      return;
    }

    try {
      setIsCreatingAttestation(true);
      console.log('Creating attestation with:', {
        location,
        isTouchingGrass,
        walletAddress: walletClient.account.address
      });
      
      const tx = await createGrassAttestation(
        walletClient,
        location.lat,
        location.lng,
        isTouchingGrass
      );
      console.log('Transaction:', tx);
      alert('Successfully created attestation!');
    } catch (error) {
      console.error('Error creating attestation:', error);
      if (error instanceof Error) {
        alert(`Failed to create attestation: ${error.message}`);
      } else {
        alert('Failed to create attestation. Please check the console for details.');
      }
    } finally {
      setIsCreatingAttestation(false);
    }
  };

  const handleAttestationSelect = (attestation: Attestation | null) => {
    setSelectedAttestation(attestation);
    // Center map on the attestation location if one is selected
    if (attestation && mapRef.current) {
      mapRef.current.panTo({ lat: attestation.lat, lng: attestation.lon });
    }
  };

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <main className="relative min-h-screen">
      {/* Map Container */}
      <div className="absolute inset-0">
        {location && (
            <LoadScript 
              googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
              libraries={libraries}
            >
              <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={location ? getMapCenter(location.lat, location.lng) : undefined}
                zoom={MAP_ZOOM}
              options={mapOptions}
                onClick={handleMapClick}
                onLoad={handleMapLoad}
              >
              {location && <Marker position={location} />}
              </GoogleMap>
            </LoadScript>
        )}
      </div>

      {/* Bottom Overlay Content */}
      <div className="fixed bottom-0 left-0 right-0 z-10 p-4">
        <div className="max-w-3xl mx-auto">
          {!authenticated ? (
            <div className="p-6 bg-black/80 backdrop-blur rounded-xl shadow-lg text-white font-mono">
              <div className="flex items-center justify-between text-xs opacity-60 mb-4">
                <span>STATUS</span>
              </div>
              <div className="flex flex-col items-center justify-center py-4">
                <div className="text-red-400 text-sm mb-4">WALLET NOT CONNECTED</div>
                <button
                  onClick={login}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold tracking-wide"
            >
                  Connect Wallet
                </button>
              </div>
          </div>
          ) : (
          <StatusCards 
              isLoading={isLoading}
            location={location}
              isAnalyzing={isAnalyzing}
            isTouchingGrass={isTouchingGrass}
            detectionResult={detectionResult}
            isManualOverride={isManualOverride}
            onManualOverride={() => {
              setIsManualOverride(true);
              if (location) {
                checkTouchingGrass(location.lat, location.lng);
              }
            }}
              walletAddress={user?.wallet?.address}
              onDisconnect={logout}
              onCreateAttestation={handleCreateAttestation}
              isCreatingAttestation={isCreatingAttestation}
              selectedAttestation={selectedAttestation}
              onSelectAttestation={handleAttestationSelect}
          />
              )}
        </div>
      </div>
    </main>
  );
}
