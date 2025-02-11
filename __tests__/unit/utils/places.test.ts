import { analyzePlacesData } from '@/utils/places';

describe('places utility', () => {
  let mockMap: google.maps.Map;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock map instance
    mockMap = new google.maps.Map(document.createElement('div'));
  });

  describe('analyzePlacesData', () => {
    it('should detect grass when location is in a park', async () => {
      const lat = 40.7128;
      const lng = -74.0060;
      const isManualOverride = false;

      // Mock Places Service with park response
      const mockPlacesService = {
        nearbySearch: jest.fn((request, callback) => {
          if (request.type === 'park') {
            callback([{
              geometry: {
                location: {
                  lat: () => lat,
                  lng: () => lng,
                },
              },
              types: ['park', 'point_of_interest', 'establishment'],
              name: 'Central Park',
              vicinity: 'New York',
              place_id: 'mock_place_id',
              rating: 4.5,
            }], google.maps.places.PlacesServiceStatus.OK);
          } else {
            callback([], google.maps.places.PlacesServiceStatus.ZERO_RESULTS);
          }
        }),
      };
      
      // @ts-expect-error - Mock implementation of PlacesService
      google.maps.places.PlacesService = jest.fn(() => mockPlacesService);

      const result = await analyzePlacesData(lat, lng, mockMap, isManualOverride);

      expect(result.isInPark).toBe(true);
      expect(result.isInBuilding).toBe(false);
      expect(result.confidence).toBeGreaterThan(50);
      expect(result.explanations.positive).toContain("You're at Central Park.");
    });

    it('should handle API errors gracefully', async () => {
      const lat = 40.7128;
      const lng = -74.0060;
      const isManualOverride = false;

      // Mock API error for all requests
      const mockErrorPlacesService = {
        nearbySearch: jest.fn((request, callback) => {
          // Return ZERO_RESULTS for all types of searches (park, campground, establishment)
          callback([], google.maps.places.PlacesServiceStatus.ZERO_RESULTS);
        }),
        getDetails: jest.fn((request, callback) => {
          callback(null, google.maps.places.PlacesServiceStatus.ZERO_RESULTS);
        }),
      };
      
      // @ts-expect-error - Mock implementation of PlacesService
      google.maps.places.PlacesService = jest.fn(() => mockErrorPlacesService);

      // Mock map type and zoom for satellite view check
      mockMap.getMapTypeId = jest.fn().mockReturnValue('roadmap'); // Not satellite view
      mockMap.getZoom = jest.fn().mockReturnValue(18);

      const result = await analyzePlacesData(lat, lng, mockMap, isManualOverride);

      expect(result.isInPark).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.explanations.negative).toContain("We can't confirm you're in a grassy area.");
    });

    it('should respect manual override', async () => {
      const lat = 40.7128;
      const lng = -74.0060;
      const isManualOverride = true;

      const result = await analyzePlacesData(lat, lng, mockMap, isManualOverride);

      expect(result.isInPark).toBe(true);
      expect(result.confidence).toBe(100);
      expect(result.explanations.positive).toContain("You've confirmed you're touching grass at this location.");
    });
  });
}); 