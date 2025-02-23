import '@/styles/menu.css';
import { useState, useEffect } from 'react';
import { resolveEnsName, formatAddressOrEns } from '@/utils/ens';
import { getRegistrationStatus } from '@/utils/registration';
import { RegistrationWarning } from './RegistrationWarning';
import Logger from '@/utils/logger';

interface MenuCardProps {
  onSelectFeed: () => void;
  onSelectHistory: () => void;
  onSelectLeaderboard: () => void;
  onSelectAbout: () => void;
  onBack: () => void;
  attestationCount: number;
  walletAddress?: string;
  onDisconnect: () => void;
  onConnect: () => void;
  isAuthenticated: boolean;
}

export function MenuCard({
  onSelectFeed,
  onSelectHistory,
  onSelectLeaderboard,
  onSelectAbout,
  onBack,
  attestationCount,
  walletAddress,
  onDisconnect,
  onConnect,
  isAuthenticated,
}: MenuCardProps) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [hasAntedUp, setHasAntedUp] = useState(false);

  useEffect(() => {
    async function fetchEnsName() {
      if (walletAddress) {
        const name = await resolveEnsName(walletAddress);
        setEnsName(name);
      } else {
        setEnsName(null);
      }
    }
    fetchEnsName();
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

  return (
    <div className="menu-card">
      <div className="menu-header">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="menu-back-button"
          >
            <span>←</span>
            <span>BACK</span>
          </button>
          <span className="menu-title">MENU</span>
        </div>
        {isAuthenticated ? (
          <div className="menu-wallet">
            <span className="menu-wallet-address">
              {!hasAntedUp && <RegistrationWarning className="mr-2" />}
              {formatAddressOrEns(walletAddress || '', ensName)}
            </span>
            <button
              onClick={onDisconnect}
              className="menu-wallet-disconnect"
            >
              LOG OUT
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="menu-wallet-connect"
          >
            LOG IN
          </button>
        )}
      </div>

      <div className="menu-content">
        <button
          onClick={onSelectAbout}
          className="menu-button"
        >
          <span className="menu-button-emoji">🌱</span>
          <div className="menu-button-content">
            <div className="menu-button-title">About</div>
            <div className="menu-button-description">
              Learn about the Touch Grass Challenge
            </div>
          </div>
        </button>

        <button
          onClick={onSelectHistory}
          className="menu-button"
        >
          <span className="menu-button-emoji">📖</span>
          <div className="menu-button-content">
            <div className="menu-button-title">History</div>
            <div className="menu-button-description">
              View your {attestationCount > 0 ? attestationCount : 'past'} attestation{attestationCount !== 1 ? 's' : ''}
            </div>
          </div>
        </button>

        <button
          onClick={onSelectFeed}
          className="menu-button"
        >
          <span className="menu-button-emoji">🌎</span>
          <div className="menu-button-content">
            <div className="menu-button-title">Feed</div>
            <div className="menu-button-description">
              See what everyone is up to
            </div>
          </div>
        </button>

        <button
          onClick={onSelectLeaderboard}
          className="menu-button"
        >
          <span className="menu-button-emoji">🏆</span>
          <div className="menu-button-content">
            <div className="menu-button-title">Leaderboard</div>
            <div className="menu-button-description">
              See who touches grass the most
            </div>
          </div>
        </button>
      </div>
    </div>
  );
} 