// Mock the outdoors service
jest.mock('@/services/outdoors/detection', () => ({
  detectOutdoorLocation: jest.fn(),
}));

// Import the mocked module and types
import { analyzeGrass, SpaceCategory } from '@/services/outdoors';
import { detectOutdoorLocation } from '@/services/outdoors/detection';

describe('Grass Detection Service', () => {
  // Mock Google Maps
  const mockMap = {} as google.maps.Map;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('analyzeGrass', () => {
    it('should return isTouchingGrass=true when in a natural area', async () => {
      // Arrange
      const mockOutdoorResult = {
        isOutdoors: true,
        spaceCategory: SpaceCategory.NATURAL_AREA,
        confidence: 85,
        reasons: ['Located in a natural area'],
        explanations: {
          positive: ['Near grass area'],
          negative: []
        },
        debugInfo: {
          isBuilding: false,
          placeTypes: ['park', 'point_of_interest']
        }
      };
      
      (detectOutdoorLocation as jest.Mock).mockResolvedValue(mockOutdoorResult);
      
      // Act
      const result = await analyzeGrass(40.7128, -74.006, mockMap, false);
      
      // Assert
      expect(detectOutdoorLocation).toHaveBeenCalledWith(
        { lat: 40.7128, lng: -74.006 },
        mockMap,
        { isManualOverride: false }
      );
      expect(result.isTouchingGrass).toBe(true);
      expect(result.confidence).toBe(85);
      expect(result.reasons).toEqual(['Located in a natural area']);
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
      const mockOutdoorResult = {
        isOutdoors: false,
        spaceCategory: SpaceCategory.INDOOR,
        confidence: 60,
        reasons: ['Located in a building'],
        explanations: {
          positive: [],
          negative: ['Inside a building']
        },
        debugInfo: {
          isBuilding: true,
          placeTypes: ['building', 'point_of_interest']
        }
      };
      
      (detectOutdoorLocation as jest.Mock).mockResolvedValue(mockOutdoorResult);
      
      // Act
      const result = await analyzeGrass(40.7128, -74.006, mockMap, false);
      
      // Assert
      expect(result.isTouchingGrass).toBe(false);
      expect(result.confidence).toBe(60);
      expect(result.explanations.negative).toContain('Inside a building');
    });

    it('should return isTouchingGrass=false when in an urban area', async () => {
      // Arrange
      const mockOutdoorResult = {
        isOutdoors: true,
        spaceCategory: SpaceCategory.URBAN,
        confidence: 70,
        reasons: ['Located in an urban area'],
        explanations: {
          positive: ['Outdoors'],
          negative: ['Urban environment']
        },
        debugInfo: {
          isBuilding: false,
          placeTypes: ['street', 'point_of_interest']
        }
      };
      
      (detectOutdoorLocation as jest.Mock).mockResolvedValue(mockOutdoorResult);
      
      // Act
      const result = await analyzeGrass(40.7128, -74.006, mockMap, false);
      
      // Assert
      expect(result.isTouchingGrass).toBe(false);
      expect(result.confidence).toBe(70);
    });

    it('should handle manual override', async () => {
      // Arrange
      const mockOutdoorResult = {
        isOutdoors: true,
        spaceCategory: SpaceCategory.NATURAL_AREA,
        confidence: 100,
        reasons: ['Manual override enabled'],
        explanations: {
          positive: ['You\'ve overridden outdoor detection.'],
          negative: []
        },
        debugInfo: {
          manualOverride: true
        }
      };
      
      (detectOutdoorLocation as jest.Mock).mockResolvedValue(mockOutdoorResult);
      
      // Act
      const result = await analyzeGrass(40.7128, -74.006, mockMap, true);
      
      // Assert
      expect(detectOutdoorLocation).toHaveBeenCalledWith(
        { lat: 40.7128, lng: -74.006 },
        mockMap,
        { isManualOverride: true }
      );
      expect(result.isTouchingGrass).toBe(true);
      expect(result.confidence).toBe(100);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      (detectOutdoorLocation as jest.Mock).mockRejectedValue(new Error('API failure'));
      
      // Act
      const result = await analyzeGrass(40.7128, -74.006, mockMap, false);
      
      // Assert
      expect(result.isTouchingGrass).toBe(false);
      expect(result.confidence).toBe(20);
      expect(result.reasons).toContain('Detection failed');
      expect(result.reasons).toContain('API failure');
    });
  });
}); 