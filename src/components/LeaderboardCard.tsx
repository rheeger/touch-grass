import { type Attestation } from '@/utils/attestations';
import { useState, useEffect } from 'react';
import '@/styles/leaderboard.css';

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

  useEffect(() => {
    // Calculate leaderboard data
    const userStats = attestations.reduce((acc, attestation) => {
      const address = attestation.attester;
      if (!acc[address]) {
        acc[address] = {
          address,
          totalCount: 0,
          grassCount: 0,
        };
      }
      acc[address].totalCount++;
      if (attestation.isTouchingGrass) {
        acc[address].grassCount++;
      }
      return acc;
    }, {} as Record<string, LeaderboardEntry>);

    // Convert to array and sort
    const sortedLeaderboard = Object.values(userStats).sort((a, b) => {
      const aCount = showOnlyGrass ? a.grassCount : a.totalCount;
      const bCount = showOnlyGrass ? b.grassCount : b.totalCount;
      return bCount - aCount;
    });

    setLeaderboard(sortedLeaderboard);
  }, [attestations, showOnlyGrass]);

  // Generate placeholder entries if needed
  const displayEntries = [...Array(LEADERBOARD_SIZE)].map((_, index) => {
    if (index < leaderboard.length) {
      return leaderboard[index];
    }
    return {
      address: '0x0000000000000000000000000000000000000000',
      totalCount: 0,
      grassCount: 0,
      isPlaceholder: true,
    };
  });

  const handleUserClick = (entry: LeaderboardEntry) => {
    if (!entry.isPlaceholder) {
      if (selectedUser === entry.address) {
        // If clicking the same user, deselect them
        onUserSelect(null);
      } else {
        // Select the new user
        onUserSelect(entry.address);
      }
    }
  };

  return (
    <div className="leaderboard-card">
      <div className="leaderboard-header">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="leaderboard-back-button"
          >
            <span>←</span>
            <span>Back</span>
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
                        `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`
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