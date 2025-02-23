import { type Attestation } from '@/utils/attestations';
import { ListCard } from './ListCard';

interface FeedCardProps {
  attestations: Attestation[];
  currentLocation: { lat: number; lng: number } | null;
  onSelectAttestation: (attestation: Attestation) => void;
  selectedAttestation: Attestation | null;
  onBack: () => void;
  showOnlyGrass: boolean;
  onShowOnlyGrassChange: (showOnlyGrass: boolean) => void;
}

export function FeedCard(props: FeedCardProps) {
  return (
    <ListCard
      {...props}
      title="FEED"
      showAttesterInfo={true}
    />
  );
} 