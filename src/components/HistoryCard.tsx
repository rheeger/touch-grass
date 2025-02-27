import { type Attestation } from '@/utils/attestations';
import { ListCard } from './ListCard';

interface HistoryCardProps {
  attestations: Attestation[];
  onSelectAttestation: (attestation: Attestation | null) => void;
  selectedAttestation: Attestation | null;
  currentLocation: { lat: number; lng: number } | null;
  onBack: () => void;
  isLoadingHistory: boolean;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
  isAuthenticated: boolean;
  onConnect: () => void;
  onViewChange: (view: 'status' | 'history' | 'feed' | 'leaderboard' | 'about') => void;
}

export function HistoryCard(props: HistoryCardProps) {
  return (
    <ListCard
      {...props}
      title="HISTORY"
      isLoadingList={props.isLoadingHistory}
      onBack={() => props.onViewChange('status')}
    />
  );
} 