import { type Attestation } from '@/utils/attestations';
import { getRelativeTimeString, calculateDistance, formatDistance } from '@/utils/places';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import '@/styles/history.css';

interface HistoryCardProps {
  onSelectAttestation: (attestation: Attestation) => void;
  selectedAttestation: Attestation | null;
  attestations: Attestation[];
  currentLocation: { lat: number; lng: number } | null;
  onBack: () => void;
  isLoadingHistory: boolean;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
  isAuthenticated: boolean;
  onConnect: () => void;
}

export function HistoryCard({
  onSelectAttestation,
  selectedAttestation,
  attestations,
  currentLocation,
  onBack,
  isLoadingHistory,
  showOnlyGrass,
  onShowOnlyGrassChange,
  isAuthenticated,
  onConnect,
}: HistoryCardProps) {
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Memoize filtered attestations
  const filteredAttestations = useMemo(() => 
    showOnlyGrass ? attestations.filter(a => a.isTouchingGrass) : attestations,
    [attestations, showOnlyGrass]
  );

  // Memoize the scroll handler
  const handleScroll = useCallback(() => {
    if (selectedAttestation && selectedItemRef.current) {
      try {
        selectedItemRef.current.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
        });
      } catch (e: unknown) {
        // Fallback for Safari
        console.warn('Smooth scrolling not supported:', e);
        selectedItemRef.current.scrollIntoView(false);
      }
    }
  }, [selectedAttestation]);

  useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  // Memoize distance calculations
  const calculateDistances = useCallback((attestation: Attestation) => {
    if (!currentLocation) return null;
    return calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      attestation.lat,
      attestation.lon
    );
  }, [currentLocation]);

  return (
    <div className="history-card">
      <div className="history-header">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="history-back-button"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <span className="history-title">HISTORY</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="view-toggle">
            <button
              onClick={() => onShowOnlyGrassChange(false)}
              className={`view-toggle-button ${
                !showOnlyGrass ? 'view-toggle-button-active' : 'view-toggle-button-inactive'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => onShowOnlyGrassChange(true)}
              className={`view-toggle-button ${
                showOnlyGrass ? 'view-toggle-button-active' : 'view-toggle-button-inactive'
              }`}
            >
              GRASS
            </button>
          </div>
          {isLoadingHistory && <span className="history-loading">Loading...</span>}
        </div>
      </div>

      <div className="history-content">
        {filteredAttestations.length === 0 ? (
          <div className="history-empty flex flex-col items-center">
            <div>No attestations yet</div>
            {!isAuthenticated && (
              <button
                onClick={onConnect}
                className="menu-wallet-connect mt-2"
              >
                Log in
              </button>
            )}
          </div>
        ) : (
          <div className="history-list">
            {filteredAttestations.map((attestation) => {
              const distance = calculateDistances(attestation);

              return (
                <div
                  key={attestation.id}
                  ref={attestation.id === selectedAttestation?.id ? selectedItemRef : null}
                  className={`history-item ${
                    selectedAttestation?.id === attestation.id
                      ? 'history-item-selected'
                      : 'history-item-default'
                  }`}
                  onClick={() => onSelectAttestation(attestation)}
                >
                  <div className="history-item-header">
                    <div className={`history-item-status ${
                      attestation.isTouchingGrass ? 'history-item-status-grass' : 'history-item-status-no-grass'
                    }`}>
                      {attestation.isTouchingGrass ? 'Touching Grass' : 'Not Touching Grass'}
                    </div>
                    <div className="history-item-right">
                      <div className="history-item-time">
                        {getRelativeTimeString(attestation.timestamp)}
                      </div>
                      {distance !== null && (
                        <div className="history-item-distance">
                          {formatDistance(distance)} away
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="history-item-location">
                    <div className="history-item-coordinates">
                      {attestation.lat.toFixed(6)}, {attestation.lon.toFixed(6)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 