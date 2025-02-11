'use client';

import { useState, useEffect } from 'react';
import { type Attestation } from '@/utils/eas';
import confetti from 'canvas-confetti';

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
  userEmail?: string;
  onDisconnect: () => void;
  onConnect: () => void;
  isAuthenticated: boolean;
  onCreateAttestation: () => void;
  isCreatingAttestation: boolean;
  selectedAttestation: Attestation | null;
  onSelectAttestation: (attestation: Attestation | null) => void;
  attestations: Attestation[];
  isLoadingHistory: boolean;
}

// Add time formatting function
function getRelativeTimeString(date: Date | string): string {
  const now = new Date();
  const inputDate = date instanceof Date ? date : new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - inputDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
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
  userEmail,
  onDisconnect,
  onConnect,
  isAuthenticated,
  onCreateAttestation,
  isCreatingAttestation,
  selectedAttestation,
  onSelectAttestation,
  attestations,
  isLoadingHistory,
}: StatusCardsProps) {
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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

  return (
    <div className="relative w-full max-w-3xl">
      <div className="overflow-hidden">
        <div className={`flex transition-transform duration-300 ease-in-out ${isHistoryOpen ? '-translate-x-full' : 'translate-x-0'}`}>
          {/* Main Status Card */}
          <div className="flex-shrink-0 w-full p-6 bg-black/80 backdrop-blur rounded-xl shadow-lg text-white font-mono h-[360px] flex flex-col">
            <div className="flex items-center justify-between text-xs mb-3">
              <div className="flex items-center space-x-4">
                {isHistoryOpen ? (
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => {
                        setIsHistoryOpen(false);
                        onSelectAttestation(null);
                      }}
                      className="text-white hover:text-gray-300 flex items-center space-x-2"
                    >
                      <span>←</span>
                      <span>Back</span>
                    </button>
                  </div>
                ) : (
                  <span className="opacity-60">
                    {attestations.length > 0 ? (
                      <button
                        onClick={() => setIsHistoryOpen(true)}
                        className="text-white hover:text-gray-300 flex items-center space-x-2"
                      >
                        <span>HISTORY</span>
                        <span>({attestations.length})</span>
                      </button>
                    ) : (
                      <span>STATUS</span>
                    )}
                  </span>
                )}
              </div>
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <span>
                    {userEmail || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connected')}
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
              {isHistoryOpen && selectedAttestation ? (
                // Show selected attestation details
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm opacity-60">Location</div>
                      <div className="text-lg">
                        {selectedAttestation.lat.toFixed(6)}, {selectedAttestation.lon.toFixed(6)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-60">Status</div>
                      <div className={`text-lg ${selectedAttestation.isTouchingGrass ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedAttestation.isTouchingGrass ? 'Was Touching Grass' : 'Was Not Touching Grass'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-60 mb-2">Time</div>
                    <div className="text-lg">
                      {getRelativeTimeString(selectedAttestation.timestamp)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-60 mb-2">Transaction</div>
                    <a 
                      href={`https://basescan.org/tx/${selectedAttestation.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View on BaseScan
                    </a>
                  </div>
                </div>
              ) : (
                // Show current status
                <>
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
                          <div className="text-sm opacity-60">Location</div>
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

                        {!isManualOverride && (
                          <button
                            onClick={onManualOverride}
                            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm mt-2"
                          >
                            Override Detection
                          </button>
                        )}

                        <button
                          onClick={onCreateAttestation}
                          disabled={isCreatingAttestation}
                          className={`w-full px-4 py-2 mt-2 ${
                            isCreatingAttestation
                              ? 'bg-gray-700 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700'
                          } rounded-lg text-sm font-bold tracking-wide`}
                        >
                          {isCreatingAttestation ? 'Creating...' : 'Create Attestation'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* History Panel (Same Width) */}
          <div className="flex-shrink-0 w-full p-6 bg-black/80 backdrop-blur rounded-xl shadow-lg text-white font-mono h-[360px] flex flex-col">
            <div className="flex items-center justify-between text-xs mb-3">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setIsHistoryOpen(false);
                    onSelectAttestation(null);
                  }}
                  className="text-white hover:text-gray-300 flex items-center space-x-2"
                >
                  <span>←</span>
                  <span>Back</span>
                </button>
                <span className="opacity-60">HISTORY ({attestations.length})</span>
              </div>
              {isLoadingHistory && <span className="opacity-60">Loading...</span>}
            </div>

            <div className="flex-1 overflow-y-auto">
              {attestations.length === 0 ? (
                <div className="text-center py-4 text-sm opacity-60">
                  No attestations yet
                </div>
              ) : (
                <div className="space-y-4">
                  {attestations.map((attestation) => (
                    <div
                      key={attestation.id}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedAttestation?.id === attestation.id
                          ? 'bg-gray-700'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                      onClick={() => onSelectAttestation(attestation)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`text-sm ${
                          attestation.isTouchingGrass ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {attestation.isTouchingGrass ? 'Touching Grass' : 'Not Touching Grass'}
                        </div>
                        <div className="text-xs opacity-60">
                          {getRelativeTimeString(attestation.timestamp)}
                        </div>
                      </div>
                      <div className="text-xs opacity-60">
                        {attestation.lat.toFixed(6)}, {attestation.lon.toFixed(6)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
