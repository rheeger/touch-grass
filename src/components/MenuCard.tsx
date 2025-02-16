import '@/styles/menu.css';

interface MenuCardProps {
  onSelectFeed: () => void;
  onSelectHistory: () => void;
  onSelectLeaderboard: () => void;
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
  onBack,
  attestationCount,
  walletAddress,
  onDisconnect,
  onConnect,
  isAuthenticated,
}: MenuCardProps) {
  return (
    <div className="menu-card">
      <div className="menu-header">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="menu-back-button"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <span className="menu-title">MENU</span>
        </div>
        {isAuthenticated ? (
          <div className="menu-wallet">
            <span className="menu-wallet-address">
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connected'}
            </span>
            <button
              onClick={onDisconnect}
              className="menu-wallet-disconnect"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="menu-wallet-connect"
          >
            Connect
          </button>
        )}
      </div>

      <div className="menu-content">

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