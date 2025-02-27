import "@/styles/about.css";
import { resolveEnsName, formatAddressOrEns } from "@/utils/ens";
import { getRegistrationStatus, getRegistrationUrl } from "@/utils/registration";
import { useState, useEffect } from "react";
import Logger from '@/utils/logger';

interface AboutCardProps {
  onConnect: () => void;
  isAuthenticated: boolean;
  walletAddress?: string;
  onDisconnect: () => void;
  onViewChange: (view: 'status' | 'history' | 'feed' | 'leaderboard' | 'about') => void;
}

export function AboutCard({
  onConnect,
  isAuthenticated,
  walletAddress,
  onDisconnect,
  onViewChange,
}: AboutCardProps) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [hasAntedUp, setHasAntedUp] = useState(false);
  const [registrationDate, setRegistrationDate] = useState<Date | undefined>();

  // Add date check logic
  const now = new Date();
  const startDate = new Date('2025-03-01T00:00:00Z');
  const endDate = new Date('2026-01-01T00:00:00Z');
  const isWithinActiveRange = now >= startDate && now < endDate;
  const isPastEndDate = now >= endDate;

  useEffect(() => {
    if (walletAddress) {
      resolveEnsName(walletAddress).then((name) => setEnsName(name));
    } else {
      setEnsName(null);
    }
  }, [walletAddress]);

  // Check if the wallet has registered
  useEffect(() => {
    async function checkRegistration() {
      if (walletAddress && isAuthenticated) {
        try {
          const status = await getRegistrationStatus(walletAddress);
          setHasAntedUp(status.isRegistered);
          setRegistrationDate(status.registrationDate);
          Logger.info('Registration status checked', { 
            walletAddress, 
            status 
          });
        } catch (error) {
          Logger.error('Failed to check registration', { error });
          setHasAntedUp(false);
          setRegistrationDate(undefined);
        }
      } else {
        setHasAntedUp(false);
        setRegistrationDate(undefined);
      }
    }
    checkRegistration();
  }, [walletAddress, isAuthenticated]);

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  return (
    <div className="menu-card">
      <div className="menu-header">
        <div className="flex items-center space-x-4">
          <button onClick={() => onViewChange('status')} className="menu-back-button">
            <span>←</span>
            <span>BACK</span>
          </button>
          <span className="menu-title">ABOUT</span>
        </div>
        <div className="menu-wallet">
          {isAuthenticated ? (
            <>
              <span className="menu-wallet-address">
                {formatAddressOrEns(walletAddress || "", ensName)}
              </span>
              <button onClick={onDisconnect} className="menu-wallet-disconnect">
                LOG OUT
              </button>
            </>
          ) : (
            <button onClick={onConnect} className="menu-wallet-connect">
              LOG IN
            </button>
          )}
        </div>
      </div>

      <div className="menu-content">
        <div className="about-section">
          <div className="about-description space-y-2">
            {/* Step 1: LOG IN */}
            <div className={`about-step ${isAuthenticated ? 'about-step-completed' : 'about-step-current'}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="menu-button-title">STEP 1: LOG IN</h2>
                {isAuthenticated && (
                  <span className="text-green-400">✓</span>
                )}
              </div>
              <p className="menu-button-description mb-4">
                Connect your wallet to join the Touch Grass Club.
              </p>
              {!isAuthenticated && (
                <button
                  onClick={onConnect}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-bold tracking-wide transition-colors"
                >
                  LOG IN WITH WALLET
                </button>
              )}
            </div>

            {/* Step 2: ANTE UP */}
            <div className={`about-step ${hasAntedUp ? 'about-step-completed' : isAuthenticated ? 'about-step-current' : 'about-step-disabled'}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="menu-button-title">STEP 2: ANTE UP BY MARCH 1ST</h2>
                {hasAntedUp && (
                  <span className="text-green-400">✓</span>
                )}
              </div>
              <p className="menu-button-description mb-4">
                {hasAntedUp && registrationDate ? (
                  <>Anted up on {formatDate(registrationDate)}.</>
                ) : (
                  <>Use the same wallet and buy in on commit.wtf for $100 to join the 2025 challenge. Requires USDC on Base.</>
                )}
              </p>
              <button
                onClick={() => window.open(getRegistrationUrl(), "_blank")}
                disabled={hasAntedUp}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold tracking-wide transition-colors ${
                  hasAntedUp
                    ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {hasAntedUp ? 'ANTED UP ✓' : 'ANTE UP $100 USDC'}
              </button>
            </div>

            {/* Step 3: TOUCH GRASS */}
            <div className={`about-step ${hasAntedUp ? 'about-step-current' : 'about-step-disabled'}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="menu-button-title">STEP 3: TOUCH GRASS</h2>
              </div>
              <p className="menu-button-description mb-4">
                Touch grass 10 times between March 1st and the end of the year to win the pot.
              </p>
              <button
                onClick={() => onViewChange('status')}
                disabled={isPastEndDate}
                className={`w-full px-4 py-3 rounded-lg text-sm font-bold tracking-wide transition-colors ${
                  isPastEndDate
                    ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isPastEndDate ? '2025 CHALLENGE ENDED' : isWithinActiveRange ? 'START NOW' : 'PRACTICE TOUCHING GRASS'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
