// Mock dependencies
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = jest.fn();

// Import the module
import {
  getLocationPreference,
  setLocationPreference,
  getLocationFromIp,
} from '@/utils/location';

describe('Location Utility', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Mock fetch to return a successful response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        latitude: 40.7128,
        longitude: -74.006,
      }),
    });
  });

  describe('getLocationPreference', () => {
    it('should return the stored location preference', () => {
      // Arrange
      localStorageMock.setItem('location_preference_status', 'precise');
      
      // Act
      const result = getLocationPreference();
      
      // Assert
      expect(result).toBe('precise');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('location_preference_status');
    });

    it('should return undefined if no preference is stored', () => {
      // Act
      const result = getLocationPreference();
      
      // Assert
      expect(result).toBeNull();
    });
  });

  describe('setLocationPreference', () => {
    it('should store the location preference', () => {
      // Act
      setLocationPreference('precise');
      
      // Assert
      expect(localStorageMock.setItem).toHaveBeenCalledWith('location_preference_status', 'precise');
    });

    it('should remove the preference when undefined is passed', () => {
      // Act
      setLocationPreference(undefined);
      
      // Assert
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('location_preference_status');
    });
  });

  describe('getLocationFromIp', () => {
    it('should fetch location from IP and return coordinates', async () => {
      // Act
      const result = await getLocationFromIp();
      
      // Assert
      expect(global.fetch).toHaveBeenCalledWith('https://ipapi.co/json/');
      expect(result).toEqual({
        lat: 40.7128,
        lng: -74.006,
        isPrecise: false,
      });
    });

    it('should throw an error if the fetch fails', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });
      
      // Act & Assert
      await expect(getLocationFromIp()).rejects.toThrow('IP Geolocation failed: Not Found');
    });

    it('should throw an error if the response is missing coordinates', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          // Missing latitude and longitude
          ip: '192.168.1.1',
        }),
      });
      
      // Act & Assert
      await expect(getLocationFromIp()).rejects.toThrow('Invalid location data from IP geolocation');
    });
  });
}); 