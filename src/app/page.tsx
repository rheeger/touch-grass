'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import type { GrassDetectionResult } from '@/utils/grassDetection';
import { analyzeGrass } from '@/utils/grassDetection';
import { createAttestation, getAttestations, Attestation } from '@/utils/attestations';
import { StatusCards } from '@/components/StatusCards';
import { getActiveWallet, getWalletAddress, isConnectedWallet, ActiveWallet } from '@/utils/walletManager';
import MapComponent from '@/components/MapComponent';
import AlertBar from '@/components/AlertBar';
import { calculateDistance } from '@/utils/places';
import confetti from 'canvas-confetti';
import Logger from '@/utils/logger';
import { getRegistrationStatus } from '@/utils/registration';
import { AboutCard } from '@/components/About';
import { getUserLocation, requestPreciseLocation, tryPreciseLocation, type LocationResult } from '@/utils/location';
import { MAP_ZOOM } from '@/config/mapConfig';

export default function Home() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [initialLocation, setInitialLocation] = useState<LocationResult | null>(null);
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
  const [manualLocation, setManualLocation] = useState<LocationResult | null>(null);
  const [activeWallet, setActiveWallet] = useState<ActiveWallet | null>(null);
  const [currentView, setCurrentView] = useState<'status' | 'history' | 'feed' | 'leaderboard' | 'about'>('status');
  const [isLocationTooFar, setIsLocationTooFar] = useState(false);
  const [showOnlyGrass, setShowOnlyGrass] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<"all" | "1.0" | "0.1">("all");
  const [showJustMe, setShowJustMe] = useState(false);

  // Consolidate initialization state
  const [initState, setInitState] = useState({
    hasLocation: false,
    hasMap: false
  });

  // Monitor wallet initialization
  useEffect(() => {
    const initializeWallet = async () => {
      if (authenticated && ready) {
        // Removed wallet state logging
      }
    };

    initializeWallet();
  }, [authenticated, wallets, ready]);

  useEffect(() => {
    // Removed wallet info logging
  }, [wallets]);

  // Add useEffect to fetch active wallet
  useEffect(() => {
    async function fetchWallet() {
      try {
        const wallet = await getActiveWallet(wallets);
        setActiveWallet(wallet);
      } catch (error) {
        Logger.error('Error retrieving active wallet', { error });
        setActiveWallet(null);
      }
    }
    fetchWallet();
  }, [wallets]);

  // Add useEffect to update wallet address from activeWallet
  useEffect(() => {
    async function updateWalletAddress() {
      if (authenticated && ready) {
        if (activeWallet) {
          await getWalletAddress(activeWallet);
        }
      }
    }
    updateWalletAddress();
  }, [authenticated, ready, activeWallet]);

  // Load attestation history when wallet is connected
  useEffect(() => {
    const loadAttestations = async () => {
      if (!authenticated || !ready) {
        setAttestations([]);
        return;
      }

      try {
        setIsLoadingHistory(true);
        if (!activeWallet) {
          Logger.info('No active wallet found for attestations');
          setAttestations([]);
          return;
        }

        const walletAddr = await getWalletAddress(activeWallet);
        if (!walletAddr) {
          Logger.info('Active wallet does not have a valid address');
          setAttestations([]);
          return;
        }

        const walletType = activeWallet && isConnectedWallet(activeWallet) ? activeWallet.walletClientType : 'biconomy';
        Logger.info('Loading attestations for wallet', {
          type: walletType,
          address: walletAddr
        });

        const history = await getAttestations(walletAddr as `0x${string}`);
        Logger.info('Loaded attestation history', { history });
        setAttestations(history);
      } catch (error) {
        Logger.error('Error loading attestation history', { error });
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
        // When not authenticated, load all attestations without filtering by wallet
        const history = await getAttestations();
        setAllAttestations(history);
      } catch {
        setAllAttestations([]);
      }
    };

    loadAllAttestations();
  }, []);

  // Get location
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        // First get IP location
        const ipLocation = await getUserLocation();
        Logger.info('IP location obtained', { location: ipLocation });
        setLocation(ipLocation);
        setInitialLocation(ipLocation);
        setIsLoading(false);
        setInitState(prev => ({ ...prev, hasLocation: true }));

        // Try to get precise location in parallel
        tryPreciseLocation()
          .then(preciseLocation => {
            Logger.info('Precise location obtained', { location: preciseLocation });
            setLocation(preciseLocation);
            setInitialLocation(preciseLocation);
            setManualLocation(null);

            // Reset map view for precise location
            if (mapRef.current) {
              mapRef.current.setZoom(MAP_ZOOM);
              mapRef.current.panTo({ lat: preciseLocation.lat, lng: preciseLocation.lng });
              
              // Re-analyze with precise location
              setIsAnalyzing(true);
              analyzeGrass(preciseLocation.lat, preciseLocation.lng, mapRef.current, false)
                .then(result => {
                  setIsTouchingGrass(result.isTouchingGrass);
                  setDetectionResult(result);
                })
                .catch(error => {
                  Logger.error('Analysis failed with precise location', { error });
                  setIsTouchingGrass(false);
                  setDetectionResult(null);
                })
                .finally(() => {
                  setIsAnalyzing(false);
                });
            }
          })
          .catch(error => {
            Logger.info('Precise location not available', { error });
            // Keep using IP location if precise location fails
          });

        // Initial analysis with IP location
        if (mapRef.current) {
          setIsAnalyzing(true);
          try {
            const result = await analyzeGrass(ipLocation.lat, ipLocation.lng, mapRef.current, false);
            setIsTouchingGrass(result.isTouchingGrass);
            setDetectionResult(result);
            Logger.info('Initial analysis complete', {
              isTouchingGrass: result.isTouchingGrass,
              confidence: result.confidence
            });
          } catch (error) {
            Logger.error('Initial analysis failed', { error });
            setIsTouchingGrass(false);
            setDetectionResult(null);
          } finally {
            setIsAnalyzing(false);
          }
        }
      } catch (error) {
        Logger.error('Error getting location', { error });
        setIsLoading(false);
      }
    };

    initializeLocation();
  }, []);

  // Handle map initialization
  useEffect(() => {
    if (!location || !mapRef.current || !initState.hasLocation) return;
    
    setIsAnalyzing(true);
    analyzeGrass(location.lat, location.lng, mapRef.current, false)
      .then((result) => {
        setIsTouchingGrass(result.isTouchingGrass);
        setDetectionResult(result);
        Logger.info('Analysis complete', {
          isTouchingGrass: result.isTouchingGrass,
          confidence: result.confidence
        });
      })
      .catch((error) => {
        Logger.error('Analysis failed', { error });
        setIsTouchingGrass(false);
        setDetectionResult(null);
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  }, [initState.hasLocation, location]);

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

  // Add useEffect to check registration status and handle initial view
  useEffect(() => {
    async function checkRegistration() {
      if (authenticated && ready && activeWallet) {
        try {
          const walletAddr = await getWalletAddress(activeWallet);
          if (!walletAddr) {
            Logger.info('No wallet address available');
            return;
          }

          const status = await getRegistrationStatus(walletAddr);
          
          // Only show registration status, but don't change the view
          Logger.info('Registration status checked', { 
            walletAddress: walletAddr, 
            status 
          });
        } catch (error) {
          Logger.error('Failed to check registration', { error });
        }
      }
    }
    checkRegistration();
  }, [authenticated, ready, activeWallet]);

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

      Logger.info('Attestation transaction created', { transactionHash });
      setAttestations(newAttestations);
      
      // Trigger confetti animation on success
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      Logger.error('Error creating attestation', { error });
    } finally {
      setIsCreatingAttestation(false);
    }
  };

  const handleManualOverride = () => {
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
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const newLocation: LocationResult = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
        isPrecise: true // Manual clicks are considered precise
      };
      setLocation(newLocation);
      setManualLocation(newLocation);
      setIsManualOverride(false);
      setDetectionResult(null);
    }
  };

  // Function to request precise location
  const handleRequestPreciseLocation = async () => {
    try {
      setIsLoading(true);
      const newLocation = await requestPreciseLocation();
      setLocation(newLocation);
      setInitialLocation(newLocation);
      setManualLocation(null);
      
      if (mapRef.current) {
        mapRef.current.setZoom(MAP_ZOOM);
        mapRef.current.panTo({ lat: newLocation.lat, lng: newLocation.lng });
        
        setIsAnalyzing(true);
        try {
          const result = await analyzeGrass(newLocation.lat, newLocation.lng, mapRef.current, false);
          setIsTouchingGrass(result.isTouchingGrass);
          setDetectionResult(result);
        } catch (error) {
          Logger.error('Analysis failed after precise location update', { error });
          setIsTouchingGrass(false);
          setDetectionResult(null);
        } finally {
          setIsAnalyzing(false);
        }
      }
      return newLocation;
    } catch (error) {
      Logger.error('Failed to get precise location', { error });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle location changes
  const handleLocationChange = (newLocation: LocationResult) => {
    setLocation(newLocation);
    setInitialLocation(newLocation);
    
    if (mapRef.current) {
      // If the new location is precise, reset map view
      if (newLocation.isPrecise) {
        mapRef.current.setZoom(MAP_ZOOM);
        mapRef.current.panTo({ lat: newLocation.lat, lng: newLocation.lng });
        setManualLocation(null); // Clear any manual location
      }
      
      setIsAnalyzing(true);
      analyzeGrass(newLocation.lat, newLocation.lng, mapRef.current, false)
        .then((result) => {
          setIsTouchingGrass(result.isTouchingGrass);
          setDetectionResult(result);
        })
        .catch((error) => {
          Logger.error('Analysis failed after location change', { error });
          setIsTouchingGrass(false);
          setDetectionResult(null);
        })
        .finally(() => {
          setIsAnalyzing(false);
        });
    }
  };

  // Filter function that can be applied to attestations
  const applyFilters = useCallback((attestations: Attestation[]) => {
    return attestations.filter(attestation => {
      // Apply grass filter
      const passesGrassFilter = !showOnlyGrass || attestation.isTouchingGrass;
      
      // Apply media filter
      const passesMediaFilter = mediaFilter === "all" || attestation.mediaVersion === mediaFilter;
      
      // Apply "just me" filter
      let passesJustMeFilter = true;
      if (showJustMe) {
        passesJustMeFilter = activeWallet?.address != null && 
                         attestation.attester.toLowerCase() === activeWallet.address.toLowerCase();
      }
      
      return passesGrassFilter && passesMediaFilter && passesJustMeFilter;
    });
  }, [showOnlyGrass, mediaFilter, showJustMe, activeWallet]);

  // Create filtered attestations
  const filteredAllAttestations = useMemo(() => {
    return applyFilters(allAttestations);
  }, [allAttestations, applyFilters]);

  // Handle filter changes from any filter dropdown
  const handleFilterChange = useCallback((newOptions: {
    showOnlyGrass: boolean;
    showJustMe: boolean;
    mediaFilter: "all" | "1.0" | "0.1";
  }) => {
    setShowOnlyGrass(newOptions.showOnlyGrass);
    setShowJustMe(newOptions.showJustMe);
    setMediaFilter(newOptions.mediaFilter);
    
    // Log filter changes
    Logger.info('Filter options changed', {
      showOnlyGrass: newOptions.showOnlyGrass,
      showJustMe: newOptions.showJustMe,
      mediaFilter: newOptions.mediaFilter
    });
  }, []);

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <main className="relative min-h-screen">
      <AlertBar />
      {/* Map Container using modular MapComponent */}
      <div className="absolute inset-0">
        <MapComponent 
          location={location}
          initialLocation={initialLocation}
          manualLocation={manualLocation}
          selectedAttestation={selectedAttestation}
          attestations={
            authenticated && (currentView === 'status' || currentView === 'history') 
              ? attestations 
              : allAttestations
          }
          isAnalyzing={isAnalyzing}
          isTouchingGrass={isTouchingGrass}
          isViewingFeed={currentView === 'feed' || currentView === 'leaderboard'}
          feedAttestations={selectedUser ? 
            filteredAllAttestations.filter(a => a.attester.toLowerCase() === selectedUser.toLowerCase()) 
            : filteredAllAttestations}
          onSelectAttestation={setSelectedAttestation}
          currentUserAddress={activeWallet?.address}
          selectedUserAddress={selectedUser}
          onLocationChange={(newLocation: { lat: number; lng: number }) => {
            const locationResult: LocationResult = {
              ...newLocation,
              isPrecise: true
            };
            setLocation(locationResult);
            setManualLocation(locationResult);
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
            setInitState(prev => ({ ...prev, hasMap: true }));
          }}
          showOnlyGrass={showOnlyGrass}
          onViewChange={setCurrentView}
          isAuthenticated={authenticated}
          currentView={currentView}
        />
      </div>

      {/* Bottom Overlay Content */}
      <div className="fixed bottom-0 left-0 right-0 z-10">
        <div className="max-w-3xl mx-auto">
          {currentView === 'about' ? (
            <AboutCard
              onConnect={login}
              isAuthenticated={authenticated}
              walletAddress={activeWallet?.address}
              onDisconnect={logout}
              onViewChange={setCurrentView}
            />
          ) : (
            <StatusCards 
              isLoading={isLoading}
              location={location}
              isAnalyzing={isAnalyzing}
              isTouchingGrass={isTouchingGrass}
              detectionResult={detectionResult}
              isManualOverride={isManualOverride}
              onManualOverride={handleManualOverride}
              walletAddress={activeWallet?.address as `0x${string}` | undefined}
              onDisconnect={logout}
              onConnect={login}
              isAuthenticated={authenticated}
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
              onMapClick={handleMapClick}
              showOnlyGrass={showOnlyGrass}
              selectedUser={selectedUser as `0x${string}` | null}
              onUserSelect={setSelectedUser}
              map={mapRef.current}
              onRequestPreciseLocation={handleRequestPreciseLocation}
              onLocationChange={handleLocationChange}
              mediaFilter={mediaFilter}
              showJustMe={showJustMe}
              onFilterChange={handleFilterChange}
            />
          )}
        </div>
      </div>
    </main>
  );
}
