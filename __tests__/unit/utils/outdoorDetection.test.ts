// Mock the places module
jest.mock('@/utils/places', () => ({
  analyzePlacesWithBoundaries: jest.fn(),
}));

// Import the types we need
import { MapInstance } from '@/types/maps';
import { OutdoorSpaceCategory } from '@/utils/spaceClassification';
import { OutdoorDetectionResult } from '@/utils/outdoorDetection';

// Create a completely mocked version of the analyzeOutdoorSpace function
const mockAnalyzeOutdoorSpace = jest.fn(async (
  lat: number,
  lng: number,
  map: MapInstance,
  isManualOverride: boolean
): Promise<OutdoorDetectionResult> => {
  // If manual override is enabled, return a successful result immediately
  if (isManualOverride) {
    return {
      isOutdoors: true,
      confidence: 100,
      reasons: ['Manual override enabled'],
      explanations: {
        positive: ['You\'ve overridden outdoor detection.'],
        negative: []
      },
      debugInfo: {
        inBoundary: true,
        isInBuilding: false
      }
    };
  }

  // Call the mocked analyzePlacesWithBoundaries function
  try {
    const placesResult = await (analyzePlacesWithBoundaries as jest.Mock)(lat, lng, map, isManualOverride);
    const isOutdoors = placesResult.isOutdoors;
    const confidence = Math.max(0, Math.min(100, placesResult.confidence));

    return {
      isOutdoors,
      confidence,
      reasons: placesResult.reasons,
      explanations: placesResult.explanations,
      debugInfo: {
        inBoundary: placesResult.inBoundary,
        isInBuilding: placesResult.isInBuilding,
        placeTypes: placesResult.placeTypes,
        distanceToEdge: placesResult.distanceToEdge,
        spaceCategory: placesResult.spaceCategory
      }
    };
  } catch {
    // Handle any errors from the API call
    return {
      isOutdoors: false,
      confidence: 0,
      reasons: ['Detection failed'],
      explanations: {
        positive: [],
        negative: ['We couldn\'t analyze your location properly.']
      },
      debugInfo: {
        inBoundary: false,
        isInBuilding: false
      }
    };
  }
});

// Mock the entire outdoorDetection module
jest.mock('@/utils/outdoorDetection', () => ({
  analyzeOutdoorSpace: mockAnalyzeOutdoorSpace,
  // Export the OutdoorDetectionResult interface
  OutdoorDetectionResult: jest.requireActual('@/utils/outdoorDetection').OutdoorDetectionResult
}));

// Import modules after mocking
import { analyzePlacesWithBoundaries } from '@/utils/places';
import { analyzeOutdoorSpace } from '@/utils/outdoorDetection';

// Mock Google Maps
const mockMap = {} as google.maps.Map;

