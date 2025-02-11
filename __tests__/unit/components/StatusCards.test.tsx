import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../setup/test-utils';
import { StatusCards } from '@/components/StatusCards';
import { generateMockAttestation, generateMockLocation } from '../../setup/test-utils';

describe('StatusCards', () => {
  const defaultProps = {
    isLoading: false,
    location: generateMockLocation(),
    isAnalyzing: false,
    isTouchingGrass: false,
    detectionResult: {
      isTouchingGrass: false,
      confidence: 0,
      reasons: ['Not in a park'],
      explanations: {
        positive: [],
        negative: ['You are not in a grassy area'],
      },
    },
    isManualOverride: false,
    onManualOverride: jest.fn(),
    walletAddress: '0x123',
    userEmail: 'test@example.com',
    onDisconnect: jest.fn(),
    onConnect: jest.fn(),
    isAuthenticated: true,
    onCreateAttestation: jest.fn(),
    isCreatingAttestation: false,
    selectedAttestation: null,
    onSelectAttestation: jest.fn(),
    attestations: [generateMockAttestation()],
    isLoadingHistory: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    render(<StatusCards {...defaultProps} isLoading={true} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows grass detection status when not loading', () => {
    render(<StatusCards {...defaultProps} />);
    expect(screen.getByText(/not touching grass/i, { selector: '.text-lg' })).toBeInTheDocument();
  });

  it('shows success state when touching grass', () => {
    render(
      <StatusCards
        {...defaultProps}
        isTouchingGrass={true}
        detectionResult={{
          isTouchingGrass: true,
          confidence: 90,
          reasons: ['In a park'],
          explanations: {
            positive: ['You are in a grassy area'],
            negative: [],
          },
        }}
      />
    );
    expect(screen.getByText(/touching grass/i, { selector: '.text-lg' })).toBeInTheDocument();
    // Check confidence bar width
    const confidenceBar = screen.getByTestId('confidence-bar');
    expect(confidenceBar).toHaveStyle('width: 90%');
  });

  it('handles manual override click', async () => {
    render(<StatusCards {...defaultProps} />);
    
    const overrideButton = screen.getByRole('button', { name: /override/i });
    fireEvent.click(overrideButton);
    
    await waitFor(() => {
      expect(defaultProps.onManualOverride).toHaveBeenCalled();
    });
  });

  it('shows attestation history', () => {
    const mockAttestations = [
      generateMockAttestation({ id: '0x123' as `0x${string}`, isTouchingGrass: true }),
      generateMockAttestation({ id: '0x456' as `0x${string}`, isTouchingGrass: false }),
    ];

    render(
      <StatusCards
        {...defaultProps}
        attestations={mockAttestations}
      />
    );

    const historyButton = screen.getByRole('button', { name: /history/i });
    expect(historyButton).toBeInTheDocument();
    
    // Check for attestation entries in history section
    mockAttestations.forEach(attestation => {
      const status = attestation.isTouchingGrass ? 'Touching Grass' : 'Not Touching Grass';
      expect(screen.getByText(status, { selector: '.text-sm' })).toBeInTheDocument();
    });
  });

  it('handles wallet connection', async () => {
    render(
      <StatusCards
        {...defaultProps}
        isAuthenticated={false}
        walletAddress={undefined}
      />
    );
    
    const connectButton = screen.getByRole('button', { name: /connect/i });
    fireEvent.click(connectButton);
    
    await waitFor(() => {
      expect(defaultProps.onConnect).toHaveBeenCalled();
    });
  });

  it('handles attestation creation', async () => {
    render(
      <StatusCards
        {...defaultProps}
        isTouchingGrass={true}
      />
    );
    
    const attestButton = screen.getByRole('button', { name: /create attestation/i });
    fireEvent.click(attestButton);
    
    await waitFor(() => {
      expect(defaultProps.onCreateAttestation).toHaveBeenCalled();
    });
  });

  it('shows loading state during attestation creation', () => {
    render(
      <StatusCards
        {...defaultProps}
        isCreatingAttestation={true}
      />
    );
    
    expect(screen.getByText('Creating...')).toBeInTheDocument();
  });
}); 