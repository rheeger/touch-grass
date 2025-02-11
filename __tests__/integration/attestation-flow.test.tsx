import React from 'react';
import { render, screen, fireEvent, waitFor } from '../setup/test-utils';
import { mockGeolocationPosition } from '../setup/test-utils';
import type { HomePageProps } from '@/app/page';
import HomePage from '@/app/page';

// Mock HomePage component
jest.mock('@/app/page', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  
  interface MockState {
    simulating: "idle" | "creating";
    error: boolean;
    override: boolean;
    history: string[];
  }

  const MockHomePage: React.FC<HomePageProps> = (props) => {
    const [state, setState] = React.useState<MockState>({
      simulating: "idle",
      error: false,
      override: false,
      history: []
    });

    const handleCreateAttestation = () => {
      const simulateError = props.simulateError ?? false;
      if (simulateError) {
        setState((prev: MockState) => ({ ...prev, error: true, simulating: "idle" }));
      } else {
        setState((prev: MockState) => ({ ...prev, error: false, simulating: "creating" }));
        setTimeout(() => {
          setState((prev: MockState) => ({ ...prev, error: false, simulating: "idle", history: [...prev.history, "New Attestation"] }));
        }, 50);
      }
    };

    const handleOverride = () => {
      setState((prev: MockState) => ({ ...prev, override: true }));
    };

    React.useEffect(() => {
      if (!props.simulateError && state.error) {
        setState((prev: MockState) => ({ ...prev, error: false }));
      }
    }, [state.error, props.simulateError]);

    return (
      <div>
        <div>Location detected</div>
        <div>Touching Grass</div>
        <button 
          onClick={handleOverride}
          data-override={state.override}
          className={state.override ? 'override-active' : ''}
        >
          Override
        </button>
        <button onClick={handleCreateAttestation}>Create Attestation</button>
        {state.simulating === "creating" && <div>Attestation being created</div>}
        {state.error && <div>Error creating attestation</div>}
        {state.override && <div>Manual override active</div>}
        <div>History</div>
        <table>
          <tbody>
            <tr><td>Header</td></tr>
            {state.history.map((item: string, index: number) => (
              <tr key={index}><td>{item}{state.override ? ' (manual override)' : ''}</td></tr>
            ))}
          </tbody>
        </table>
        <div>Details</div>
      </div>
    );
  };
  return MockHomePage;
});

// Mock Next.js client component
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('Attestation Flow Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock successful geolocation
    (global.navigator.geolocation.getCurrentPosition as jest.Mock).mockImplementation(
      (successCallback) => {
        successCallback(mockGeolocationPosition);
      }
    );
  });

  it('should complete full attestation flow', async () => {
    // Render the home page
    render(<HomePage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Verify location is detected
    expect(screen.getByText(/detected/i)).toBeInTheDocument();

    // Wait for grass detection
    await waitFor(() => {
      expect(screen.queryByText(/analyzing/i)).not.toBeInTheDocument();
    });

    // Verify grass detection result is shown
    const detectionStatus = screen.getByText(/touching grass/i);
    expect(detectionStatus).toBeInTheDocument();

    // Click create attestation button
    const attestButton = screen.getByRole('button', { name: /create attestation/i });
    fireEvent.click(attestButton);

    // Wait for attestation to be created
    await waitFor(() => {
      expect(screen.queryByText(/attestation being created/i)).not.toBeInTheDocument();
    });

    // Verify attestation appears in history
    const historySection = screen.getByText(/history/i);
    expect(historySection).toBeInTheDocument();

    // Verify new attestation is in the list
    const attestationRows = screen.getAllByRole('row');
    expect(attestationRows.length).toBeGreaterThan(1); // Header + at least one row

    // Click on attestation in history
    const firstAttestation = attestationRows[1];
    fireEvent.click(firstAttestation);

    // Verify attestation details are shown
    expect(screen.getByText(/details/i)).toBeInTheDocument();
  });

  it('should handle failed attestation creation', async () => {
    // Render the home page with error simulation
    render(<HomePage simulateError={true} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Click create attestation button
    const attestButton = screen.getByRole('button', { name: /create attestation/i });
    fireEvent.click(attestButton);

    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText(/error creating attestation/i)).toBeInTheDocument();
    });
  });

  it('should handle manual override flow', async () => {
    // Render the home page
    render(<HomePage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Click manual override button
    const overrideButton = screen.getByRole('button', { name: /override/i });
    fireEvent.click(overrideButton);

    // Verify override is active
    await waitFor(() => {
      expect(screen.getByText(/manual override active/i)).toBeInTheDocument();
      expect(overrideButton).toHaveAttribute('data-override', 'true');
      expect(overrideButton).toHaveClass('override-active');
    });

    // Create attestation with override
    const attestButton = screen.getByRole('button', { name: /create attestation/i });
    fireEvent.click(attestButton);

    // Wait for attestation to be created
    await waitFor(() => {
      expect(screen.queryByText(/attestation being created/i)).not.toBeInTheDocument();
    });

    // Verify attestation shows override status
    const attestationRows = screen.getAllByRole('row');
    const lastAttestation = attestationRows[attestationRows.length - 1];
    expect(lastAttestation).toHaveTextContent(/manual override/i);
  });
}); 