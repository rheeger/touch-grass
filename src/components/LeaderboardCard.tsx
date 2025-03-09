import { type Attestation } from '@/utils/attestations';
import { useState, useEffect, useMemo, useCallback } from 'react';
import '@/styles/leaderboard.css';
import { resolveEnsName, formatAddressOrEns } from '@/utils/ens';
import { FilterDropdown } from './FilterDropdown';

interface LeaderboardCardProps {
  attestations: Attestation[];
  onBack: () => void;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
  onUserSelect: (address: `0x${string}` | null) => void;
  selectedUser: `0x${string}` | null;
  isAuthenticated: boolean;
  initialMediaFilter?: "all" | "1.0" | "0.1";
  initialShowJustMe?: boolean;
  onFilterUpdate?: (options: {
    showOnlyGrass: boolean;
    showJustMe: boolean;
    mediaFilter: "all" | "1.0" | "0.1";
  }) => void;
}

interface LeaderboardEntry {
  address: `0x${string}`;
  totalCount: number;
  grassCount: number;
  isPlaceholder?: boolean;
  ensName?: string | null;
}

const PROGRESS_BAR_MAX = 30; // Maximum scale for progress bar
const GRASS_GOAL = 10; // Goal line for grass attestations
const LEADERBOARD_SIZE = 10; // Number of entries to show

function getRankDisplay(rank: number): { text: string; isEmoji: boolean } {
  switch (rank) {
    case 0:
      return { text: '🥇', isEmoji: true };
    case 1:
      return { text: '🥈', isEmoji: true };
    case 2:
      return { text: '🥉', isEmoji: true };
    default:
      return { text: `#${rank + 1}`, isEmoji: false };
  }
}

