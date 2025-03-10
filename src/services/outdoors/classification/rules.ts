import { PlaceContext, SpaceCategory } from '../types';

/**
 * Rule definition for classifying an outdoor space
 */
export interface ClassificationRule {
  name: string;
  description: string;
  condition: (context: PlaceContext) => boolean;
  category: SpaceCategory;
  baseConfidence: number;
  reason: string;
}

/**
 * Rules for protected areas (state parks, wildlife refuges, etc.)
 */
export const PROTECTED_AREA_RULES: ClassificationRule[] = [
  {
    name: 'StateOrNationalPark',
    description: 'State or national parks are definitively natural areas',
    condition: (context: PlaceContext) => 
      !!context.placeName && 
      (context.placeName.toLowerCase().includes('state park') ||
       context.placeName.toLowerCase().includes('national park')),
    category: SpaceCategory.PROTECTED_AREA,
    baseConfidence: 95,
    reason: 'Location is within a state or national park'
  },
  {
    name: 'Preserve',
    description: 'Preserves are protected natural areas',
    condition: (context: PlaceContext) =>
      !!context.placeName &&
      (context.placeName.toLowerCase().includes('preserve') ||
       context.placeName.toLowerCase().includes('conservation')),
    category: SpaceCategory.PROTECTED_AREA,
    baseConfidence: 95,
    reason: 'Location is within a nature preserve or conservation area'
  },
  {
    name: 'WildlifeRefuge',
    description: 'Wildlife refuges and sanctuaries are protected natural areas',
    condition: (context: PlaceContext) =>
      !!context.placeName &&
      (context.placeName.toLowerCase().includes('wildlife refuge') ||
       context.placeName.toLowerCase().includes('sanctuary')),
    category: SpaceCategory.PROTECTED_AREA,
    baseConfidence: 95,
    reason: 'Location is within a wildlife refuge or sanctuary'
  }
];

/**
 * Rules for natural areas (parks, forests, etc.)
 */
export const NATURAL_AREA_RULES: ClassificationRule[] = [
  {
    name: 'Park',
    description: 'Parks are generally outdoor spaces',
    condition: (context: PlaceContext) =>
      context.placeTypes.includes('park') ||
      (!!context.placeName && context.placeName.toLowerCase().includes('park')),
    category: SpaceCategory.NATURAL_AREA,
    baseConfidence: 90,
    reason: 'Location is within a park'
  },
  {
    name: 'NaturalFeature',
    description: 'Natural features are outdoor areas',
    condition: (context: PlaceContext) =>
      context.placeTypes.includes('natural_feature'),
    category: SpaceCategory.NATURAL_AREA,
    baseConfidence: 90,
    reason: 'Location is at a natural feature'
  },
  {
    name: 'Forest',
    description: 'Forests are natural areas',
    condition: (context: PlaceContext) =>
      context.placeTypes.includes('forest') ||
      (!!context.placeName && (
        context.placeName.toLowerCase().includes('forest') ||
        context.placeName.toLowerCase().includes('woods')
      )),
    category: SpaceCategory.NATURAL_AREA,
    baseConfidence: 90,
    reason: 'Location is in a forested area'
  },
  {
    name: 'Trail',
    description: 'Trails are typically outdoor spaces',
    condition: (context: PlaceContext) =>
      context.placeTypes.includes('trail') ||
      (!!context.placeName && context.placeName.toLowerCase().includes('trail')),
    category: SpaceCategory.NATURAL_AREA,
    baseConfidence: 90,
    reason: 'Location is on a trail'
  }
];

/**
 * Rules for water features (beaches, shorelines, etc.)
 */
export const WATER_FEATURE_RULES: ClassificationRule[] = [
  {
    name: 'Beach',
    description: 'Beaches are outdoor areas by water',
    condition: (context: PlaceContext) =>
      context.placeTypes.includes('beach') ||
      (!!context.placeName && context.placeName.toLowerCase().includes('beach')),
    category: SpaceCategory.WATER_FEATURE,
    baseConfidence: 90,
    reason: 'Location is at a beach'
  },
  {
    name: 'Waterfront',
    description: 'Waterfronts, shores, and coastlines are outdoor areas',
    condition: (context: PlaceContext) =>
      !!context.placeName && (
        context.placeName.toLowerCase().includes('waterfront') ||
        context.placeName.toLowerCase().includes('shore') ||
        context.placeName.toLowerCase().includes('coast') ||
        context.placeName.toLowerCase().includes('bay') ||
        context.placeName.toLowerCase().includes('harbor')
      ),
    category: SpaceCategory.WATER_FEATURE,
    baseConfidence: 85,
    reason: 'Location is at a waterfront area'
  },
  {
    name: 'River',
    description: 'Rivers and lakes are water features',
    condition: (context: PlaceContext) =>
      !!context.placeName && (
        context.placeName.toLowerCase().includes('river') ||
        context.placeName.toLowerCase().includes('lake') ||
        context.placeName.toLowerCase().includes('stream') ||
        context.placeName.toLowerCase().includes('creek')
      ),
    category: SpaceCategory.WATER_FEATURE,
    baseConfidence: 85,
    reason: 'Location is near a river, lake, or stream'
  }
];

