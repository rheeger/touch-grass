'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import type { GrassDetectionResult } from '@/utils/grassDetection';
import { analyzeGrass } from '@/utils/grassDetection';
import { createAttestation, getAttestations, Attestation } from '@/utils/attestations';
import { StatusCards } from '@/components/StatusCards';
import { getActiveWallet, getWalletAddress, isConnectedWallet, ActiveWallet } from '@/utils/walletManager';
import MapComponent from '@/components/MapComponent';
import { calculateDistance } from '@/utils/places';
import confetti from 'canvas-confetti';

export default function Home() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [initialLocation, setInitialLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTouchingGrass, setIsTouchingGrass] = useState(false);
  const [isCreatingAttestation, setIsCreatingAttestation] = useState(false);
  const [detectionResult, setDetectionResult] = useState<GrassDetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const { login, authenticated, ready, logout } = usePrivy();
  const { wallets } = useWallets();
  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [allAttestations, setAllAttestations] = useState<Attestation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [manualLocation, setManualLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeWallet, setActiveWallet] = useState<ActiveWallet | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined);
  const [currentView, setCurrentView] = useState<'status' | 'menu' | 'history' | 'feed' | 'leaderboard'>('status');
  const [isLocationTooFar, setIsLocationTooFar] = useState(false);
  const [showOnlyGrass, setShowOnlyGrass] = useState(false);

  // Monitor wallet initialization
  useEffect(() => {
    const initializeWallet = async () => {
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

  useEffect(() => {
    console.log('Wallet info:', wallets);
  }, [wallets]);

  // Add useEffect to fetch active wallet
  useEffect(() => {
    async function fetchWallet() {
      try {
        const wallet = await getActiveWallet(wallets);
        setActiveWallet(wallet);
      } catch (error) {
        console.error('Error retrieving active wallet:', error);
        setActiveWallet(null);
      }
    }
    fetchWallet();
  }, [wallets]);

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

  // Add new effect to load all attestations
  useEffect(() => {
    const loadAllAttestations = async () => {
      try {
        const history = await getAttestations();
        console.log('Loaded all attestations:', history);
        setAllAttestations(history);
      } catch (error) {
        console.error('Error loading all attestations:', error);
        setAllAttestations([]);
      }
    };

    loadAllAttestations();
  }, []);

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
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLoading(false);
        }
      );
    }
  }, []);

  // Add new effect for initial grass analysis
  useEffect(() => {
    const analyzeInitialLocation = async () => {
      if (location && mapRef.current && !detectionResult && !isAnalyzing) {
        setIsAnalyzing(true);
        try {
          const result = await analyzeGrass(location.lat, location.lng, mapRef.current, false);
          setIsTouchingGrass(result.isTouchingGrass);
          setDetectionResult(result);
        } catch (error) {
          console.error('Error analyzing initial location:', error);
          setIsTouchingGrass(false);
          setDetectionResult(null);
        } finally {
          setIsAnalyzing(false);
        }
      }
    };

    analyzeInitialLocation();
  }, [location, detectionResult, isAnalyzing]);

  // Add effect to check location distance in production
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_ENV === 'production' && location && initialLocation) {
      const distance = calculateDistance(
        location.lat,
        location.lng,
        initialLocation.lat,
        initialLocation.lng
      ) * 1000; // Convert km to meters

      setIsLocationTooFar(distance > 30);
    } else {
      setIsLocationTooFar(false);
    }
  }, [location, initialLocation]);

  const handleCreateAttestation = async () => {
    if (!location) {
      return;
    }
    if (!authenticated) {
      login();
      return;
    }

    if (isLocationTooFar) {
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
      
      // Trigger confetti animation on success
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error('Error creating attestation:', error);
    } finally {
      setIsCreatingAttestation(false);
    }
  };

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

  // Function to handle user selection from leaderboard
  const handleUserSelect = (address: string | null) => {
    setSelectedUser(address);
    if (address) {
      const userAttestations = allAttestations.filter(a => a.attester.toLowerCase() === address.toLowerCase());
      if (userAttestations.length > 0) {
        // Sort by timestamp to get the most recent
        const mostRecent = userAttestations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        setSelectedAttestation(mostRecent);
      }
    } else {
      setSelectedAttestation(null);
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
          attestations={authenticated ? 
            (selectedUser ? allAttestations.filter(a => a.attester.toLowerCase() === selectedUser.toLowerCase()) : attestations) 
            : (selectedUser ? allAttestations.filter(a => a.attester.toLowerCase() === selectedUser.toLowerCase()) : allAttestations)}
          isAnalyzing={isAnalyzing}
          isTouchingGrass={isTouchingGrass}
          isViewingFeed={currentView === 'feed'}
          feedAttestations={selectedUser ? 
            allAttestations.filter(a => a.attester.toLowerCase() === selectedUser.toLowerCase()) 
            : allAttestations}
          onSelectAttestation={setSelectedAttestation}
          currentUserAddress={authenticated ? walletAddress : undefined}
          onLocationChange={(newLocation) => {
            setLocation(newLocation);
            setManualLocation(newLocation);
            setIsManualOverride(false);
            setDetectionResult(null);
          }}
          onAnalysisStart={() => setIsAnalyzing(true)}
          onAnalysisComplete={(result) => {
            setIsAnalyzing(false);
            setIsTouchingGrass(result.isTouchingGrass);
            setDetectionResult(result as GrassDetectionResult);
          }}
          onMapLoad={(map) => {
            mapRef.current = map;
          }}
          showOnlyGrass={showOnlyGrass}
          onViewChange={setCurrentView}
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
              setIsManualOverride(!isManualOverride);
              if (location) {
                setIsAnalyzing(true);
                setDetectionResult(null);
                // Analyze with the new override state
                if (mapRef.current) {
                  analyzeGrass(location.lat, location.lng, mapRef.current, !isManualOverride)
                    .then((result: GrassDetectionResult) => {
                      setIsAnalyzing(false);
                      setIsTouchingGrass(result.isTouchingGrass);
                      setDetectionResult(result);
                    })
                    .catch(() => {
                      setIsAnalyzing(false);
                      setIsTouchingGrass(false);
                      setDetectionResult(null);
                    });
                }
              }
            }}
            walletAddress={walletAddress}
            onDisconnect={handleDisconnect}
            onConnect={login}
            isAuthenticated={authenticated && ready}
            onCreateAttestation={handleCreateAttestation}
            isCreatingAttestation={isCreatingAttestation}
            selectedAttestation={selectedAttestation}
            onSelectAttestation={setSelectedAttestation}
            attestations={attestations}
            allAttestations={allAttestations}
            isLoadingHistory={isLoadingHistory}
            currentView={currentView}
            onViewChange={setCurrentView}
            isLocationTooFar={isLocationTooFar}
            initialLocation={initialLocation}
            onMapClick={(event) => {
              if (event.latLng) {
                const newLocation = {
                  lat: event.latLng.lat(),
                  lng: event.latLng.lng()
                };
                setLocation(newLocation);
                setManualLocation(newLocation);
                setIsManualOverride(false);
                setDetectionResult(null);
              }
            }}
            showOnlyGrass={showOnlyGrass}
            onShowOnlyGrassChange={setShowOnlyGrass}
            selectedUser={selectedUser}
            onUserSelect={handleUserSelect}
          />
        </div>
      </div>
    </main>
  );
}
