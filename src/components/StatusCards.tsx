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

interface StatusCardsProps {
  isLoading: boolean;
  location: { lat: number; lng: number } | null;
  isAnalyzing: boolean;
  isTouchingGrass: boolean;
  detectionResult: DetectionResult | null;
  isManualOverride: boolean;
  onManualOverride: () => void;
  walletAddress?: string;
  onDisconnect: () => void;
  onCreateAttestation: () => void;
  isCreatingAttestation: boolean;
  selectedAttestation: Attestation | null;
  onSelectAttestation: (attestation: Attestation | null) => void;
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
  onSelectAttestation
}: StatusCardsProps) {
  const [showAttestations, setShowAttestations] = useState(false);
  const { address } = useAccount();
  const [attestations, setAttestations] = useState<Attestation[]>([]);
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
    <div className="p-6 bg-black/80 backdrop-blur rounded-xl shadow-lg text-white font-mono relative overflow-hidden">
      <div className="relative" style={{ height: 280 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={showAttestations ? 'attestations' : 'status'}
            initial={{ x: showAttestations ? 300 : -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: showAttestations ? -300 : 300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleSwipe}
            className="w-full absolute inset-0"
          >
            {!showAttestations ? (
              // Current Status Card
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs opacity-60 mb-2">
                  <span>STATUS</span>
                  <button 
                    onClick={() => setShowAttestations(true)}
                    className="text-green-400/60 hover:text-green-400"
                  >
                    View History →
                  </button>
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {isLoading ? (
                    <span className="text-yellow-400">LOCATING...</span>
                  ) : !location ? (
                    <span className="text-red-400">LOCATION ACCESS DENIED</span>
                  ) : isAnalyzing ? (
                    <span className="text-yellow-400">ANALYZING LOCATION...</span>
                  ) : isTouchingGrass ? (
                    <span className="text-green-400">TOUCHING GRASS 🌱</span>
                  ) : (
                    <span className="text-red-400">NOT TOUCHING GRASS</span>
                  )}
                </h2>

                {detectionResult?.debugInfo && (
                  <div className="text-xs opacity-60 mb-4">
                    {detectionResult.explanations && (
                      <div className="mt-2">
                        {isTouchingGrass ? (
                          <div className="text-green-400/60">
                            {detectionResult.explanations.positive[0] || "You're touching grass!"}
                          </div>
                        ) : (
                          <div className="text-red-400/60">
                            {detectionResult.explanations.negative[0] || "You're not touching grass."}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!isManualOverride && !isTouchingGrass && (
                      <button
                        onClick={onManualOverride}
                        className="mt-2 text-blue-400/60 hover:text-blue-400"
                      >
                        I&apos;m definitely touching grass here
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-green-400/60 mb-1">WALLET</div>
                    <div className="truncate mb-1">{formatAddress(walletAddress)}</div>
                    <button onClick={onDisconnect} className="text-red-400/60 hover:text-red-400 text-[10px]">
                      disconnect
                    </button>
                  </div>
                  <div>
                    <div className="text-green-400/60 mb-1">CHAIN</div>
                    <div>Base</div>
                  </div>
                  {location && (
                    <>
                      <div>
                        <div className="text-green-400/60 mb-1">LAT</div>
                        <div>{location.lat.toFixed(6)}</div>
                      </div>
                      <div>
                        <div className="text-green-400/60 mb-1">LON</div>
                        <div>{location.lng.toFixed(6)}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              // Attestations History Card
              <div className="flex flex-col gap-2 h-full">
                <div className="flex items-center justify-between text-xs opacity-60 mb-2">
                  <button 
                    onClick={() => setShowAttestations(false)}
                    className="text-green-400/60 hover:text-green-400"
                  >
                    ← Back
                  </button>
                  <span>HISTORY</span>
                </div>

                {loading ? (
                  <div className="flex flex-col justify-center items-center flex-grow">
                    <div className="text-sm text-gray-400">Loading attestations...</div>
                  </div>
                ) : attestations.length === 0 ? (
                  <div className="flex flex-col justify-center items-center flex-grow">
                    <div className="text-sm text-gray-400">No attestations found.</div>
                    <button 
                      onClick={() => setShowAttestations(false)}
                      className="mt-2 text-green-400/60 hover:text-green-400 text-sm"
                    >
                      Go touch some grass! →
                    </button>
                  </div>
                ) : (
                  <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-green-400/20 scrollbar-track-transparent">
                    <div className="space-y-2">
                      {attestations.map((attestation) => (
                        <div
                          key={attestation.id}
                          onClick={() => onSelectAttestation(attestation)}
                          className="p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-semibold ${
                              attestation.isTouchingGrass ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {attestation.isTouchingGrass ? 'TOUCHING GRASS' : 'NOT TOUCHING GRASS'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(attestation.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {attestation.lat.toFixed(6)}, {attestation.lon.toFixed(6)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAttestation && (
                  <div className="p-3 rounded bg-white/5">
                    <h3 className="text-sm font-medium mb-2 text-green-400/60">Selected Attestation</h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-gray-400">Time: </span>
                        {selectedAttestation.timestamp.toLocaleString()}
                      </div>
                      <div>
                        <span className="text-gray-400">Location: </span>
                        {selectedAttestation.lat.toFixed(6)}, {selectedAttestation.lon.toFixed(6)}
                      </div>
                      <div>
                        <a
                          href={`https://basescan.org/tx/${selectedAttestation.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View on BaseScan →
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Attestation Button - Now outside the card content */}
      <div className="mt-4 mb-6">
        <button
          onClick={handleCreateAttestation}
          disabled={isCreatingAttestation || !location || !isTouchingGrass}
          className={`w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold tracking-wide transition-all duration-300 ${
            showSuccessAnimation ? 'animate-rainbow-text' : ''
          }`}
        >
          {isCreatingAttestation ? 'Creating Attestation...' : 
           showSuccessAnimation ? '🌱 Successfully Touched Grass! 🎉' :
           !location ? '📍 Location Required' :
           !isTouchingGrass ? '🚫 Must Be Touching Grass' :
           '🌿 Attest to Touching Grass'}
        </button>
      </div>

      {/* Swipe Indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
        <div className={`w-1 h-1 rounded-full transition-colors duration-200 ${!showAttestations ? 'bg-green-400' : 'bg-green-400/20'}`} />
        <div className={`w-1 h-1 rounded-full transition-colors duration-200 ${showAttestations ? 'bg-green-400' : 'bg-green-400/20'}`} />
      </div>
    </div>
  );
} 
