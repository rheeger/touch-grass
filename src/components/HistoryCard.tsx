import { type Attestation } from '@/utils/attestations';
import { ListCard } from './ListCard';

interface HistoryCardProps {
  onSelectAttestation: (attestation: Attestation) => void;
  selectedAttestation: Attestation | null;
  attestations: Attestation[];
  currentLocation: { lat: number; lng: number } | null;
  onBack: () => void;
  isLoadingHistory: boolean;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
  isAuthenticated: boolean;
  onConnect: () => void;
}

export function HistoryCard(props: HistoryCardProps) {
  return (
    <ListCard
      {...props}
      title="HISTORY"
      isLoadingList={props.isLoadingHistory}
    />
  );
} 