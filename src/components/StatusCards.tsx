'use client';

import '@/styles/status.css';
import React, { useState, useEffect } from 'react';
import { type Attestation } from '@/utils/attestations';
import confetti from 'canvas-confetti';
import { FeedCard } from './FeedCard';
import { HistoryCard } from './HistoryCard';
import { LeaderboardCard } from './LeaderboardCard';
import { AboutCard } from './About';
import { resolveEnsName, formatAddressOrEns } from '@/utils/ens';
import { getHumanReadableLocation, type FormattedLocation } from '@/utils/places';
import Logger from '@/utils/logger';
import { LocationResult } from '@/utils/location';
import type { GrassDetectionResult } from '@/utils/grassDetection';
import { getRegistrationStatus } from '@/utils/registration';
import { Tooltip } from './Tooltip';
import { RegistrationWarning } from './RegistrationWarning';

export interface StatusCardsProps {
  isLoading: boolean;
  location: LocationResult | null;
  isAnalyzing: boolean;
  isTouchingGrass: boolean;
  detectionResult: GrassDetectionResult | null;
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
  currentView: 'status' | 'history' | 'feed' | 'leaderboard' | 'about';
  onViewChange: (view: 'status' | 'history' | 'feed' | 'leaderboard' | 'about') => void;
  isLocationTooFar: boolean;
  initialLocation: LocationResult | null;
  onMapClick: (event: google.maps.MapMouseEvent) => void;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
  selectedUser: string | null;
  onUserSelect: (address: string | null) => void;
  map: google.maps.Map | null;
  onRequestPreciseLocation: () => Promise<LocationResult>;
  onLocationChange: (newLocation: LocationResult) => void;
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
  map,
}: StatusCardsProps) {
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [formattedLocation, setFormattedLocation] = useState<FormattedLocation | null>(null);
  const [hasAntedUp, setHasAntedUp] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      resolveEnsName(walletAddress).then(name => setEnsName(name));
    } else {
      setEnsName(null);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (isAuthenticated && walletAddress) {
      getRegistrationStatus(walletAddress).then(status => {
        setHasAntedUp(status.isRegistered);
        Logger.info('Registration status checked', { walletAddress, status });
      }).catch(error => {
        Logger.error('Failed to check registration status', { error });
        setHasAntedUp(false);
      });
    }
  }, [isAuthenticated, walletAddress]);

  useEffect(() => {
    if (location && map) {
      Logger.info('Getting human readable location with map instance', { location });
      getHumanReadableLocation(location.lat, location.lng, map)
        .then(formatted => {
          Logger.info('Got formatted location', { formatted });
          setFormattedLocation(formatted);
        })
        .catch(error => {
          Logger.error('Error getting formatted location', { error });
          setFormattedLocation(null);
        });
    } else {
      if (!location) Logger.debug('No location available');
      if (!map) Logger.debug('Map not ready');
      setFormattedLocation(null);
    }
  }, [location, map]);

  useEffect(() => {
    if (!isCreatingAttestation && showSuccessAnimation) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      const timer = setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isCreatingAttestation, showSuccessAnimation]);

  const renderLocationTooltip = () => {
    if (!location?.isPrecise) {
      return (
        <Tooltip content="Using approximate location based on IP address. Enable precise location in your browser for better accuracy.">
          <div className="p-1 text-yellow-500 hover:text-yellow-400 transition-colors cursor-help">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
          </div>
        </Tooltip>
      );
    }
    return null;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10">
      <div className="max-w-3xl mx-auto">
        {currentView === 'status' && (
          <div className="status-card">
            <div className="status-header">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => onViewChange('about')}
                  className="status-menu-button"
                >
                  <span>ABOUT</span>
                </button>
                <button
                  onClick={() => onViewChange('leaderboard')}
                  className="status-menu-button"
                >
                  <span>LEADERBOARD</span>
                </button>
                <button
                  onClick={() => onViewChange('feed')}
                  className="status-menu-button"
                >
                  <span>FEED</span>
                </button>
                <button
                  onClick={() => onViewChange('history')}
                  className="status-menu-button"
                >
                  <span>HISTORY</span>
                </button>
              </div>
              <div className="wallet-info">
                {isAuthenticated ? (
                  <>
                    <span className="wallet-address">
                      {!hasAntedUp && <RegistrationWarning className="mr-2" />}
                      {formatAddressOrEns(walletAddress || '', ensName)}
                    </span>
                    <button
                      onClick={onDisconnect}
                      className="wallet-disconnect"
                    >
                      LOG OUT
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onConnect}
                    className="wallet-connect"
                  >
                    LOG IN
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : !location ? (
                <div className="text-center py-4">Waiting for location...</div>
              ) : (
                <>
                  <div className="">
                    <div className="text-sm opacity-60 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center gap-1">
                          <span>LOCATION</span>
                          {renderLocationTooltip()}
                        </div>
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
                            (RESET)
                          </button>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-white/60">
                          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </div>
                        {formattedLocation?.url && (
                          <a
                            href={formattedLocation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/60 hover:text-white transition-colors cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                              <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-start mt-1">
                      <div className="flex-1">
                        {isAnalyzing ? (
                          <>
                            <div className="text-base font-medium text-gray-400">
                              Analyzing location...
                            </div>
                            <div className="text-sm text-gray-500">
                              Determining city, state, country
                            </div>
                          </>
                        ) : (
                          <>
                            {formattedLocation ? (
                              <>
                                {formattedLocation.placeName && (
                                  <div className="text-base font-medium">
                                    {formattedLocation.placeName}
                                  </div>
                                )}
                                <div className="text-sm text-white/60">
                                  {[
                                    formattedLocation.city,
                                    formattedLocation.state,
                                    formattedLocation.country
                                  ].filter(Boolean).join(', ')}
                                </div>
                              </>
                            ) : (
                              <div className="text-base">Unknown Location</div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm uppercase tracking-wider opacity-60">Status</div>
                        <div className="view-toggle">
                          <button
                            onClick={() => onManualOverride()}
                            disabled={isLocationTooFar}
                            className={`view-toggle-button ${
                              !isManualOverride ? 'view-toggle-button-active' : 'view-toggle-button-inactive'
                            } ${isLocationTooFar ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            AUTO
                          </button>
                          <button
                            onClick={() => onManualOverride()}
                            disabled={isLocationTooFar}
                            className={`view-toggle-button ${
                              isManualOverride ? 'view-toggle-button-active' : 'view-toggle-button-inactive'
                            } ${isLocationTooFar ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            OVERRIDE
                          </button>
                        </div>
                      </div>
                      <div className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
                        isAnalyzing ? 'bg-gray-900/50 text-gray-400' :
                        isTouchingGrass ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                      }`}>
                        {isAnalyzing ? 'Analyzing...' :
                         isTouchingGrass ? 'Touching Grass' : 'Not Touching Grass'}
                      </div>
                      {!isAnalyzing && detectionResult ? (
                        <ul className="space-y-2 text-sm mt-2 pl-1">
                          {isTouchingGrass
                            ? detectionResult.explanations.positive.map((reason, i) => (
                                <li key={i} className="text-green-400 flex items-start">
                                  <span className="mr-2">✓</span>
                                  <span>{reason}</span>
                                </li>
                              ))
                            : detectionResult.explanations.negative.map((reason, i) => (
                                <li key={i} className="text-red-400 flex items-start">
                                  <span className="mr-2">✗</span>
                                  <span>{reason}</span>
                                </li>
                              ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-gray-400 mt-2">
                          {isAnalyzing ? 'Analysis in progress...' : 'No analysis available'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={onCreateAttestation}
                        disabled={isCreatingAttestation || isLocationTooFar || isAnalyzing}
                        className={`w-full px-4 py-2 mb-2 ${
                          isCreatingAttestation || isLocationTooFar || isAnalyzing
                            ? 'bg-gray-700 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        } rounded-lg text-sm font-bold tracking-wide`}
                      >
                        {isCreatingAttestation 
                          ? 'Creating...' 
                          : isLocationTooFar 
                            ? 'Selected Location is Too Far'
                            : isAnalyzing
                              ? 'Analyzing Location...'
                              : 'Create Record'
                        }
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {currentView === 'about' && (
          <AboutCard
            onConnect={onConnect}
            isAuthenticated={isAuthenticated}
            walletAddress={walletAddress}
            onDisconnect={onDisconnect}
            onViewChange={onViewChange}
          />
        )}

        {currentView === 'history' && (
          <HistoryCard
            onSelectAttestation={onSelectAttestation}
            selectedAttestation={selectedAttestation}
            attestations={attestations}
            currentLocation={location}
            onBack={() => onViewChange('status')}
            isLoadingHistory={isLoadingHistory}
            showOnlyGrass={showOnlyGrass}
            onShowOnlyGrassChange={onShowOnlyGrassChange}
            isAuthenticated={isAuthenticated}
            onConnect={onConnect}
          />
        )}

        {currentView === 'feed' && (
          <FeedCard
            attestations={allAttestations}
            currentLocation={location}
            onSelectAttestation={onSelectAttestation}
            selectedAttestation={selectedAttestation}
            onBack={() => onViewChange('status')}
            showOnlyGrass={showOnlyGrass}
            onShowOnlyGrassChange={onShowOnlyGrassChange}
            selectedUser={selectedUser}
            onUserSelect={onUserSelect}
          />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardCard
            attestations={allAttestations}
            onBack={() => {
              onViewChange('status');
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
  );
} 
