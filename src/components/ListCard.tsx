import { type Attestation } from '@/utils/attestations';
import { getRelativeTimeString, calculateDistance, formatDistance, getHumanReadableLocation, type FormattedLocation } from '@/utils/places';
import { useEffect, useRef, useMemo, useCallback, useState, ReactNode } from 'react';
import { resolveEnsName, formatAddressOrEns } from '@/utils/ens';
import '@/styles/listcard.css';

export interface ListCardProps {
  attestations: Attestation[];
  currentLocation: { lat: number; lng: number } | null;
  onSelectAttestation: (attestation: Attestation | null) => void;
  selectedAttestation: Attestation | null;
  onBack: () => void;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
  title: string;
  showAttesterInfo?: boolean;
  isLoadingList?: boolean;
  customHeader?: ReactNode;
}

export function ListCard({
  attestations,
  currentLocation,
  onSelectAttestation,
  selectedAttestation,
  onBack,
  showOnlyGrass,
  onShowOnlyGrassChange,
  title,
  showAttesterInfo = false,
  isLoadingList = false,
  customHeader
}: ListCardProps) {
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const [formattedLocations, setFormattedLocations] = useState<{ [key: string]: FormattedLocation }>({});
  const [ensNames, setEnsNames] = useState<{ [address: string]: string | null }>({});
  const [isResolvingEns, setIsResolvingEns] = useState(false);

  // Memoize filtered attestations
  const filteredAttestations = useMemo(() => 
    showOnlyGrass ? attestations.filter(a => a.isTouchingGrass) : attestations,
    [attestations, showOnlyGrass]
  );

  // Memoize unique attester addresses when showing attester info
  const uniqueAttesterAddresses = useMemo(() => 
    showAttesterInfo ? [...new Set(filteredAttestations.map(a => a.attester))] : [],
    [filteredAttestations, showAttesterInfo]
  );

  // Optimize ENS resolution with debouncing and batching
  useEffect(() => {
    if (!showAttesterInfo || isResolvingEns) return;

    const unresolvedAddresses = uniqueAttesterAddresses.filter(
      address => ensNames[address] === undefined
    );

    if (unresolvedAddresses.length === 0) return;

    const resolveNames = async () => {
      setIsResolvingEns(true);
      try {
        const batchSize = 5;
        for (let i = 0; i < unresolvedAddresses.length; i += batchSize) {
          const batch = unresolvedAddresses.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async address => ({
              address,
              name: await resolveEnsName(address)
            }))
          );
          
          setEnsNames(prev => ({
            ...prev,
            ...Object.fromEntries(results.map(({ address, name }) => [address, name]))
          }));
        }
      } catch (error) {
        console.error('Error resolving ENS names:', error);
      } finally {
        setIsResolvingEns(false);
      }
    };

    resolveNames();
  }, [uniqueAttesterAddresses, ensNames, isResolvingEns, showAttesterInfo]);

  // Memoize the scroll handler
  const handleScroll = useCallback(() => {
    if (selectedAttestation && selectedItemRef.current) {
      try {
        selectedItemRef.current.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
        });
      } catch (e: unknown) {
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

  // Fetch formatted locations for attestations
  useEffect(() => {
    if (window.google?.maps) {
      const map = new google.maps.Map(document.createElement('div'));
      
      // Process attestations in batches to avoid rate limiting
      const batchSize = 5;
      const processAttestations = async () => {
        for (let i = 0; i < filteredAttestations.length; i += batchSize) {
          const batch = filteredAttestations.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (attestation) => {
              try {
                const formatted = await getHumanReadableLocation(attestation.lat, attestation.lon, map);
                setFormattedLocations(prev => ({
                  ...prev,
                  [attestation.id]: formatted
                }));
              } catch (error) {
                console.error(`Error formatting location for attestation ${attestation.id}:`, error);
              }
            })
          );
          // Add a small delay between batches
          if (i + batchSize < filteredAttestations.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      };

      processAttestations();
    }
  }, [filteredAttestations]);

  return (
    <div className="list-card h-[50vh]">
      {customHeader || (
        <div className="list-header">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="list-back-button"
            >
              <span>←</span>
              <span>BACK</span>
            </button>
            <span className="list-title">{title}</span>
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
            {isLoadingList && <span className="list-loading ml-2">Loading...</span>}
          </div>
        </div>
      )}

      <div className="list-content">
        {filteredAttestations.length === 0 ? (
          <div className="list-empty flex flex-col items-center">
            <div>No attestations yet</div>
          </div>
        ) : (
          <div className="list-items">
            {filteredAttestations.map((attestation) => {
              const distance = calculateDistances(attestation);

              return (
                <div
                  key={attestation.id}
                  ref={attestation.id === selectedAttestation?.id ? selectedItemRef : null}
                  className={`list-item relative ${
                    selectedAttestation?.id === attestation.id
                      ? 'list-item-selected'
                      : 'list-item-default'
                  } ${
                    attestation.mediaVersion === "1.0" 
                      ? 'list-item-production' 
                      : 'list-item-test'
                  }`}
                  onClick={() => onSelectAttestation(attestation)}
                >
                  {/* Add sparkle elements for production version */}
                  {attestation.mediaVersion === "1.0" && (
                    <>
                      <div className="sparkle"></div>
                      <div className="sparkle"></div>
                      <div className="sparkle"></div>
                    </>
                  )}
                  <div className="list-item-header">
                    <div className="list-item-top">
                      <div className={`list-item-status ${
                        attestation.isTouchingGrass ? 'list-item-status-grass' : 'list-item-status-no-grass'
                      }`}>
                        {attestation.isTouchingGrass ? 'Touching Grass' : 'Not Touching Grass'}
                      </div>
                      <div className="list-item-coordinates">
                        <div className="list-item-coords">
                          {attestation.lat.toFixed(4)}, {attestation.lon.toFixed(4)}
                        </div>
                        {formattedLocations[attestation.id]?.url && (
                          <a
                            href={formattedLocations[attestation.id].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="list-item-globe"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                              <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="list-item-location">
                    {formattedLocations[attestation.id] ? (
                      <div className="flex flex-col">
                        {formattedLocations[attestation.id].placeName && (
                          <div className="list-item-place">
                            {formattedLocations[attestation.id].placeName}
                          </div>
                        )}
                        <div className="list-item-address">
                          {[
                            formattedLocations[attestation.id].city,
                            formattedLocations[attestation.id].state,
                            formattedLocations[attestation.id].country
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Loading location...</div>
                    )}
                  </div>
                  <div className="list-item-footer">
                    <div className="list-item-byline">
                      {(!showAttesterInfo) ? (
                        <>by Anonymous</>
                      ) : (
                        <>by {formatAddressOrEns(attestation.attester, ensNames[attestation.attester])}</>
                      )}
                    </div>
                    <div className="list-item-metadata">
                      <div>{getRelativeTimeString(attestation.timestamp)}</div>
                      {distance !== null && (
                        <>
                          <span>•</span>
                          <div>{formatDistance(distance)} away</div>
                        </>
                      )}
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