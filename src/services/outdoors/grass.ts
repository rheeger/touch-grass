import { MapInstance } from '@/types/maps';
import Logger from '@/utils/logger';
import { detectOutdoorLocation } from './detection';
import { GeoCoordinates, GrassDetectionResult, SpaceCategory } from './types';

/**
 * Analyzes whether a location is in a grassy area
 * 
 * @param lat - Latitude coordinate
 * @param lng - Longitude coordinate 
 * @param map - Google Maps instance
 * @param isManualOverride - Flag to override detection and force a positive result
 * @returns Promise resolving to grass detection result
 */
export async function analyzeGrass(
  lat: number,
  lng: number,
  map: MapInstance,
  isManualOverride: boolean
): Promise<GrassDetectionResult> {
  try {
    // Use the outdoor detection service directly
    const outdoorResult = await detectOutdoorLocation(
      { lat, lng },
      map,
      { isManualOverride }
    );
    
    // Special handling for playgrounds and parks - they should always be considered grass-touching areas
    const isPlayground = outdoorResult.debugInfo?.placeTypes &&
      Array.isArray(outdoorResult.debugInfo.placeTypes) &&
      (outdoorResult.debugInfo.placeTypes as string[]).some(type => 
        type === 'playground' || type === 'park'
      );
      
    const hasPlaygroundInName = outdoorResult.debugInfo?.placeName &&
      typeof outdoorResult.debugInfo.placeName === 'string' &&
      (outdoorResult.debugInfo.placeName as string).toLowerCase().includes('playground');
    
    // Check if location is identified as being inside a boundary (like a park)
    const isInBoundary = outdoorResult.debugInfo?.inBoundary === true;
    
    // Directly check for parks in place types, which is more reliable than trying to access boundary data
    const isParkOrGreenspace = outdoorResult.debugInfo?.placeTypes &&
      Array.isArray(outdoorResult.debugInfo.placeTypes) &&
      (outdoorResult.debugInfo.placeTypes as string[]).some(type => 
        ['park', 'campground', 'natural_feature', 'playground'].includes(type)
      );
      
    // Force touching grass for playgrounds, parks, or when in park boundaries
    if (isPlayground || hasPlaygroundInName || (isInBoundary && isParkOrGreenspace)) {
      Logger.info('Location is in a park area - considering as touching grass', {
        isPlayground,
        hasPlaygroundInName,
        isInBoundary,
        isParkOrGreenspace,
        placeName: outdoorResult.debugInfo?.placeName,
        placeTypes: outdoorResult.debugInfo?.placeTypes
      });
      
      return {
        isTouchingGrass: true,
        confidence: 95,
        reasons: ['Location is in a park or green space area'],
        explanations: {
          positive: ['Parks and green spaces typically have grass areas'],
          negative: []
        },
        debugInfo: {
          isInPark: true,
          isInBuilding: false,
          placeTypes: outdoorResult.debugInfo?.placeTypes as string[] || []
        }
      };
    }
    
    // Determine if touching grass based on outdoor result
    const isTouchingGrass = outdoorResult.isOutdoors && (
      outdoorResult.spaceCategory === SpaceCategory.NATURAL_AREA ||
      outdoorResult.spaceCategory === SpaceCategory.PROTECTED_AREA ||
      outdoorResult.spaceCategory === SpaceCategory.MANAGED_OUTDOOR
    );
    
    // Map the result to the expected GrassDetectionResult format
    return {
      isTouchingGrass,
      confidence: outdoorResult.confidence,
      reasons: outdoorResult.reasons,
      explanations: outdoorResult.explanations,
      debugInfo: {
        isInPark: isTouchingGrass,
        isInBuilding: outdoorResult.debugInfo.isBuilding as boolean || false,
        placeTypes: outdoorResult.debugInfo.placeTypes as string[] || []
      }
    };
  } catch (error) {
    Logger.error('Error analyzing grass', { error, lat, lng });
    
    // Provide a fallback result in case of error
    return {
      isTouchingGrass: false,
      confidence: 20,
      reasons: ['Detection failed', error instanceof Error ? error.message : 'Unknown error'],
      explanations: {
        positive: [],
        negative: ["We couldn't determine if you're touching grass."]
      },
      debugInfo: {
        isInPark: false,
        isInBuilding: false,
        placeTypes: []
      }
    };
  }
}

/**
 * Shorthand function that takes a GeoCoordinates object instead of separate lat/lng
 * 
 * @param coordinates - Geographic coordinates
 * @param map - Google Maps instance
 * @param isManualOverride - Flag to override detection and force a positive result
 * @returns Promise resolving to grass detection result
 */
export async function analyzeGrassAtCoordinates(
  coordinates: GeoCoordinates,
  map: MapInstance,
  isManualOverride: boolean = false
): Promise<GrassDetectionResult> {
  return analyzeGrass(
    coordinates.lat,
    coordinates.lng,
    map,
    isManualOverride
  );
} 