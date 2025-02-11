import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { fetch, Request, Response } from 'cross-fetch';
import '@testing-library/jest-dom';

// Add fetch to global
global.fetch = fetch;
global.Request = Request;
global.Response = Response;

// Define map type
interface MockMap {
  setCenter: jest.Mock;
  setZoom: jest.Mock;
  panTo: jest.Mock;
  getMapTypeId: jest.Mock;
  getZoom: jest.Mock;
}

// Mock external providers
jest.mock('@privy-io/react-auth', () => {
  const mockPrivyProvider = ({ children }: { children: React.ReactNode }) => children;
  return {
    usePrivy: () => ({
      login: jest.fn(),
      authenticated: true,
      ready: true,
      logout: jest.fn(),
      user: { email: { address: 'test@example.com' } },
    }),
    useWallets: () => ({
      wallets: [{
        address: '0x123',
        chainId: 1,
        walletClientType: 'privy',
        getEthereumProvider: jest.fn().mockResolvedValue({
          request: jest.fn().mockResolvedValue('0xtxhash'),
        }),
      }],
    }),
    PrivyProvider: mockPrivyProvider,
  };
});

jest.mock('@react-google-maps/api', () => {
  const mockLoadScript = ({ children }: { children: React.ReactNode }) => children;
  const mockGoogleMap = ({ children, onLoad }: { children: React.ReactNode; onLoad?: (map: MockMap) => void }) => {
    if (onLoad) {
      onLoad({
        setCenter: jest.fn(),
        setZoom: jest.fn(),
        panTo: jest.fn(),
        getMapTypeId: jest.fn().mockReturnValue('satellite'),
        getZoom: jest.fn().mockReturnValue(18),
      });
    }
    return <div data-testid="map">{children}</div>;
  };
  const mockMarker = () => null;
  const mockOverlayView = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

  return {
    LoadScript: mockLoadScript,
    GoogleMap: mockGoogleMap,
    Marker: mockMarker,
    OverlayView: mockOverlayView,
  };
});

jest.mock('@/utils/eas', () => ({
  prepareGrassAttestation: jest.fn().mockResolvedValue({
    to: '0x123',
    data: '0x456',
  }),
  getAttestations: jest.fn().mockResolvedValue([{
    id: '0x123',
    lat: 40.7128,
    lon: -74.0060,
    isTouchingGrass: true,
    timestamp: new Date(),
    txHash: '0x123',
    attester: '0x123',
    recipient: '0x456',
  }]),
}));

jest.mock('@/utils/places', () => ({
  analyzePlacesData: jest.fn().mockResolvedValue({
    isInPark: true,
    isInBuilding: false,
    confidence: 90,
    reasons: ['In a park'],
    explanations: {
      positive: ['You are in a grassy area'],
      negative: [],
    },
    placeTypes: ['park'],
  }),
}));

jest.mock('@/utils/paymaster', () => ({
  createSmartAccountForEmail: jest.fn().mockResolvedValue({
    address: '0x123',
    chainId: 1,
  }),
  sendSponsoredTransaction: jest.fn().mockResolvedValue('0xtxhash'),
}));

// Mock canvas-confetti
jest.mock('canvas-confetti', () => jest.fn());

// Test data generators
export const generateMockAttestation = (overrides = {}) => ({
  id: '0x123' as `0x${string}`,
  lat: 40.7128,
  lon: -74.0060,
  isTouchingGrass: true,
  timestamp: new Date(),
  txHash: '0x123' as `0x${string}`,
  attester: '0x123' as `0x${string}`,
  recipient: '0x456' as `0x${string}`,
  ...overrides,
});

export const generateMockLocation = (overrides = {}) => ({
  lat: 40.7128,
  lng: -74.0060,
  ...overrides,
});

// Mock responses
export const mockPlacesResponse = {
  geometry: {
    location: {
      lat: () => 40.7128,
      lng: () => -74.0060,
    },
  },
  types: ['park'],
  name: 'Central Park',
};

// Helper functions
export const waitForMapLoad = () => new Promise((resolve) => {
  setTimeout(resolve, 0);
});

export const mockGeolocationPosition = {
  coords: {
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 10,
  },
  timestamp: Date.now(),
};

// Wrapper component with all providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  );
};

// Custom render function
function render(ui: React.ReactElement, options = {}) {
  return rtlRender(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { render };

describe('test-utils', () => {
  it('should provide working render function', () => {
    const TestComponent = () => <div>Test</div>;
    const { getByText } = render(<TestComponent />);
    expect(getByText('Test')).toBeInTheDocument();
  });
}); 