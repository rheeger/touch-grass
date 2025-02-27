import { type Attestation } from '@/utils/attestations';
import { ListCard } from './ListCard';
import { useState } from 'react';

interface FeedCardProps {
  attestations: Attestation[];
  currentLocation: { lat: number; lng: number } | null;
  onSelectAttestation: (attestation: Attestation | null) => void;
  selectedAttestation: Attestation | null;
  onBack: () => void;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
  selectedUser: string | null;
  onUserSelect: (address: string | null) => void;
  isAuthenticated: boolean;
  userAddress?: string | null;
}

export function FeedCard(props: FeedCardProps) {
  const [showJustMe, setShowJustMe] = useState(false);
  
  // Filter attestations based on both filters
  const filteredAttestations = props.attestations.filter(attestation => {
    // Apply grass filter if enabled
    const passesGrassFilter = !props.showOnlyGrass || attestation.isTouchingGrass;
    
    // Apply "JUST ME" filter if enabled and user is authenticated
    let passesJustMeFilter = true;
    
    if (showJustMe) {
      // When JUST ME is enabled, only show attestations where the user is the attester
      passesJustMeFilter = props.isAuthenticated && 
                           props.userAddress != null && 
                           attestation.attester.toLowerCase() === props.userAddress.toLowerCase();
    }
    
    return passesGrassFilter && passesJustMeFilter;
  });

  // Custom render function for the ListCard header to add the JUST ME button
  const renderCustomHeader = () => (
    <div className="list-header">
      <div className="flex items-center space-x-4">
        <button
          onClick={props.onBack}
          className="list-back-button"
        >
          <span>←</span>
          <span>BACK</span>
        </button>
        <span className="list-title">FEED</span>
      </div>
      <div className="view-toggle">
        <button
          onClick={() => props.onShowOnlyGrassChange(false)}
          className={`view-toggle-button ${
            !props.showOnlyGrass ? 'view-toggle-button-active' : 'view-toggle-button-inactive'
          }`}
        >
          ALL
        </button>
        <button
          onClick={() => props.onShowOnlyGrassChange(true)}
          className={`view-toggle-button ${
            props.showOnlyGrass ? 'view-toggle-button-active' : 'view-toggle-button-inactive'
          }`}
        >
          GRASS
        </button>
        <button
          onClick={() => setShowJustMe(!showJustMe)}
          className={`view-toggle-button ${
            showJustMe ? 'view-toggle-button-active' : 'view-toggle-button-inactive'
          }`}
          disabled={!props.isAuthenticated}
          title={!props.isAuthenticated ? "Log in to see your past attestation history." : ""}
        >
          JUST ME
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <ListCard
        {...props}
        attestations={filteredAttestations}
        title="FEED"
        showAttesterInfo={true}
        customHeader={renderCustomHeader()}
      />
    </div>
  );
} 