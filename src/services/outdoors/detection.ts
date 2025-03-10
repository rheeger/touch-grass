import Logger from '@/utils/logger';
import { MapInstance } from '@/types/maps';
import { classifyLocation } from './classification';
import { calculateConfidence } from './confidence';
import { generateExplanations } from './analyzer';
import { DetectionOptions, GeoCoordinates, OutdoorDetectionResult, SpaceCategory } from './types';
import { getPlaceContext } from '../places';

/**
 * Default detection options
 */
const DEFAULT_DETECTION_OPTIONS: DetectionOptions = {
  isManualOverride: false,
  thresholds: {
    outdoors: 70,
    buildingProximity: 30,
    naturalArea: 50
  }
};

/**
 * Orchestrates the outdoor detection process from location data to final result
 * 
 * @param coordinates - Geographic coordinates
 * @param mapInstance - Google Maps instance
 * @param options - Detection options, including thresholds and overrides
 * @returns Promise resolving to the outdoor detection result
 */
export async function detectOutdoorLocation(
  coordinates: GeoCoordinates,
  mapInstance: MapInstance,
  options: Partial<DetectionOptions> = {}
): Promise<OutdoorDetectionResult> {
  // Merge provided options with defaults
  const detectionOptions: DetectionOptions = {
    ...DEFAULT_DETECTION_OPTIONS,
    ...options,
    thresholds: {
      ...DEFAULT_DETECTION_OPTIONS.thresholds,
      ...options.thresholds
    }
  };
  
  try {
    Logger.info('Starting outdoor detection', {
      coordinates,
      isManualOverride: detectionOptions.isManualOverride
    });
    
    // Handle manual override immediately if enabled
    if (detectionOptions.isManualOverride) {
      Logger.info('Manual override enabled, returning success');
      return {
        isOutdoors: true,
        confidence: 100,
        reasons: ['Manual override enabled'],
        explanations: {
          positive: ['You\'ve overridden outdoor detection.'],
          negative: []
        },
        spaceCategory: SpaceCategory.NATURAL_AREA,
        debugInfo: {
          manualOverride: true
        }
      };
    }
    
    // 1. Get place context using our places service
    const placeContext = await getPlaceContext(coordinates, mapInstance);
    
    // 2. Classify the location
    const classification = classifyLocation(placeContext);
    
    // 3. Calculate confidence
    const confidenceResult = calculateConfidence(placeContext, classification, detectionOptions);
    
    // 4. Generate explanations
    const explanations = generateExplanations(placeContext, classification, confidenceResult);
    
    // 5. Assemble final result
    const result: OutdoorDetectionResult = {
      isOutdoors: confidenceResult.isOutdoors,
      confidence: confidenceResult.confidence,
      reasons: confidenceResult.reasons,
      explanations,
      spaceCategory: classification.spaceCategory,
      debugInfo: {
        ...placeContext.debug,
        ...classification.debug,
        confidenceAdjustments: confidenceResult.adjustments
      }
    };
    
    Logger.info('Outdoor detection complete', {
      isOutdoors: result.isOutdoors,
      confidence: result.confidence,
      spaceCategory: result.spaceCategory,
      reasonsCount: result.reasons.length
    });
    
    return result;
  } catch (error) {
    Logger.error('Error in outdoor detection', { error, coordinates });
    
    // Return a fallback result on error
    return {
      isOutdoors: false,
      confidence: 20,
      reasons: ['Detection failed'],
      explanations: {
        positive: [],
        negative: ["We couldn't determine if you're outdoors."]
      },
      spaceCategory: SpaceCategory.UNKNOWN,
      debugInfo: {
        error: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
} 