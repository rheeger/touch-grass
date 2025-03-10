import { isPointInBoundary } from '@/utils/boundaries';

describe('Boundary Detection Utilities', () => {
  describe('isPointInBoundary', () => {
    // Simple rectangular boundary for testing
    const testBoundary = {
      northeast: { lat: 40.7128, lng: -74.0060 },
      southwest: { lat: 40.7108, lng: -74.0080 }
    };

    it('should return true when point is inside the boundary', () => {
      // Point inside the boundary
      const lat = 40.7118;
      const lng = -74.0070;
      
      const result = isPointInBoundary(lat, lng, testBoundary);
      
      expect(result).toBe(true);
    });

    it('should return true when point is exactly on the boundary edge', () => {
      // Points on the boundary edges
      const northEdge = { lat: 40.7128, lng: -74.0070 };
      const eastEdge = { lat: 40.7118, lng: -74.0060 };
      const southEdge = { lat: 40.7108, lng: -74.0070 };
      const westEdge = { lat: 40.7118, lng: -74.0080 };
      
      expect(isPointInBoundary(northEdge.lat, northEdge.lng, testBoundary)).toBe(true);
      expect(isPointInBoundary(eastEdge.lat, eastEdge.lng, testBoundary)).toBe(true);
      expect(isPointInBoundary(southEdge.lat, southEdge.lng, testBoundary)).toBe(true);
      expect(isPointInBoundary(westEdge.lat, westEdge.lng, testBoundary)).toBe(true);
    });

    it('should return false when point is outside the boundary', () => {
      // Points outside the boundary
      const north = { lat: 40.7130, lng: -74.0070 }; // Just north
      const east = { lat: 40.7118, lng: -74.0050 };  // Just east
      const south = { lat: 40.7106, lng: -74.0070 }; // Just south
      const west = { lat: 40.7118, lng: -74.0090 };  // Just west
      
      expect(isPointInBoundary(north.lat, north.lng, testBoundary)).toBe(false);
      expect(isPointInBoundary(east.lat, east.lng, testBoundary)).toBe(false);
      expect(isPointInBoundary(south.lat, south.lng, testBoundary)).toBe(false);
      expect(isPointInBoundary(west.lat, west.lng, testBoundary)).toBe(false);
    });

    it('should handle coordinates at the corners of the boundary', () => {
      // Corner points
      const northeast = { lat: 40.7128, lng: -74.0060 };
      const northwest = { lat: 40.7128, lng: -74.0080 };
      const southeast = { lat: 40.7108, lng: -74.0060 };
      const southwest = { lat: 40.7108, lng: -74.0080 };
      
      expect(isPointInBoundary(northeast.lat, northeast.lng, testBoundary)).toBe(true);
      expect(isPointInBoundary(northwest.lat, northwest.lng, testBoundary)).toBe(true);
      expect(isPointInBoundary(southeast.lat, southeast.lng, testBoundary)).toBe(true);
      expect(isPointInBoundary(southwest.lat, southwest.lng, testBoundary)).toBe(true);
    });
  });
}); 