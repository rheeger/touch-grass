'use client';

import { useState, useEffect } from 'react';
import { type Attestation } from '@/utils/attestations';
import confetti from 'canvas-confetti';
import { MenuCard } from './MenuCard';
import { FeedCard } from './FeedCard';
import { HistoryCard } from './HistoryCard';
import { LeaderboardCard } from './LeaderboardCard';

export interface StatusCardsProps {
  isLoading: boolean;
  location: { lat: number; lng: number } | null;
  isAnalyzing: boolean;
  isTouchingGrass: boolean;
  detectionResult: {
    confidence: number;
    reasons: string[];
    explanations: {
      positive: string[];
      negative: string[];
    };
  } | null;
  isManualOverride: boolean;
  onManualOverride: () => void;
  walletAddress?: string;
  onDisconnect: () => void;
  onConnect: () => void;
  isAuthenticated: boolean;
  onCreateAttestation: () => void;
  isCreatingAttestation: boolean;
  selectedAttestation: Attestation | null;
  onSelectAttestation: (attestation: Attestation | null) => void;
  attestations: Attestation[];
  allAttestations: Attestation[];
  isLoadingHistory: boolean;
  currentView: 'status' | 'menu' | 'history' | 'feed' | 'leaderboard';
  onViewChange: (view: 'status' | 'menu' | 'history' | 'feed' | 'leaderboard') => void;
  isLocationTooFar: boolean;
  initialLocation: { lat: number; lng: number } | null;
  onMapClick: (event: google.maps.MapMouseEvent) => void;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
  selectedUser: string | null;
  onUserSelect: (address: string | null) => void;
}

