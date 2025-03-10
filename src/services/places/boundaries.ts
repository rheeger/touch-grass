import Logger from '@/utils/logger';
import { GeoCoordinates } from '../outdoors/types';
import { Boundary, Place } from './types';

/**
 * Checks if a geographic point is within a boundary
 * 
 * @param coordinates - The location to check
 * @param boundary - The boundary box to check against
 * @returns True if the point is inside the boundary, false otherwise
 */
export function isPointInBoundary(
  coordinates: GeoCoordinates,
  boundary: Boundary
): boolean {
  try {
    const { lat, lng } = coordinates;
    
    return (
      lat <= boundary.northeast.lat &&
      lat >= boundary.southwest.lat &&
      lng <= boundary.northeast.lng &&
      lng >= boundary.southwest.lng
    );
  } catch (error) {
    Logger.error('Error checking if point is in boundary', { error, coordinates });
    return false;
  }
}

/**
 * Calculates the distance of a point from a boundary's edge
 * 
 * @param coordinates - The location to check
 * @param boundary - The boundary to measure distance from
 * @returns Distance in degrees (positive inside, negative outside)
 */
export function distanceFromBoundaryEdge(
  coordinates: GeoCoordinates,
  boundary: Boundary
): number {
  const { lat, lng } = coordinates;
  
  // Calculate distances to each edge
  const distanceToNorth = boundary.northeast.lat - lat;
  const distanceToSouth = lat - boundary.southwest.lat;
  const distanceToEast = boundary.northeast.lng - lng;
  const distanceToWest = lng - boundary.southwest.lng;
  
  if (isPointInBoundary(coordinates, boundary)) {
    // Point is inside, return smallest distance to any edge (positive)
    return Math.min(distanceToNorth, distanceToSouth, distanceToEast, distanceToWest);
  } else {
    // Point is outside, find which direction and return negative distance
    if (lat > boundary.northeast.lat) {
      // North of boundary
      return -distanceToNorth;
    } else if (lat < boundary.southwest.lat) {
      // South of boundary
      return -distanceToSouth;
    } else if (lng > boundary.northeast.lng) {
      // East of boundary
      return -distanceToEast;
    } else if (lng < boundary.southwest.lng) {
      // West of boundary
      return -distanceToWest;
    }
    
    // Should never reach here if isPointInBoundary is correct
    Logger.error('Unexpected error in distance calculation', { coordinates, boundary });
    return 0;
  }
}

/**
 * Extracts a boundary from a place
 * 
 * @param place - Place with geometry
 * @returns Boundary from place or null if unavailable
 */
export function extractBoundaryFromPlace(place: Place): Boundary | null {
  if (!place.geometry || !place.geometry.viewport) {
    // If no viewport, try to create a fallback boundary around the place location
    if (place.geometry?.location) {
      const location = place.geometry.location;
      const lat = location.lat;
      const lng = location.lng;
      
      // Create a small boundary around the location (roughly 100m)
      const latDelta = 0.001; // ~110m
      const lngDelta = 0.001; // varies by latitude
      
      return {
        northeast: {
          lat: lat + latDelta,
          lng: lng + lngDelta
        },
        southwest: {
          lat: lat - latDelta,
          lng: lng - lngDelta
        },
        isFallbackBoundary: true
      };
    }
    
    return null;
  }
  
  // Use the viewport as the boundary
  return {
    northeast: place.geometry.viewport.northeast,
    southwest: place.geometry.viewport.southwest,
    isTrueBoundary: true
  };
}

/**
 * Converts distance in degrees to meters (approximate)
 * 
 * @param degrees - Distance in degrees
 * @returns Distance in meters (approximate)
 */
export function degreesToMeters(degrees: number): number {
  // Rough approximation: 1 degree latitude ≈ 111,000 meters
  return Math.abs(degrees) * 111000;
}

/**
 * Finds all boundaries that contain a point
 * 
 * @param coordinates - The location to check
 * @param places - Places with potential boundaries
 * @returns Array of containing boundaries with place info
 */
export function findContainingBoundaries(
  coordinates: GeoCoordinates,
  places: Place[]
): Array<{ boundary: Boundary; place: Place; distance: number }> {
  const results: Array<{ boundary: Boundary; place: Place; distance: number }> = [];
  
  for (const place of places) {
    const boundary = extractBoundaryFromPlace(place);
    if (boundary && isPointInBoundary(coordinates, boundary)) {
      const distance = distanceFromBoundaryEdge(coordinates, boundary);
      results.push({ boundary, place, distance });
    }
  }
  
  // Sort by distance (largest first - deepest inside)
  return results.sort((a, b) => b.distance - a.distance);
} 