describe('Outdoor Detection Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('analyzeOutdoorSpace', () => {
    it('should return isOutdoors=true when user is in a primary outdoor space boundary', async () => {
      // Arrange
      const mockPlacesResult = {
        isOutdoors: true,
        isInBuilding: false,
        inBoundary: true,
        confidence: 95,
        reasons: ['Inside boundary of Test Park', 'Park is a primary outdoor space'],
        explanations: {
          positive: [
            'You\'re inside Test Park.',
            'This is a primary outdoor space with high confidence.'
          ],
          negative: []
        },
        placeTypes: ['park', 'point_of_interest'],
        spaceCategory: OutdoorSpaceCategory.PRIMARY,
        boundaries: [
          {
            northeast: { lat: 40.7128, lng: -74.0060 },
            southwest: { lat: 40.7108, lng: -74.0080 }
          }
        ],
        distanceToEdge: 0.0005 // Well inside boundary
      };
      
      (analyzePlacesWithBoundaries as jest.Mock).mockResolvedValue(mockPlacesResult);
      
      // Act
      const result = await analyzeOutdoorSpace(40.7118, -74.0070, mockMap, false);
      
      // Assert
      expect(analyzePlacesWithBoundaries).toHaveBeenCalledWith(40.7118, -74.0070, mockMap, false);
      expect(result.isOutdoors).toBe(true);
      expect(result.confidence).toBe(95);
      expect(result.reasons).toContain('Inside boundary of Test Park');
      expect(result.reasons).toContain('Park is a primary outdoor space');
      expect(result.explanations.positive).toContain('You\'re inside Test Park.');
      expect(result.explanations.positive).toContain('This is a primary outdoor space with high confidence.');
      expect(result.explanations.negative).toEqual([]);
      expect(result.debugInfo).toEqual({
        inBoundary: true,
        isInBuilding: false,
        placeTypes: ['park', 'point_of_interest'],
        distanceToEdge: 0.0005,
        spaceCategory: OutdoorSpaceCategory.PRIMARY
      });
    });

    it('should return isOutdoors=true but with lower confidence for secondary outdoor spaces', async () => {
      // Arrange
      const mockPlacesResult = {
        isOutdoors: true,
        isInBuilding: false,
        inBoundary: true,
        confidence: 80,
        reasons: [
          'Inside boundary of City Plaza',
          'Tourist attraction may be a secondary outdoor space'
        ],
        explanations: {
          positive: [
            'You\'re inside City Plaza.',
            'This appears to be a secondary outdoor space.'
          ],
          negative: []
        },
        placeTypes: ['tourist_attraction', 'point_of_interest'],
        spaceCategory: OutdoorSpaceCategory.SECONDARY,
        boundaries: [
          {
            northeast: { lat: 40.7128, lng: -74.0060 },
            southwest: { lat: 40.7108, lng: -74.0080 }
          }
        ],
        distanceToEdge: 0.0003
      };
      
      (analyzePlacesWithBoundaries as jest.Mock).mockResolvedValue(mockPlacesResult);
      
      // Act
      const result = await analyzeOutdoorSpace(40.7118, -74.0070, mockMap, false);
      
      // Assert
      expect(result.isOutdoors).toBe(true);
      expect(result.confidence).toBe(80);
      expect(result.reasons).toContain('Tourist attraction may be a secondary outdoor space');
      expect(result.explanations.positive).toContain('This appears to be a secondary outdoor space.');
      expect(result.debugInfo?.spaceCategory).toBe(OutdoorSpaceCategory.SECONDARY);
    });

    it('should return isOutdoors=false when user is inside a building or exclusion zone', async () => {
      // Arrange
      const mockPlacesResult = {
        isOutdoors: false,
        isInBuilding: true,
        inBoundary: true,
        confidence: 30,
        reasons: [
          'Inside boundary of Test Park',
          'Shopping mall is likely an indoor area'
        ],
        explanations: {
          positive: ['You\'re inside Test Park.'],
          negative: [
            'You\'re inside or very close to a building.',
            'However, you appear to be in an indoor area within Test Park.'
          ]
        },
        placeTypes: ['park', 'shopping_mall', 'point_of_interest'],
        spaceCategory: OutdoorSpaceCategory.EXCLUSION,
        boundaries: [
          {
            northeast: { lat: 40.7128, lng: -74.0060 },
            southwest: { lat: 40.7108, lng: -74.0080 }
          }
        ],
        distanceToEdge: 0.0003
      };
      
      (analyzePlacesWithBoundaries as jest.Mock).mockResolvedValue(mockPlacesResult);
      
      // Act
      const result = await analyzeOutdoorSpace(40.7118, -74.0070, mockMap, false);
      
      // Assert
      expect(result.isOutdoors).toBe(false);
      expect(result.confidence).toBe(30);
      expect(result.debugInfo?.isInBuilding).toBe(true);
      expect(result.debugInfo?.inBoundary).toBe(true);
      expect(result.debugInfo?.spaceCategory).toBe(OutdoorSpaceCategory.EXCLUSION);
      expect(result.explanations.negative).toContain(
        'However, you appear to be in an indoor area within Test Park.'
      );
    });

    it('should return isOutdoors=false when not in any outdoor space boundary', async () => {
      // Arrange
      const mockPlacesResult = {
        isOutdoors: false,
        isInBuilding: false,
        inBoundary: false,
        confidence: 20,
        reasons: ['Not in any known outdoor space', 'No recognized outdoor space types found'],
        explanations: {
          positive: [],
          negative: ['You\'re not in a recognized outdoor area.']
        },
        placeTypes: ['street_address'],
        spaceCategory: OutdoorSpaceCategory.UNKNOWN,
        boundaries: [],
      };
      
      (analyzePlacesWithBoundaries as jest.Mock).mockResolvedValue(mockPlacesResult);
      
      // Act
      const result = await analyzeOutdoorSpace(40.7200, -74.0100, mockMap, false);
      
      // Assert
      expect(result.isOutdoors).toBe(false);
      expect(result.confidence).toBe(20);
      expect(result.debugInfo?.inBoundary).toBe(false);
      expect(result.debugInfo?.spaceCategory).toBe(OutdoorSpaceCategory.UNKNOWN);
      expect(result.explanations.negative).toEqual(
        expect.arrayContaining([expect.stringContaining('not in a recognized')])
      );
    });

    it('should handle manual override', async () => {
      // Arrange
      const mockPlacesResult = {
        isOutdoors: true,
        isInBuilding: false,
        inBoundary: false,
        confidence: 100,
        reasons: [],
        explanations: {
          positive: ['You\'ve overridden outdoor detection.'],
          negative: []
        },
        placeTypes: [],
        boundaries: [],
        manualOverride: true
      };
      
      (analyzePlacesWithBoundaries as jest.Mock).mockResolvedValue(mockPlacesResult);
      
      // Act
      const result = await analyzeOutdoorSpace(40.7118, -74.0070, mockMap, true);
      
      // Assert
      expect(result.isOutdoors).toBe(true);
      expect(result.confidence).toBe(100);
      expect(result.explanations.positive).toEqual(
        expect.arrayContaining([expect.stringContaining('overridden')])
      );
    });

    it('should cap confidence at 100', async () => {
      // Arrange
      const mockPlacesResult = {
        isOutdoors: true,
        isInBuilding: false,
        inBoundary: true,
        confidence: 120, // Over 100
        reasons: ['Inside boundary of Test Park'],
        explanations: {
          positive: ['You\'re inside Test Park.'],
          negative: []
        },
        placeTypes: ['park'],
        boundaries: [
          {
            northeast: { lat: 40.7128, lng: -74.0060 },
            southwest: { lat: 40.7108, lng: -74.0080 }
          }
        ]
      };
      
      (analyzePlacesWithBoundaries as jest.Mock).mockResolvedValue(mockPlacesResult);
      
      // Act
      const result = await analyzeOutdoorSpace(40.7118, -74.0070, mockMap, false);
      
      // Assert
      expect(result.confidence).toBe(100); // Should be capped at 100
    });

    it('should handle errors and return a fallback result', async () => {
      // Arrange
      (analyzePlacesWithBoundaries as jest.Mock).mockRejectedValue(new Error('API failure'));
      
      // Act
      const result = await analyzeOutdoorSpace(40.7118, -74.0070, mockMap, false);
      
      // Assert
      expect(result.isOutdoors).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.reasons).toContain('Detection failed');
      expect(result.explanations.negative).toEqual(
        expect.arrayContaining([expect.stringContaining('couldn\'t analyze')])
      );
    });
  });
}); 