export function StatusCards({
  isLoading,
  location,
  isAnalyzing,
  isTouchingGrass,
  detectionResult,
  isManualOverride,
  onManualOverride,
  walletAddress,
  onDisconnect,
  onConnect,
  isAuthenticated,
  onCreateAttestation,
  isCreatingAttestation,
  selectedAttestation,
  onSelectAttestation,
  attestations,
  allAttestations,
  isLoadingHistory,
  currentView,
  onViewChange,
  isLocationTooFar,
  initialLocation,
  onMapClick,
  showOnlyGrass,
  onShowOnlyGrassChange,
  selectedUser,
  onUserSelect,
}: StatusCardsProps) {
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Handle success animation
  useEffect(() => {
    if (!isCreatingAttestation && showSuccessAnimation) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Reset success state after animation
      const timer = setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isCreatingAttestation, showSuccessAnimation]);

  const handleBack = () => {
    if (currentView === 'feed' || currentView === 'history' || currentView === 'leaderboard') {
      onViewChange('menu');
    } else if (currentView === 'menu') {
      onViewChange('status');
    }
    onSelectAttestation(null);
  };

  return (
    <div className="relative w-full max-w-3xl">
      <div className="overflow-hidden">
        <div className={`flex transition-transform duration-300 ease-in-out ${
          currentView === 'status' ? 'translate-x-0' :
          currentView === 'menu' ? '-translate-x-full' :
          currentView === 'history' ? '-translate-x-[200%]' :
          currentView === 'feed' ? '-translate-x-[200%]' :
          '-translate-x-[200%]'
        }`}>
          {/* Main Status Card */}
          <div className="flex-shrink-0 w-full p-6 bg-black/80 backdrop-blur rounded-xl shadow-lg text-white font-mono h-[360px] flex flex-col">
            <div className="flex items-center justify-between text-xs mb-3">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => onViewChange('menu')}
                  className="text-white hover:text-gray-300 flex items-center space-x-2"
                >
                  <span>MENU</span>
                </button>
              </div>
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <span>
                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connected'}
                  </span>
                  <button
                    onClick={onDisconnect}
                    className="text-red-400 hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={onConnect}
                  className="text-green-400 hover:text-green-300"
                >
                  Connect
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : !location ? (
                <div className="text-center py-4">Waiting for location...</div>
              ) : isAnalyzing ? (
                <div className="text-center py-4">Analyzing location...</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm opacity-60 flex items-center space-x-2">
                        <span>Location</span>
                        {initialLocation && (
                          initialLocation.lat !== location?.lat || initialLocation.lng !== location?.lng
                        ) && (
                          <button
                            onClick={() => {
                              if (initialLocation) {
                                onMapClick({
                                  latLng: {
                                    lat: () => initialLocation.lat,
                                    lng: () => initialLocation.lng
                                  }
                                } as google.maps.MapMouseEvent);
                              }
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            (reset)
                          </button>
                        )}
                      </div>
                      <div className="text-lg">
                        {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-60">Status</div>
                      <div className={`text-lg ${isTouchingGrass ? 'text-green-400' : 'text-red-400'}`}>
                        {isTouchingGrass ? 'Touching Grass' : 'Not Touching Grass'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-sm opacity-60 mb-1">Confidence</div>
                      <div className="h-2 bg-gray-700 rounded-full">
                        <div
                          className={`h-full rounded-full ${
                            isTouchingGrass ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${detectionResult?.confidence || 0}%` }}
                          data-testid="confidence-bar"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm opacity-60 mb-2">Analysis</div>
                      {detectionResult ? (
                        <ul className="space-y-2 text-sm">
                          {isTouchingGrass
                            ? detectionResult.explanations.positive.map((reason, i) => (
                                <li key={i} className="text-green-400">✓ {reason}</li>
                              ))
                            : detectionResult.explanations.negative.map((reason, i) => (
                                <li key={i} className="text-red-400">✗ {reason}</li>
                              ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-gray-400">No analysis available</div>
                      )}
                    </div>

                    <button
                      onClick={onManualOverride}
                      disabled={isLocationTooFar}
                      className={`w-full px-4 py-2 ${
                        isLocationTooFar
                          ? 'bg-gray-700 cursor-not-allowed'
                          : isManualOverride
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-gray-700 hover:bg-gray-600'
                      } rounded-lg text-sm mt-2`}
                    >
                      {isLocationTooFar 
                        ? 'Cannot Override' 
                        : isManualOverride 
                          ? 'Disable Grass Override'
                          : 'Override Grass Detection'
                      }
                    </button>

                    <button
                      onClick={onCreateAttestation}
                      disabled={isCreatingAttestation || isLocationTooFar}
                      className={`w-full px-4 py-2 mt-2 ${
                        isCreatingAttestation || isLocationTooFar
                          ? 'bg-gray-700 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      } rounded-lg text-sm font-bold tracking-wide`}
                    >
                      {isCreatingAttestation 
                        ? 'Creating...' 
                        : isLocationTooFar 
                          ? 'Selected Location is Too Far'
                          : 'Create Attestation'
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Menu Card */}
          <MenuCard
            onSelectFeed={() => onViewChange('feed')}
            onSelectHistory={() => onViewChange('history')}
            onSelectLeaderboard={() => onViewChange('leaderboard')}
            onBack={handleBack}
            attestationCount={attestations.length}
            walletAddress={walletAddress}
            onDisconnect={onDisconnect}
            onConnect={onConnect}
            isAuthenticated={isAuthenticated}
          />

          {/* History Card */}
          {currentView === 'history' && (
            <HistoryCard
              onSelectAttestation={onSelectAttestation}
              selectedAttestation={selectedAttestation}
              attestations={attestations}
              currentLocation={location}
              onBack={handleBack}
              isLoadingHistory={isLoadingHistory}
              showOnlyGrass={showOnlyGrass}
              onShowOnlyGrassChange={onShowOnlyGrassChange}
              isAuthenticated={isAuthenticated}
              onConnect={onConnect}
            />
          )}

          {/* Feed Card */}
          {currentView === 'feed' && (
            <FeedCard
              attestations={allAttestations}
              currentLocation={location}
              onSelectAttestation={onSelectAttestation}
              selectedAttestation={selectedAttestation}
              onBack={handleBack}
              showOnlyGrass={showOnlyGrass}
              onShowOnlyGrassChange={onShowOnlyGrassChange}
            />
          )}

          {/* Leaderboard Card */}
          {currentView === 'leaderboard' && (
            <LeaderboardCard
              attestations={allAttestations}
              onBack={() => {
                handleBack();
                onUserSelect(null);
              }}
              showOnlyGrass={showOnlyGrass}
              onShowOnlyGrassChange={onShowOnlyGrassChange}
              selectedUser={selectedUser}
              onUserSelect={onUserSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
} 
