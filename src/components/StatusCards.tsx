'use client';

import { useState, useEffect } from 'react';
import { type Attestation, getAttestations } from '@/utils/eas';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import confetti from 'canvas-confetti';

interface DetectionResult {
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
  onCreateAttestation: () => void;
  isCreatingAttestation: boolean;
  selectedAttestation: Attestation | null;
  onSelectAttestation: (attestation: Attestation | null) => void;
  attestations: Attestation[];
  isLoadingHistory: boolean;
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
  onCreateAttestation,
  isCreatingAttestation,
  selectedAttestation,
  onSelectAttestation,
  attestations,
  isLoadingHistory,
}: StatusCardsProps) {
  const [showAttestations, setShowAttestations] = useState(false);
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    async function loadAttestations() {
      if (!address) return;
      try {
        setLoading(true);
        const data = await getAttestations(address);
        setAttestations(data);
      } catch (error) {
        console.error('Failed to load attestations:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAttestations();
  }, [address]);

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

  // Handle attestation creation
  const handleCreateAttestation = async () => {
    try {
      await onCreateAttestation();
      setShowSuccessAnimation(true);
    } catch (error) {
      console.error('Failed to create attestation:', error);
    }
  };

  // Format address for display
  const formatAddress = (address: string | undefined) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleSwipe = (_: unknown, info: PanInfo) => {
    setShowAttestations(info.offset.x > 0);
  };

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div className="p-6 bg-black/80 backdrop-blur rounded-xl shadow-lg text-white font-mono">
        <div className="flex items-center justify-between text-xs opacity-60 mb-4">
          <span>STATUS</span>
          {walletAddress && (
            <div className="flex items-center space-x-2">
              <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              <button
                onClick={onDisconnect}
                className="text-red-400 hover:text-red-300"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : !location ? (
          <div className="text-center py-4">Waiting for location...</div>
        ) : isAnalyzing ? (
          <div className="text-center py-4">Analyzing location...</div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
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

            {detectionResult && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm opacity-60 mb-1">Confidence</div>
                  <div className="h-2 bg-gray-700 rounded-full">
                    <div
                      className={`h-full rounded-full ${
                        isTouchingGrass ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${detectionResult.confidence}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-sm opacity-60 mb-2">Analysis</div>
                  <ul className="space-y-2 text-sm">
                    {isTouchingGrass
                      ? detectionResult.explanations.positive.map((reason, i) => (
                          <li key={i} className="text-green-400">✓ {reason}</li>
                        ))
                      : detectionResult.explanations.negative.map((reason, i) => (
                          <li key={i} className="text-red-400">✗ {reason}</li>
                        ))}
                  </ul>
                </div>

                {!isManualOverride && (
                  <button
                    onClick={onManualOverride}
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                  >
                    Override Detection
                  </button>
                )}

                <button
                  onClick={onCreateAttestation}
                  disabled={isCreatingAttestation}
                  className={`w-full px-4 py-2 ${
                    isCreatingAttestation
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  } rounded-lg text-sm font-bold tracking-wide`}
                >
                  {isCreatingAttestation ? 'Creating...' : 'Create Attestation'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* History Card */}
      <div className="p-6 bg-black/80 backdrop-blur rounded-xl shadow-lg text-white font-mono">
        <div className="flex items-center justify-between text-xs opacity-60 mb-4">
          <span>HISTORY</span>
          {isLoadingHistory && <span>Loading...</span>}
        </div>

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
                    {attestation.timestamp.toLocaleDateString()}
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
  );
} 
