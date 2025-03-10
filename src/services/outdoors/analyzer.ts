import Logger from '@/utils/logger';
import { ClassificationResult, ConfidenceResult, Explanations, PlaceContext, SpaceCategory } from './types';

/**
 * Generates user-friendly explanations for outdoor detection results
 * 
 * @param context - Place context from location APIs
 * @param classification - Classification result for the location
 * @param confidenceResult - Confidence calculation result
 * @returns Explanations with positive and negative messages
 */
export function generateExplanations(
  context: PlaceContext,
  classification: ClassificationResult,
  confidenceResult: ConfidenceResult
): Explanations {
  const explanations: Explanations = {
    positive: [],
    negative: []
  };
  
  // First, select appropriate explanations based on space category
  if (confidenceResult.isOutdoors) {
    addPositiveExplanation(explanations, context, classification);
  } else {
    addNegativeExplanation(explanations, context, classification);
  }
  
  // Add any supplementary explanations
  addSupplementaryExplanations(explanations, context, classification, confidenceResult);
  
  Logger.info('Generated explanations', {
    positiveCount: explanations.positive.length,
    negativeCount: explanations.negative.length,
    isOutdoors: confidenceResult.isOutdoors
  });
  
  return explanations;
}

/**
 * Adds a primary positive explanation based on the classification
 */
function addPositiveExplanation(
  explanations: Explanations,
  context: PlaceContext,
  classification: ClassificationResult
): void {
  switch (classification.spaceCategory) {
    case SpaceCategory.PROTECTED_AREA:
      explanations.positive.push(`You're in ${context.placeName || 'a protected natural area'}.`);
      break;
    case SpaceCategory.NATURAL_AREA:
      if (context.placeName) {
        explanations.positive.push(`You're in ${context.placeName}.`);
      } else {
        explanations.positive.push("You're in a natural outdoor area.");
      }
      break;
    case SpaceCategory.WATER_FEATURE:
      if (context.placeTypes.includes('beach')) {
        explanations.positive.push(`You're at ${context.placeName || 'a beach'}.`);
      } else if (context.placeName && context.placeName.toLowerCase().includes('river')) {
        explanations.positive.push(`You're by ${context.placeName}.`);
      } else {
        explanations.positive.push(`You're at a waterfront area.`);
      }
      break;
    case SpaceCategory.MANAGED_OUTDOOR:
      if (context.placeTypes.includes('golf_course')) {
        explanations.positive.push(`You're on ${context.placeName || 'a golf course'}.`);
      } else if (context.placeTypes.includes('stadium')) {
        explanations.positive.push(`You're at ${context.placeName || 'a stadium'}.`);
      } else {
        explanations.positive.push(`You're in a managed outdoor area.`);
      }
      break;
    case SpaceCategory.URBAN_OUTDOOR:
      explanations.positive.push(`You're in an outdoor area.`);
      break;
    default:
      explanations.positive.push(`You appear to be outdoors.`);
      break;
  }
}

/**
 * Adds a primary negative explanation based on the classification
 */
function addNegativeExplanation(
  explanations: Explanations,
  context: PlaceContext,
  classification: ClassificationResult
): void {
  if (context.isBuilding) {
    explanations.negative.push("You're inside or very near a building.");
    return;
  }
  
  switch (classification.spaceCategory) {
    case SpaceCategory.RESIDENTIAL:
      explanations.negative.push("You're in a residential area without clear natural features.");
      break;
    case SpaceCategory.URBAN:
      explanations.negative.push("You're in an urban area without clear natural features.");
      break;
    case SpaceCategory.INDOOR:
      explanations.negative.push("You appear to be indoors.");
      break;
    default:
      explanations.negative.push("You're not in a grassy area.");
      break;
  }
}

/**
 * Adds supplementary explanations based on the context and confidence adjustments
 */
function addSupplementaryExplanations(
  explanations: Explanations,
  context: PlaceContext,
  classification: ClassificationResult,
  confidenceResult: ConfidenceResult
): void {
  // Add building proximity explanations
  if (!context.isBuilding && 
      context.nearestBuildingDistance !== undefined && 
      context.nearestBuildingDistance < 30) {
    explanations.negative.push(`You're close to buildings (${Math.round(context.nearestBuildingDistance)}m away).`);
  }
  
  // Add boundary explanations
  if (context.inBoundary && confidenceResult.isOutdoors) {
    if (context.distanceToEdge !== undefined && context.distanceToEdge > 30) {
      explanations.positive.push("You're well inside the boundaries of this area.");
    }
  } else if (!context.inBoundary && 
             [SpaceCategory.NATURAL_AREA, SpaceCategory.PROTECTED_AREA].includes(classification.spaceCategory)) {
    explanations.negative.push("However, you're near the edge or just outside the official boundaries.");
  }
  
  // For state parks and natural areas that are incorrectly classified as not outdoors
  if (!confidenceResult.isOutdoors && !context.isBuilding &&
      [SpaceCategory.NATURAL_AREA, SpaceCategory.PROTECTED_AREA].includes(classification.spaceCategory)) {
    explanations.negative.push(
      "While this appears to be a natural area, other factors suggest you might not be in a suitable location."
    );
  }

} 