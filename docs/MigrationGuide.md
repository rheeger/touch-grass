# Migration Guide: Touch Grass Detection Services

This guide explains how to migrate from the old utils-based approach to the new service-oriented architecture for location and outdoor detection.

## Overview of Changes

We've refactored the outdoor detection code into a more structured, maintainable service architecture:

1. **Service-Oriented Architecture**: Code now lives in `src/services/` instead of `src/utils/`
2. **Clear Separation of Concerns**: Each service has a specific responsibility
3. **Pipeline Architecture**: Processing happens in well-defined stages
4. **Improved Type Safety**: Strong typing throughout the codebase
5. **Better Testability**: Components can be tested in isolation

## Direct Usage of Services

All detection functionality is now available directly from the services:

```typescript
// Import from services
import { 
  analyzeGrass, 
  analyzeGrassAtCoordinates,
  detectOutdoorLocation,
  GrassDetectionResult 
} from '@/services/outdoors';

// Analyze if touching grass
const grassResult = await analyzeGrass(
  lat, 
  lng, 
  mapInstance,
  isManualOverride
);

// Or use the coordinates version
const grassResult = await analyzeGrassAtCoordinates(
  { lat, lng },
  mapInstance,
  isManualOverride
);

// For lower-level outdoor detection
const outdoorResult = await detectOutdoorLocation(
  { lat, lng },
  mapInstance,
  { isManualOverride }
);
```

## Key Differences

The new architecture provides several advantages:

1. **Better Classification**: More accurate categorization of locations
2. **Rule-Based Approach**: Classification rules are explicit and configurable
3. **Enhanced Confidence Calculation**: More nuanced confidence adjustments
4. **Improved Explanations**: Better user-facing explanations
5. **Richer Debug Info**: More detailed debugging information

## Type Definitions

All types are now exported from the services:

```typescript
import { 
  GrassDetectionResult,
  OutdoorDetectionResult,
  SpaceCategory,
  GeoCoordinates
} from '@/services/outdoors';
```

## Testing

Update your tests to use the new services directly:

```typescript
// Mock the outdoors service
jest.mock('@/services/outdoors/detection', () => ({
  detectOutdoorLocation: jest.fn(),
}));

// Import the mocked module and types
import { analyzeGrass, SpaceCategory } from '@/services/outdoors';
import { detectOutdoorLocation } from '@/services/outdoors/detection';

// Test the service
describe('Grass Detection Service', () => {
  it('should detect grass correctly', async () => {
    // Arrange
    const mockOutdoorResult = {
      isOutdoors: true,
      spaceCategory: SpaceCategory.NATURAL_AREA,
      // ...other properties
    };
    
    (detectOutdoorLocation as jest.Mock).mockResolvedValue(mockOutdoorResult);
    
    // Act
    const result = await analyzeGrass(lat, lng, mockMap, false);
    
    // Assert
    expect(result.isTouchingGrass).toBe(true);
  });
});
```

## Performance Considerations

The new services are designed to be more efficient:

1. Better caching of place data
2. More targeted API calls
3. Smarter boundary detection
4. Earlier short-circuiting for obvious cases 