/**
 * Rules for managed outdoor areas (golf courses, stadiums, etc.)
 */
export const MANAGED_OUTDOOR_RULES: ClassificationRule[] = [
  {
    name: 'playground_detection',
    description: 'Identifies playground areas',
    condition: (context: PlaceContext) => 
      context.placeTypes.includes('playground') || 
      (context.placeName && context.placeName.toLowerCase().includes('playground')),
    category: SpaceCategory.MANAGED_OUTDOOR,
    baseConfidence: 95,
    reason: 'Location is in a playground area'
  },
  {
    name: 'park_boundary_override',
    description: 'Ensures parks are treated as outdoor areas even near buildings',
    condition: (context: PlaceContext) => 
      context.inBoundary && 
      context.placeTypes.some(type => 
        ['park', 'campground', 'natural_feature'].includes(type)
      ),
    category: SpaceCategory.NATURAL_AREA,
    baseConfidence: 90,
    reason: 'Location is within the boundary of a park'
  },
  {
    name: 'GolfCourse',
    description: 'Golf courses are managed outdoor areas',
    condition: (context: PlaceContext) =>
      context.placeTypes.includes('golf_course'),
    category: SpaceCategory.MANAGED_OUTDOOR,
    baseConfidence: 90,
    reason: 'Location is on a golf course'
  },
  {
    name: 'Stadium',
    description: 'Stadiums can be outdoor facilities',
    condition: (context: PlaceContext) =>
      context.placeTypes.includes('stadium'),
    category: SpaceCategory.MANAGED_OUTDOOR,
    baseConfidence: 75, // Lower confidence as some stadiums are indoor
    reason: 'Location is at a stadium'
  },
  {
    name: 'SportsComplex',
    description: 'Sports complexes can be outdoor facilities',
    condition: (context: PlaceContext) =>
      context.placeTypes.includes('sports_complex'),
    category: SpaceCategory.MANAGED_OUTDOOR,
    baseConfidence: 75,
    reason: 'Location is at a sports complex'
  }
];

/**
 * Rules for urban outdoor areas (plazas, campuses, etc.)
 */
export const URBAN_OUTDOOR_RULES: ClassificationRule[] = [
  {
    name: 'University',
    description: 'University campuses often have outdoor areas',
    condition: (context: PlaceContext) =>
      context.placeTypes.includes('university'),
    category: SpaceCategory.URBAN_OUTDOOR,
    baseConfidence: 60,
    reason: 'Location is on a university campus'
  },
  {
    name: 'Plaza',
    description: 'Plazas are urban outdoor spaces',
    condition: (context: PlaceContext) =>
      context.placeTypes.includes('plaza') ||
      (!!context.placeName && context.placeName.toLowerCase().includes('plaza')),
    category: SpaceCategory.URBAN_OUTDOOR,
    baseConfidence: 70,
    reason: 'Location is at a plaza'
  }
];

/**
 * Rules for residential areas
 */
export const RESIDENTIAL_RULES: ClassificationRule[] = [
  {
    name: 'ResidentialArea',
    description: 'Residential areas with houses, neighborhoods',
    condition: (context: PlaceContext) =>
      context.isResidentialArea ||
      context.placeTypes.some(type => 
        ['locality', 'sublocality', 'neighborhood', 'premise', 'political', 'administrative_area'].includes(type)
      ),
    category: SpaceCategory.RESIDENTIAL,
    baseConfidence: 50,
    reason: 'Location is in a residential area'
  }
];

/**
 * Rules for indoor areas (buildings)
 */
export const INDOOR_RULES: ClassificationRule[] = [
  {
    name: 'Building',
    description: 'Inside or near a building',
    condition: (context: PlaceContext) =>
      context.isBuilding,
    category: SpaceCategory.INDOOR,
    baseConfidence: 20,
    reason: 'Location is inside or very near a building'
  }
];

/**
 * All classification rules in priority order
 */
export const ALL_CLASSIFICATION_RULES: ClassificationRule[] = [
  ...PROTECTED_AREA_RULES,
  ...NATURAL_AREA_RULES,
  ...WATER_FEATURE_RULES,
  ...MANAGED_OUTDOOR_RULES,
  ...URBAN_OUTDOOR_RULES,
  ...RESIDENTIAL_RULES,
  ...INDOOR_RULES
]; 