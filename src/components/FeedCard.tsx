import { useState, useEffect } from 'react';
import { ListCard } from './ListCard';
import { type Attestation } from '@/utils/attestations';
import { FilterDropdown } from './FilterDropdown';

export interface FeedCardProps {
  attestations: Attestation[];
  currentLocation: { lat: number; lng: number } | null;
  onSelectAttestation: (attestation: Attestation | null) => void;
  selectedAttestation: Attestation | null;
  onBack: () => void;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
  selectedUser: `0x${string}` | null;
  onUserSelect: (address: `0x${string}` | null) => void;
  isAuthenticated: boolean;
  userAddress: `0x${string}` | undefined;
  initialMediaFilter?: "all" | "1.0" | "0.1";
  initialShowJustMe?: boolean;
  onFilterUpdate?: (options: {
    showOnlyGrass: boolean;
    showJustMe: boolean;
    mediaFilter: "all" | "1.0" | "0.1";
  }) => void;
}

export function FeedCard(props: FeedCardProps) {
  const [showJustMe, setShowJustMe] = useState(props.initialShowJustMe || false);
  const [mediaFilter, setMediaFilter] = useState<"all" | "1.0" | "0.1">(props.initialMediaFilter || "all");
  
  useEffect(() => {
    if (props.initialMediaFilter !== undefined) {
      setMediaFilter(props.initialMediaFilter);
    }
    if (props.initialShowJustMe !== undefined) {
      setShowJustMe(props.initialShowJustMe);
    }
  }, [props.initialMediaFilter, props.initialShowJustMe]);
  
  const filteredAttestations = props.attestations.filter(attestation => {
    const passesGrassFilter = !props.showOnlyGrass || attestation.isTouchingGrass;
    
    let passesJustMeFilter = true;
    
    if (showJustMe) {
      passesJustMeFilter = props.isAuthenticated && 
                           props.userAddress != null && 
                           attestation.attester.toLowerCase() === props.userAddress.toLowerCase();
    }
    
    const passesMediaFilter = mediaFilter === "all" || attestation.mediaVersion === mediaFilter;
    
    return passesGrassFilter && passesJustMeFilter && passesMediaFilter;
  });

  const handleFilterChange = (newOptions: {
    showOnlyGrass: boolean;
    showJustMe: boolean;
    mediaFilter: "all" | "1.0" | "0.1";
  }) => {
    setShowJustMe(newOptions.showJustMe);
    setMediaFilter(newOptions.mediaFilter);
    
    props.onShowOnlyGrassChange(newOptions.showOnlyGrass);
    
    if (props.onFilterUpdate) {
      props.onFilterUpdate(newOptions);
    }
  };

  const renderCustomHeader = () => (
    <div className="list-header">
      <div className="flex items-center justify-between w-full">
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
        
        <FilterDropdown 
          options={{
            showOnlyGrass: props.showOnlyGrass,
            showJustMe: showJustMe,
            mediaFilter: mediaFilter
          }}
          onChange={handleFilterChange}
          isAuthenticated={props.isAuthenticated}
        />
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