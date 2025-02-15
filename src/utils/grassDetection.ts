import { analyzePlacesData } from '@/utils/places';

export interface GrassDetectionResult {
  isTouchingGrass: boolean;
  confidence: number;
  reasons: string[];
  explanations: {
    positive: string[];
    negative: string[];
  };
  debugInfo?: {
    isInPark?: boolean;
    isInBuilding?: boolean;
    placeTypes?: string[];
  };
}

/**
 * Analyzes the given location to determine if the user is touching grass.
 * @param lat The latitude of the location.
 * @param lng The longitude of the location.
 * @param map An instance of the Google Maps object.
 * @param isManualOverride Boolean flag to enable manual override.
 * @returns A promise that resolves to a GrassDetectionResult object.
 */
export async function analyzeGrass(
  lat: number,
  lng: number,
  map: google.maps.Map,
  isManualOverride: boolean
): Promise<GrassDetectionResult> {
  const placesResult = await analyzePlacesData(lat, lng, map, isManualOverride);
  const isTouchingGrass = placesResult.isInPark && !placesResult.isInBuilding;
  const confidence = Math.max(0, Math.min(100, placesResult.confidence));

  return {
    isTouchingGrass,
    confidence,
    reasons: placesResult.reasons,
    explanations: placesResult.explanations,
    debugInfo: {
      isInPark: placesResult.isInPark,
      isInBuilding: placesResult.isInBuilding,
      placeTypes: placesResult.placeTypes
    }
  };
} 