export function LeaderboardCard({
  attestations,
  onBack,
  showOnlyGrass,
  onShowOnlyGrassChange,
  onUserSelect,
  selectedUser,
  isAuthenticated = false, // Default to false if not provided
  initialMediaFilter,
  initialShowJustMe,
  onFilterUpdate
}: LeaderboardCardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [ensNames, setEnsNames] = useState<{ [address: string]: string | null }>({});
  const [isResolvingEns, setIsResolvingEns] = useState(false);
  const [showJustMe, setShowJustMe] = useState(initialShowJustMe || false);
  const [mediaFilter, setMediaFilter] = useState<"all" | "1.0" | "0.1">(initialMediaFilter || "all");
  
  // Keep local state in sync with parent props
  useEffect(() => {
    if (initialMediaFilter !== undefined) {
      setMediaFilter(initialMediaFilter);
    }
    if (initialShowJustMe !== undefined) {
      setShowJustMe(initialShowJustMe);
    }
  }, [initialMediaFilter, initialShowJustMe]);
  
  // Memoize user stats calculation
  const userStats = useMemo(() => {
    // Apply media filter if needed
    const filteredAttestations = mediaFilter === "all" 
      ? attestations 
      : attestations.filter(att => att.mediaVersion === mediaFilter);
      
    return filteredAttestations.reduce((acc, attestation) => {
      const address = attestation.attester;
      if (!acc[address]) {
        acc[address] = {
          address,
          totalCount: 0,
          grassCount: 0,
          ensName: null,
        };
      }
      acc[address].totalCount++;
      if (attestation.isTouchingGrass) {
        acc[address].grassCount++;
      }
      return acc;
    }, {} as Record<string, LeaderboardEntry>);
  }, [attestations, mediaFilter]);

  // Memoize sorted leaderboard
  const sortedLeaderboard = useMemo(() => {
    return Object.values(userStats).sort((a, b) => {
      const aCount = showOnlyGrass ? a.grassCount : a.totalCount;
      const bCount = showOnlyGrass ? b.grassCount : b.totalCount;
      return bCount - aCount;
    });
  }, [userStats, showOnlyGrass]);

  // Fetch ENS names for leaderboard
  useEffect(() => {
    const fetchEnsNames = async () => {
      if (sortedLeaderboard.length === 0 || isResolvingEns) return;

      setIsResolvingEns(true);
      const uniqueAddresses = [...new Set(sortedLeaderboard.map(entry => entry.address))];

      const names: Record<string, string | null> = {};
      for (const address of uniqueAddresses) {
        try {
          const ensName = await resolveEnsName(address);
          names[address] = ensName;
        } catch (error) {
          console.error(`Failed to resolve ENS name for ${address}:`, error);
          names[address] = null;
        }
      }

      setEnsNames(names);
      setIsResolvingEns(false);
    };

    fetchEnsNames();
  }, [sortedLeaderboard, isResolvingEns]);

  // Update leaderboard with ENS names
  useEffect(() => {
    if (Object.keys(ensNames).length > 0) {
      const updatedLeaderboard = sortedLeaderboard.map(entry => ({
        ...entry,
        ensName: ensNames[entry.address]
      }));
      setLeaderboard(updatedLeaderboard);
    } else {
      setLeaderboard(sortedLeaderboard);
    }
  }, [sortedLeaderboard, ensNames]);

  // Create display entries including placeholders if needed
  const displayEntries = useMemo(() => {
    // If using "JUST ME" filter and authenticated, filter to only show the user
    let filteredLeaderboard = leaderboard;
    if (showJustMe && selectedUser) {
      filteredLeaderboard = leaderboard.filter(entry => entry.address.toLowerCase() === selectedUser.toLowerCase());
    }
    
    const entries = [...filteredLeaderboard];
    // Add placeholders if less than LEADERBOARD_SIZE entries
    if (entries.length < LEADERBOARD_SIZE) {
      const placeholdersNeeded = LEADERBOARD_SIZE - entries.length;
      for (let i = 0; i < placeholdersNeeded; i++) {
        entries.push({
          address: `0x${'0'.repeat(40)}` as `0x${string}`, // Valid 0x address format
          totalCount: 0,
          grassCount: 0,
          isPlaceholder: true
        });
      }
    }
    return entries.slice(0, LEADERBOARD_SIZE);
  }, [leaderboard, showJustMe, selectedUser]);

  // Handle filter changes from the FilterDropdown component
  const handleFilterChange = (newOptions: {
    showOnlyGrass: boolean;
    showJustMe: boolean;
    mediaFilter: "all" | "1.0" | "0.1";
  }) => {
    onShowOnlyGrassChange(newOptions.showOnlyGrass);
    setShowJustMe(newOptions.showJustMe);
    setMediaFilter(newOptions.mediaFilter);
    if (onFilterUpdate) {
      onFilterUpdate(newOptions);
    }
  };

  // Memoize user click handler
  const handleUserClick = useCallback((entry: LeaderboardEntry) => {
    if (!entry.isPlaceholder) {
      const newSelectedUser = selectedUser === entry.address ? null : entry.address;
      onUserSelect(newSelectedUser);
    }
  }, [selectedUser, onUserSelect]);

  return (
    <div className="leaderboard-card h-[50vh]">
      <div className="leaderboard-header">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="leaderboard-back-button"
            >
              <span>←</span>
              <span>BACK</span>
            </button>
            <span className="leaderboard-title">LEADERBOARD</span>
          </div>
          
          {/* Unified filter dropdown component for leaderboard */}
          <FilterDropdown 
            options={{
              showOnlyGrass,
              showJustMe,
              mediaFilter
            }}
            onChange={handleFilterChange}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>

      <div className="leaderboard-content">
        <div className="leaderboard-list">
          {displayEntries.map((entry, index) => {
            const rankDisplay = getRankDisplay(index);
            const isSelected = selectedUser === entry.address;
            return (
              <div
                key={entry.address + index}
                className={`leaderboard-entry ${
                  entry.isPlaceholder 
                    ? 'leaderboard-entry-placeholder' 
                    : `cursor-pointer hover:bg-white/10 ${isSelected ? 'bg-white/20' : ''}`
                }`}
                onClick={() => handleUserClick(entry)}
              >
                <div className="leaderboard-entry-header">
                  <div className="leaderboard-rank">
                    <div className={rankDisplay.isEmoji ? 'leaderboard-rank-emoji' : 'leaderboard-rank-number'}>
                      <span>{rankDisplay.text}</span>
                    </div>
                    <div className="leaderboard-address">
                      {entry.isPlaceholder ? (
                        <span className="leaderboard-address-placeholder">Unclaimed</span>
                      ) : (
                        formatAddressOrEns(entry.address, entry.ensName || null)
                      )}
                    </div>
                  </div>
                  <div className="leaderboard-stats">
                    <div className="leaderboard-count">
                      {showOnlyGrass ? entry.grassCount : entry.totalCount}
                    </div>
                    <div className="leaderboard-label">
                      {showOnlyGrass ? 'grass touches' : 'attestations'}
                    </div>
                  </div>
                </div>
                <div className="leaderboard-progress">
                  {/* Goal line */}
                  <div 
                    className="leaderboard-goal-line"
                    style={{
                      left: `${(GRASS_GOAL / PROGRESS_BAR_MAX) * 100}%`,
                      zIndex: 2
                    }}
                  />
                  {/* Progress bars */}
                  <div className="leaderboard-progress-bar">
                    {showOnlyGrass ? (
                      // Grass-only view
                      <div
                        className="leaderboard-progress-grass"
                        style={{
                          width: `${Math.min(entry.grassCount / PROGRESS_BAR_MAX * 100, 100)}%`
                        }}
                      />
                    ) : (
                      // Combined view
                      <>
                        {/* Non-grass attestations */}
                        <div
                          className="leaderboard-progress-non-grass"
                          style={{
                            width: `${Math.min((entry.totalCount - entry.grassCount) / PROGRESS_BAR_MAX * 100, 100)}%`,
                            left: `${Math.min(entry.grassCount / PROGRESS_BAR_MAX * 100, 100)}%`
                          }}
                        />
                        {/* Grass attestations */}
                        <div
                          className="leaderboard-progress-grass"
                          style={{
                            width: `${Math.min(entry.grassCount / PROGRESS_BAR_MAX * 100, 100)}%`
                          }}
                        />
                      </>
                    )}
                  </div>
                  {/* Scale indicators */}
                  <div className="leaderboard-progress-info">
                    {!entry.isPlaceholder && (
                      <span className="leaderboard-goal-text">
                        {entry.grassCount < 10 ? `${Math.max(0, GRASS_GOAL - entry.grassCount)} touches to goal` : 'Goal reached!'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 