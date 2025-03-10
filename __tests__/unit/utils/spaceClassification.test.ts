import { classifyOutdoorSpace, OutdoorSpaceCategory, getOutdoorSpaceWeight } from '@/utils/spaceClassification';

describe('Outdoor Space Classification Tests', () => {
  describe('classifyOutdoorSpace', () => {
    it('should classify parks as primary outdoor spaces', () => {
      const placeTypes = ['park', 'point_of_interest', 'establishment'];
      const result = classifyOutdoorSpace(placeTypes);
      
      expect(result.category).toBe(OutdoorSpaceCategory.PRIMARY);
      expect(result.reasons).toContain('Park is a primary outdoor space');
    });

    it('should classify natural features as primary outdoor spaces', () => {
      const placeTypes = ['natural_feature', 'point_of_interest'];
      const result = classifyOutdoorSpace(placeTypes);
      
      expect(result.category).toBe(OutdoorSpaceCategory.PRIMARY);
      expect(result.reasons).toContain('Natural Feature is a primary outdoor space');
    });

    it('should classify plazas and open areas as secondary outdoor spaces', () => {
      const placeTypes = ['tourist_attraction', 'point_of_interest', 'establishment'];
      const result = classifyOutdoorSpace(placeTypes);
      
      expect(result.category).toBe(OutdoorSpaceCategory.SECONDARY);
      expect(result.reasons).toContain('Tourist Attraction may be a secondary outdoor space');
    });

    it('should classify indoor places as exclusion zones', () => {
      const placeTypes = ['shopping_mall', 'point_of_interest', 'establishment'];
      const result = classifyOutdoorSpace(placeTypes);
      
      expect(result.category).toBe(OutdoorSpaceCategory.EXCLUSION);
      expect(result.reasons).toContain('Shopping Mall is likely an indoor area');
    });

    it('should default to UNKNOWN when no relevant types are found', () => {
      const placeTypes = ['political', 'country', 'geocode'];
      const result = classifyOutdoorSpace(placeTypes);
      
      expect(result.category).toBe(OutdoorSpaceCategory.UNKNOWN);
      expect(result.reasons).toContain('No recognized outdoor space types found');
    });
  });

  describe('getOutdoorSpaceWeight', () => {
    it('should return high weight for primary outdoor spaces', () => {
      const weight = getOutdoorSpaceWeight(OutdoorSpaceCategory.PRIMARY);
      expect(weight).toBe(100);
    });

    it('should return medium weight for secondary outdoor spaces', () => {
      const weight = getOutdoorSpaceWeight(OutdoorSpaceCategory.SECONDARY);
      expect(weight).toBe(60);
    });

    it('should return negative weight for exclusion zones', () => {
      const weight = getOutdoorSpaceWeight(OutdoorSpaceCategory.EXCLUSION);
      expect(weight).toBeLessThan(0);
    });

    it('should return zero weight for unknown spaces', () => {
      const weight = getOutdoorSpaceWeight(OutdoorSpaceCategory.UNKNOWN);
      expect(weight).toBe(0);
    });
  });
}); 