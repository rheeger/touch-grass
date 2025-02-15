'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import type { GrassDetectionResult } from '@/utils/grassDetection';
import { analyzeGrass } from '@/utils/grassDetection';
import { createAttestation, getAttestations, Attestation } from '@/utils/attestations';
import { StatusCards } from '@/components/StatusCards';
import { getActiveWallet, getWalletAddress, isConnectedWallet, ActiveWallet } from '@/utils/walletManager';
import MapComponent from '@/components/MapComponent';
import { getMapCenter, MAP_ZOOM } from '@/config/mapConfig';

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
  const [activeWallet, setActiveWallet] = useState<ActiveWallet | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);

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

  // New effect: Log detailed wallet information
  useEffect(() => {
    console.log('Wallet info:', wallets);
  }, [wallets]);

  // Add useEffect to fetch active wallet
  useEffect(() => {
    async function fetchWallet() {
      try {
        const wallet = await getActiveWallet(user && user.email && user.email.address ? { email: user.email.address } : null, wallets);
        setActiveWallet(wallet);
      } catch (error) {
        console.error('Error retrieving active wallet:', error);
        setActiveWallet(null);
      }
    }
    fetchWallet();
  }, [user, wallets]);

  // Add useEffect to update wallet address from activeWallet
  useEffect(() => {
    async function updateWalletAddress() {
      if (activeWallet) {
        const address = await getWalletAddress(activeWallet);
        setWalletAddress(address);
      } else {
        setWalletAddress(undefined);
      }
    }
    updateWalletAddress();
  }, [activeWallet]);

  // Load attestation history when wallet is connected
  useEffect(() => {
    const loadAttestations = async () => {
      if (!authenticated || !ready) return;

      try {
        setIsLoadingHistory(true);
        if (!activeWallet) {
          console.log('No active wallet found for attestations');
          setAttestations([]);
          return;
        }

        const walletAddr = await getWalletAddress(activeWallet);
        if (!walletAddr) {
          console.log('Active wallet does not have a valid address');
          setAttestations([]);
          return;
        }

        const walletType = activeWallet && isConnectedWallet(activeWallet) ? activeWallet.walletClientType : 'biconomy';
        console.log('Loading attestations for wallet:', {
          type: walletType,
          address: walletAddr
        });

        const history = await getAttestations(walletAddr as `0x${string}`);
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
  }, [authenticated, wallets, ready, activeWallet]);

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
      const result = await analyzeGrass(lat, lng, mapRef.current, isManualOverride);
      setDetectionResult(result);
      setIsTouchingGrass(result.isTouchingGrass);
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
      if (!activeWallet) {
        throw new Error('No active wallet found. Please connect a wallet to continue.');
      }

      const currentCount = attestations.length;
      const { transactionHash, attestations: newAttestations } = await createAttestation(
        activeWallet,
        location,
        isTouchingGrass,
        currentCount
      );

      console.log('Transaction:', transactionHash);
      setAttestations(newAttestations);
      alert('Successfully created attestation!');
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

  // Updated handleDisconnect function to remove hard refresh on logout
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
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <main className="relative min-h-screen">
      {/* Map Container using modular MapComponent */}
      <div className="absolute inset-0">
        <MapComponent 
          location={location}
          initialLocation={initialLocation}
          manualLocation={manualLocation}
          selectedAttestation={selectedAttestation}
          attestations={attestations}
          isAnalyzing={isAnalyzing}
          isTouchingGrass={isTouchingGrass}
          onMapClick={handleMapClick}
          onMapLoad={handleMapLoad}
        />
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
            walletAddress={walletAddress}
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
