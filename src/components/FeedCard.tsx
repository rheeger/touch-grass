import { type Attestation } from '@/utils/attestations';
import { getRelativeTimeString, calculateDistance, formatDistance } from '@/utils/places';
import { useEffect, useRef, useState } from 'react';
import { resolveEnsName, formatAddressOrEns } from '@/utils/ens';

interface FeedCardProps {
  attestations: Attestation[];
  currentLocation: { lat: number; lng: number } | null;
  onSelectAttestation: (attestation: Attestation) => void;
  selectedAttestation: Attestation | null;
  onBack: () => void;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
}

export function FeedCard({
  attestations,
  currentLocation,
  onSelectAttestation,
  selectedAttestation,
  onBack,
  showOnlyGrass,
  onShowOnlyGrassChange,
}: FeedCardProps) {
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const [ensNames, setEnsNames] = useState<{ [address: string]: string | null }>({});

  // Scroll to selected item when it changes
  useEffect(() => {
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

  // Resolve ENS names for attesters
  useEffect(() => {
    const resolveAttesterNames = async () => {
      const uniqueAttesterAddresses = [...new Set(attestations.map(a => a.attester))];
      for (const address of uniqueAttesterAddresses) {
        if (!ensNames[address]) {
          const name = await resolveEnsName(address);
          setEnsNames(prev => ({
            ...prev,
            [address]: name
          }));
        }
      }
    };
    resolveAttesterNames();
  }, [ensNames, attestations]);

  // Filter attestations based on toggle
  const filteredAttestations = showOnlyGrass
    ? attestations.filter(a => a.isTouchingGrass)
    : attestations;

  return (
    <div className="feed-card">
      <div className="feed-header">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="feed-back-button"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <span className="feed-title">FEED</span>
        </div>
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
      </div>

      <div className="feed-content">
        {filteredAttestations.length === 0 ? (
          <div className="feed-empty">
            No attestations yet
          </div>
        ) : (
          <div className="feed-list">
            {filteredAttestations.map((attestation) => {
              const distance = currentLocation
                ? calculateDistance(
                    currentLocation.lat,
                    currentLocation.lng,
                    attestation.lat,
                    attestation.lon
                  )
                : null;

              return (
                <div
                  key={attestation.id}
                  ref={attestation.id === selectedAttestation?.id ? selectedItemRef : null}
                  className={`feed-item ${
                    selectedAttestation?.id === attestation.id
                      ? 'feed-item-selected'
                      : 'feed-item-default'
                  }`}
                  onClick={() => onSelectAttestation(attestation)}
                >
                  <div className="feed-item-header">
                    <div className="feed-item-info">
                      <div className={`feed-item-status ${
                        attestation.isTouchingGrass ? 'feed-item-status-grass' : 'feed-item-status-no-grass'
                      }`}>
                        {attestation.isTouchingGrass ? 'Touching Grass' : 'Not Touching Grass'}
                      </div>
                      <div className="feed-item-attester">
                        by {formatAddressOrEns(attestation.attester, ensNames[attestation.attester])}
                      </div>
                    </div>
                    <div className="feed-item-right">
                      <div className="feed-item-time">
                        {getRelativeTimeString(attestation.timestamp)}
                      </div>
                      {distance !== null && (
                        <div className="feed-item-distance">
                          {formatDistance(distance)} away
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="feed-item-location">
                    <div className="feed-item-coordinates">
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