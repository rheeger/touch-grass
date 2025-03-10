import Logger from '@/utils/logger';
import { ClassificationResult, ConfidenceResult, DetectionOptions, PlaceContext, SpaceCategory } from './types';

/**
 * Representation of a confidence adjustment factor
 */
interface ConfidenceAdjustment {
  name: string;
  condition: (context: PlaceContext, classification: ClassificationResult) => boolean;
  adjustment: number;
  reason: string;
}

/**
 * Confidence adjustments for various situations
 */
const CONFIDENCE_ADJUSTMENTS: ConfidenceAdjustment[] = [
  // Building proximity adjustments
  {
    name: 'InBuilding',
    condition: (context) => context.isBuilding,
    adjustment: -60,
    reason: 'Inside or very near a building'
  },
  {
    name: 'CloseToBuilding',
    condition: (context) => 
      !context.isBuilding && 
      context.nearestBuildingDistance !== undefined && 
      context.nearestBuildingDistance < 30,
    adjustment: -30,
    reason: 'Close to a building (less than 30m)'
  },
  {
    name: 'FarFromBuildings',
    condition: (context) => 
      !context.isBuilding && 
      context.nearestBuildingDistance !== undefined && 
      context.nearestBuildingDistance > 100,
    adjustment: +15,
    reason: 'Far from buildings (more than 100m)'
  },
  
  // Boundary adjustments
  {
    name: 'WellInsideBoundary',
    condition: (context) => 
      context.inBoundary && 
      context.distanceToEdge !== undefined && 
      context.distanceToEdge > 30,
    adjustment: +10,
    reason: 'Well inside the boundary of recognized area'
  },
  {
    name: 'NearBoundaryEdge',
    condition: (context) => 
      context.inBoundary && 
      context.distanceToEdge !== undefined && 
      context.distanceToEdge < 10,
    adjustment: -5,
    reason: 'Near the edge of a recognized area'
  },
  {
    name: 'OutsideBoundary',
    condition: (context) => !context.inBoundary,
    adjustment: -20,
    reason: 'Outside any recognized area boundary'
  },
  
  // Special area adjustments
  {
    name: 'ProtectedArea',
    condition: (_, classification) => 
      classification.spaceCategory === SpaceCategory.PROTECTED_AREA,
    adjustment: +15,
    reason: 'In a protected natural area'
  },
  {
    name: 'NaturalArea',
    condition: (_, classification) => 
      classification.spaceCategory === SpaceCategory.NATURAL_AREA,
    adjustment: +10,
    reason: 'In a natural area'
  },
  {
    name: 'WaterFeature',
    condition: (_, classification) => 
      classification.spaceCategory === SpaceCategory.WATER_FEATURE,
    adjustment: +10,
    reason: 'Near a water feature'
  },
  {
    name: 'ManagedOutdoor',
    condition: (_, classification) => 
      classification.spaceCategory === SpaceCategory.MANAGED_OUTDOOR,
    adjustment: +5,
    reason: 'In a managed outdoor area'
  },
  {
    name: 'ResidentialArea',
    condition: (context) => context.isResidentialArea,
    adjustment: -25,
    reason: 'In a residential area'
  }
];

/**
 * Calculates a confidence score for outdoor detection
 * 
 * @param context - Place context from location APIs
 * @param classification - Classification result for the location
 * @param options - Detection options
 * @returns Confidence calculation result
 */
export function calculateConfidence(
  context: PlaceContext,
  classification: ClassificationResult,
  options: DetectionOptions
): ConfidenceResult {
  // If manual override is enabled, return 100% confidence
  if (options.isManualOverride) {
    return {
      confidence: 100,
      adjustments: [{
        reason: 'Manual override enabled',
        adjustment: 100
      }],
      reasons: ['Manual override enabled'],
      isOutdoors: true
    };
  }
  
  // Start with the base confidence from classification
  let confidence = classification.baseConfidence;
  
  // Track all adjustments and reasons
  const adjustments: { reason: string; adjustment: number }[] = [];
  const reasons: string[] = [...classification.reasons];
  
  // Apply all applicable confidence adjustments
  for (const adjustment of CONFIDENCE_ADJUSTMENTS) {
    try {
      if (adjustment.condition(context, classification)) {
        confidence += adjustment.adjustment;
        adjustments.push({
          reason: adjustment.reason,
          adjustment: adjustment.adjustment
        });
        reasons.push(adjustment.reason);
        
        Logger.debug(`Applied confidence adjustment: ${adjustment.name}`, {
          adjustment: adjustment.adjustment,
          newConfidence: confidence
        });
      }
    } catch (error) {
      Logger.error(`Error applying confidence adjustment: ${adjustment.name}`, { error });
    }
  }
  
  // Ensure confidence is within valid range (0-100)
  confidence = Math.max(0, Math.min(100, confidence));
  
  // Determine final outdoor status based on confidence threshold
  const isOutdoors = confidence >= options.thresholds.outdoors;
  
  Logger.info('Calculated confidence', {
    baseConfidence: classification.baseConfidence,
    finalConfidence: confidence,
    isOutdoors,
    adjustmentsCount: adjustments.length
  });
  
  return {
    confidence,
    adjustments,
    reasons,
    isOutdoors
  };
} 