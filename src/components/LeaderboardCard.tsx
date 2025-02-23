import { type Attestation } from '@/utils/attestations';
import { useState, useEffect, useMemo, useCallback } from 'react';
import '@/styles/leaderboard.css';
import { resolveEnsName, formatAddressOrEns } from '@/utils/ens';

interface LeaderboardCardProps {
  attestations: Attestation[];
  onBack: () => void;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
  selectedUser: string | null;
  onUserSelect: (address: string | null) => void;
}

interface LeaderboardEntry {
  address: string;
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
  selectedUser,
  onUserSelect,
}: LeaderboardCardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [ensNames, setEnsNames] = useState<{ [address: string]: string | null }>({});
  const [isResolvingEns, setIsResolvingEns] = useState(false);

  // Memoize user stats calculation
  const userStats = useMemo(() => {
    return attestations.reduce((acc, attestation) => {
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
  }, [attestations]);

  // Memoize sorted leaderboard
  const sortedLeaderboard = useMemo(() => {
    return Object.values(userStats).sort((a, b) => {
      const aCount = showOnlyGrass ? a.grassCount : a.totalCount;
      const bCount = showOnlyGrass ? b.grassCount : b.totalCount;
      return bCount - aCount;
    });
  }, [userStats, showOnlyGrass]);

  // Optimize ENS resolution with batching
  useEffect(() => {
    if (isResolvingEns) return;

    const unresolvedAddresses = sortedLeaderboard
      .filter(entry => !entry.isPlaceholder && ensNames[entry.address] === undefined)
      .map(entry => entry.address);

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
  }, [sortedLeaderboard, ensNames, isResolvingEns]);

  // Update leaderboard when sorted data changes
  useEffect(() => {
    setLeaderboard(sortedLeaderboard);
  }, [sortedLeaderboard]);

  // Memoize display entries
  const displayEntries = useMemo(() => {
    return [...Array(LEADERBOARD_SIZE)].map((_, index) => {
      if (index < leaderboard.length) {
        return {
          ...leaderboard[index],
          ensName: ensNames[leaderboard[index].address]
        };
      }
      return {
        address: '0x0000000000000000000000000000000000000000',
        totalCount: 0,
        grassCount: 0,
        isPlaceholder: true,
        ensName: null,
      };
    });
  }, [leaderboard, ensNames]);

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
        <div className="leaderboard-toggle">
          <button
            onClick={() => onShowOnlyGrassChange(false)}
            className={`leaderboard-toggle-button ${
              !showOnlyGrass ? 'leaderboard-toggle-button-active' : 'leaderboard-toggle-button-inactive'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => onShowOnlyGrassChange(true)}
            className={`leaderboard-toggle-button ${
              showOnlyGrass ? 'leaderboard-toggle-button-active' : 'leaderboard-toggle-button-inactive'
            }`}
          >
            GRASS
          </button>
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
                        formatAddressOrEns(entry.address, entry.ensName)
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