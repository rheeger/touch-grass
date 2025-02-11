import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { server } from '../mocks/server';
import { fetch, Request, Response } from 'cross-fetch';

// Add fetch to global
global.fetch = fetch;
global.Request = Request;
global.Response = Response;

// Mock window.google.maps
const mockGoogle = {
  maps: {
    Map: jest.fn().mockImplementation(() => ({
      setCenter: jest.fn(),
      setZoom: jest.fn(),
      panTo: jest.fn(),
      getMapTypeId: jest.fn().mockReturnValue('satellite'),
      getZoom: jest.fn().mockReturnValue(18),
    })),
    Marker: jest.fn(),
    LatLng: jest.fn(),
    places: {
      PlacesService: jest.fn().mockImplementation(() => ({
        nearbySearch: jest.fn((request, callback) => {
          callback([{
            geometry: {
              location: {
                lat: () => 40.7128,
                lng: () => -74.0060,
              },
            },
            types: ['park'],
            name: 'Central Park',
          }], 'OK');
        }),
      })),
      PlacesServiceStatus: {
        OK: 'OK',
        ZERO_RESULTS: 'ZERO_RESULTS',
        ERROR: 'ERROR',
      },
    },
  },
};

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

// Setup global mocks
Object.defineProperty(global, 'google', { value: mockGoogle });
Object.defineProperty(global.navigator, 'geolocation', { value: mockGeolocation });

// Mock TextEncoder/TextDecoder for viem
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('jest setup', () => {
  it('should have working google maps mock', () => {
    expect(global.google.maps.Map).toBeDefined();
    const map = new global.google.maps.Map(document.createElement('div'));
    expect(map.setCenter).toBeDefined();
  });

  it('should have working geolocation mock', () => {
    expect(global.navigator.geolocation.getCurrentPosition).toBeDefined();
  });
}); 