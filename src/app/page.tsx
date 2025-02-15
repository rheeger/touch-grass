'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, OverlayView } from '@react-google-maps/api';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { prepareGrassAttestation, getAttestations } from '@/utils/eas';
import { analyzePlacesData } from '@/utils/places';
import { type Attestation } from '@/utils/eas';
import { StatusCards } from '@/components/StatusCards';
import { createSmartAccountForEmail, sendSponsoredTransaction } from '@/utils/paymaster';

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

// Add styles for the walking person marker
const MARKER_STYLES = `
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
  .walking-person {
    filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.5));
  }
`;

// Add style tag to head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = MARKER_STYLES;
  document.head.appendChild(style);
}

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

const CIRCLE_SVG = "M 0, 0 m -8, 0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0";

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
  const [initialLocation, setInitialLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTouchingGrass, setIsTouchingGrass] = useState(false);
  const [isCreatingAttestation, setIsCreatingAttestation] = useState(false);
  const [detectionResult, setDetectionResult] = useState<GrassDetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const { login, authenticated, ready, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [manualLocation, setManualLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Monitor wallet initialization
  useEffect(() => {
    const initializeWallet = async () => {
      // Only proceed if authenticated
      if (authenticated && ready) {
        console.log('Checking wallet state:', {
          authenticated,
          walletCount: wallets.length,
          ready
        });
      }
    };

    initializeWallet();
  }, [authenticated, wallets, ready]);

  // Get the currently active wallet based on Privy's wallet management
  const getActiveWallet = useCallback(() => {
    if (!authenticated || !ready) return null;
    if (!wallets.length) return null;
    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    const connectedExternalWallet = wallets.find(w => w.walletClientType !== 'privy');
    return connectedExternalWallet || embeddedWallet || wallets[0];
  }, [authenticated, ready, wallets]);

  // Load attestation history when wallet is connected
  useEffect(() => {
    const loadAttestations = async () => {
      if (!authenticated || !ready) return;

      try {
        setIsLoadingHistory(true);
        const activeWallet = getActiveWallet();
        
        if (!activeWallet?.address) {
          console.log('No active wallet found for attestations');
          setAttestations([]);
          return;
        }

        console.log('Loading attestations for wallet:', {
          type: activeWallet.walletClientType,
          address: activeWallet.address
        });

        const history = await getAttestations(activeWallet.address as `0x${string}`);
        console.log('Loaded attestation history:', history);
        setAttestations(history);
      } catch (error) {
        console.error('Error loading attestation history:', error);
        setAttestations([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadAttestations();
  }, [authenticated, wallets, ready, getActiveWallet]);

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
  const checkTouchingGrass = useCallback(async (lat: number, lng: number) => {
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
  }, [isManualOverride]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLocation);
          setInitialLocation(newLocation);
          setIsLoading(false);
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
  }, [checkTouchingGrass]);

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

    setManualLocation(newLocation);
    setLocation(newLocation);
    setIsManualOverride(false);
    await checkTouchingGrass(newLocation.lat, newLocation.lng);
  };

  // Add a new function to handle retrying attestation history fetch
  const fetchAttestationHistoryWithRetry = async (address: `0x${string}`, expectedCount: number, maxRetries = 5) => {
    for (let i = 0; i < maxRetries; i++) {
      // Wait longer between each retry
      await new Promise(resolve => setTimeout(resolve, 3000 * (i + 1)));
      
      const history = await getAttestations(address);
      console.log(`Retry ${i + 1}: Found ${history.length} attestations, expecting ${expectedCount}`);
      
      if (history.length >= expectedCount) {
        return history;
      }
    }
    throw new Error('Failed to get updated attestation history after multiple retries');
  };

  const handleCreateAttestation = async () => {
    if (!location) {
      alert('Please ensure you have a valid location.');
      return;
    }

    if (!authenticated) {
      login();
      return;
    }

    try {
      setIsCreatingAttestation(true);
      const activeWallet = getActiveWallet();

      if (!activeWallet) {
        throw new Error('No active wallet found. Please connect a wallet to continue.');
      }

      // Get current attestation count
      const currentCount = attestations.length;

      console.log('Using wallet:', {
        type: activeWallet.walletClientType,
        address: activeWallet.address,
        chainId: activeWallet.chainId
      });

      // Prepare the transaction
      const tx = prepareGrassAttestation(
        activeWallet.address,
        location.lat,
        location.lng,
        isTouchingGrass
      );

      let transactionHash;

      // Handle transaction based on wallet type
      if (activeWallet.walletClientType === 'privy') {
        // For Privy embedded wallet, use sponsored transactions
        await createSmartAccountForEmail();
        transactionHash = await sendSponsoredTransaction();
      } else {
        // For external wallets (MetaMask, Rainbow, etc.), use their provider
        const provider = await activeWallet.getEthereumProvider();
        transactionHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: activeWallet.address,
            to: tx.to,
            data: tx.data,
            value: tx.value || '0x0',
          }],
        });
      }

      console.log('Transaction:', transactionHash);
      
      try {
        const history = await fetchAttestationHistoryWithRetry(
          activeWallet.address as `0x${string}`,
          currentCount + 1
        );
        setAttestations(history);
        alert('Successfully created attestation!');
      } catch (error) {
        console.error('Error fetching updated attestations:', error);
        // Don't show error to user since transaction was successful
      }
    } catch (error) {
      console.error('Error creating attestation:', error);
      alert('Error creating attestation. Please try again.');
    } finally {
      setIsCreatingAttestation(false);
    }
  };

  // Add effect to handle selected attestation
  useEffect(() => {
    if (selectedAttestation && mapRef.current) {
      const center = getMapCenter(selectedAttestation.lat, selectedAttestation.lon);
      mapRef.current.panTo(center);
      mapRef.current.setZoom(MAP_ZOOM);
    }
  }, [selectedAttestation]);

  // Update handleDisconnect to be more thorough
  const handleDisconnect = async () => {
    // Clear all state
    setAttestations([]);
    setSelectedAttestation(null);
    setManualLocation(null);
    setIsManualOverride(false);
    setDetectionResult(null);
    setIsTouchingGrass(false);
    setIsCreatingAttestation(false);
    setIsAnalyzing(false);

    // Reset to initial location if it exists
    if (initialLocation) {
      setLocation(initialLocation);
      if (mapRef.current) {
        mapRef.current.panTo(getMapCenter(initialLocation.lat, initialLocation.lng));
        mapRef.current.setZoom(MAP_ZOOM);
      }
    }

    // Clear all cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();

    try {
      // Call Privy logout and wait for it to complete
      await logout();
    } finally {
      // Force reload the page to ensure clean state
      window.location.href = window.location.origin + window.location.pathname;
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
              {/* Initial Location Marker (Always Visible at original location) */}
              {initialLocation && (
                <OverlayView
                  position={initialLocation}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div className="pulsating-dot" />
                </OverlayView>
              )}

              {/* Manual Location Marker */}
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
              
              {/* Past Attestation Markers */}
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
                    setSelectedAttestation(attestation);
                  }}
                />
              ))}
            </GoogleMap>
          </LoadScript>
        )}
      </div>

      {/* Bottom Overlay Content */}
      <div className="fixed bottom-0 left-0 right-0 z-10 p-4">
        <div className="max-w-3xl mx-auto">
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
            walletAddress={getActiveWallet()?.address}
            userEmail={user?.email?.address}
            onDisconnect={handleDisconnect}
            onConnect={login}
            isAuthenticated={authenticated && ready}
            onCreateAttestation={handleCreateAttestation}
            isCreatingAttestation={isCreatingAttestation}
            selectedAttestation={selectedAttestation}
            onSelectAttestation={setSelectedAttestation}
            attestations={attestations}
            isLoadingHistory={isLoadingHistory}
          />
        </div>
      </div>
    </main>
  );
}
