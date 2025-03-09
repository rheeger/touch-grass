// Mock the places module
jest.mock('@/utils/places', () => ({
  analyzePlacesData: jest.fn(),
}));

// Import the mocked module
import { analyzeGrass } from '@/utils/grassDetection';
import { analyzePlacesData } from '@/utils/places';

describe('Grass Detection Utility', () => {
  // Mock Google Maps
  const mockMap = {} as google.maps.Map;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('analyzeGrass', () => {
    it('should return isTouchingGrass=true when in a park and not in a building', async () => {
      // Arrange
      const mockPlacesResult = {
        isInPark: true,
        isInBuilding: false,
        confidence: 85,
        reasons: ['Located in a park'],
        explanations: {
          positive: ['Near grass area'],
          negative: []
        },
        placeTypes: ['park', 'point_of_interest']
      };
      
      (analyzePlacesData as jest.Mock).mockResolvedValue(mockPlacesResult);
      
      // Act
      const result = await analyzeGrass(40.7128, -74.006, mockMap, false);
      
      // Assert
      expect(analyzePlacesData).toHaveBeenCalledWith(40.7128, -74.006, mockMap, false);
      expect(result.isTouchingGrass).toBe(true);
      expect(result.confidence).toBe(85);
      expect(result.reasons).toEqual(['Located in a park']);
      expect(result.explanations.positive).toEqual(['Near grass area']);
      expect(result.explanations.negative).toEqual([]);
      expect(result.debugInfo).toEqual({
        isInPark: true,
        isInBuilding: false,
        placeTypes: ['park', 'point_of_interest']
      });
    });

    it('should return isTouchingGrass=false when in a building', async () => {
      // Arrange
      const mockPlacesResult = {
        isInPark: true,
        isInBuilding: true,
        confidence: 60,
        reasons: ['Located in a building within a park'],
        explanations: {
          positive: ['Near grass area'],
          negative: ['Inside a building']
        },
        placeTypes: ['park', 'building', 'point_of_interest']
      };
      
      (analyzePlacesData as jest.Mock).mockResolvedValue(mockPlacesResult);
      
      // Act
      const result = await analyzeGrass(40.7128, -74.006, mockMap, false);
      
      // Assert
      expect(result.isTouchingGrass).toBe(false);
      expect(result.confidence).toBe(60);
      expect(result.reasons).toEqual(['Located in a building within a park']);
      expect(result.explanations.negative).toContain('Inside a building');
    });

    it('should return isTouchingGrass=false when not in a park', async () => {
      // Arrange
      const mockPlacesResult = {
        isInPark: false,
        isInBuilding: false,
        confidence: 30,
        reasons: ['Not in a park or grass area'],
        explanations: {
          positive: [],
          negative: ['Not in a park']
        },
        placeTypes: ['street', 'point_of_interest']
      };
      
      (analyzePlacesData as jest.Mock).mockResolvedValue(mockPlacesResult);
      
      // Act
      const result = await analyzeGrass(40.7128, -74.006, mockMap, false);
      
      // Assert
      expect(result.isTouchingGrass).toBe(false);
      expect(result.confidence).toBe(30);
      expect(result.explanations.negative).toContain('Not in a park');
    });

    it('should cap confidence at 100', async () => {
      // Arrange
      const mockPlacesResult = {
        isInPark: true,
        isInBuilding: false,
        confidence: 120, // Over 100
        reasons: ['Located in a park'],
        explanations: {
          positive: ['Near grass area'],
          negative: []
        },
        placeTypes: ['park', 'point_of_interest']
      };
      
      (analyzePlacesData as jest.Mock).mockResolvedValue(mockPlacesResult);
      
      // Act
      const result = await analyzeGrass(40.7128, -74.006, mockMap, false);
      
      // Assert
      expect(result.confidence).toBe(100); // Should be capped at 100
    });

    it('should floor confidence at 0', async () => {
      // Arrange
      const mockPlacesResult = {
        isInPark: false,
        isInBuilding: true,
        confidence: -10, // Below 0
        reasons: ['Not in a park'],
        explanations: {
          positive: [],
          negative: ['Inside a building', 'Not in a park']
        },
        placeTypes: ['building', 'point_of_interest']
      };
      
      (analyzePlacesData as jest.Mock).mockResolvedValue(mockPlacesResult);
      
      // Act
      const result = await analyzeGrass(40.7128, -74.006, mockMap, false);
      
      // Assert
      expect(result.confidence).toBe(0); // Should be floored at 0
    });
  });
}); 