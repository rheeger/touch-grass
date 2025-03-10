import Logger from '@/utils/logger';
import { ClassificationResult, PlaceContext, SpaceCategory } from '../types';
import { ALL_CLASSIFICATION_RULES, ClassificationRule } from './rules';

/**
 * Applies classification rules to a place context to determine its category
 * 
 * @param context - The place context from location APIs
 * @returns Classification result with space category and confidence
 */
export function classifyLocation(context: PlaceContext): ClassificationResult {
  Logger.info('Classifying location', {
    placeName: context.placeName,
    placeTypes: context.placeTypes,
    inBoundary: context.inBoundary,
    isBuilding: context.isBuilding,
    isResidentialArea: context.isResidentialArea,
  });
  
  // Start with unknown classification
  const defaultResult: ClassificationResult = {
    spaceCategory: SpaceCategory.UNKNOWN,
    isLikelyOutdoors: false,
    baseConfidence: 0,
    reasons: ['No specific category detected'],
    debug: {}
  };
  
  // Apply all rules in priority order - first matching rule wins
  const matchingRules: ClassificationRule[] = [];
  
  // Find all matching rules
  for (const rule of ALL_CLASSIFICATION_RULES) {
    try {
      if (rule.condition(context)) {
        matchingRules.push(rule);
        Logger.debug(`Rule matched: ${rule.name}`, { rule });
      }
    } catch (error) {
      Logger.error(`Error applying rule: ${rule.name}`, { error });
    }
  }
  
  // If no rules matched, return default
  if (matchingRules.length === 0) {
    Logger.info('No classification rules matched', {
      placeName: context.placeName,
      placeTypes: context.placeTypes
    });
    return defaultResult;
  }
  
  // Primary rule is the first (highest priority) matching rule
  const primaryRule = matchingRules[0];
  
  // Determine if this space is likely outdoors based on its category
  const isLikelyOutdoors = [
    SpaceCategory.NATURAL_AREA, 
    SpaceCategory.PROTECTED_AREA,
    SpaceCategory.MANAGED_OUTDOOR,
    SpaceCategory.WATER_FEATURE,
    SpaceCategory.URBAN_OUTDOOR
  ].includes(primaryRule.category);
  
  // Create result based on the primary rule
  const result: ClassificationResult = {
    spaceCategory: primaryRule.category,
    isLikelyOutdoors: isLikelyOutdoors && !context.isBuilding,
    baseConfidence: primaryRule.baseConfidence,
    reasons: [primaryRule.reason],
    debug: {
      allMatchingRules: matchingRules.map(r => r.name),
      primaryRule: primaryRule.name,
      spaceCategory: primaryRule.category,
      baseConfidence: primaryRule.baseConfidence
    }
  };
  
  // Special handling for buildings
  if (context.isBuilding) {
    result.reasons.push('Inside or very near a building');
    result.debug = {
      ...result.debug,
      isBuilding: true,
      nearestBuildingDistance: context.nearestBuildingDistance
    };
  }
  
  // Special handling for boundaries
  if (context.inBoundary) {
    result.reasons.push('Inside a recognized area boundary');
    result.debug = {
      ...result.debug,
      inBoundary: true,
      distanceToEdge: context.distanceToEdge
    };
  }
  
  Logger.info('Classified location', {
    spaceCategory: result.spaceCategory,
    isLikelyOutdoors: result.isLikelyOutdoors,
    baseConfidence: result.baseConfidence,
    reasons: result.reasons
  });
  
  return result;
} 