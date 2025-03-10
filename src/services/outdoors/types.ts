import { BoundaryBox } from '@/utils/boundaries';

/**
 * Represents a geographic coordinate
 */
export interface GeoCoordinates {
  lat: number;
  lng: number;
}

/**
 * Categories of outdoor spaces
 */
export enum SpaceCategory {
  NATURAL_AREA = 'NATURAL_AREA',       // Parks, forests, wilderness
  PROTECTED_AREA = 'PROTECTED_AREA',   // State parks, preserves, wildlife refuges
  MANAGED_OUTDOOR = 'MANAGED_OUTDOOR', // Golf courses, stadiums, playgrounds
  URBAN_OUTDOOR = 'URBAN_OUTDOOR',     // Plazas, campuses, open areas
  WATER_FEATURE = 'WATER_FEATURE',     // Beaches, shorelines, lakes
  RESIDENTIAL = 'RESIDENTIAL',         // Residential areas, neighborhoods
  URBAN = 'URBAN',                     // Commercial/dense urban areas
  INDOOR = 'INDOOR',                   // Inside buildings
  UNKNOWN = 'UNKNOWN'                  // Unclassified areas
}

/**
 * Context information about a place, gathered from various API sources
 */
export interface PlaceContext {
  coordinates: GeoCoordinates;
  placeTypes: string[];
  placeName?: string;
  boundaries: BoundaryBox[];
  inBoundary: boolean;
  isBuilding: boolean;
  isResidentialArea: boolean;
  nearestBuildingDistance?: number;
  distanceToEdge?: number;
  debug: Record<string, unknown>;
}

/**
 * The result of classifying a location
 */
export interface ClassificationResult {
  spaceCategory: SpaceCategory;
  isLikelyOutdoors: boolean;
  baseConfidence: number;
  reasons: string[];
  debug: Record<string, unknown>;
}

/**
 * The result of confidence calculation
 */
export interface ConfidenceResult {
  confidence: number;
  adjustments: {
    reason: string;
    adjustment: number;
  }[];
  reasons: string[];
  isOutdoors: boolean;
}

/**
 * Explanations generated for the detection result
 */
export interface Explanations {
  positive: string[];
  negative: string[];
}

/**
 * Options for the outdoor detection process
 */
export interface DetectionOptions {
  isManualOverride: boolean;
  thresholds: {
    outdoors: number;
    buildingProximity: number;
    naturalArea: number;
  };
}

/**
 * Final result of outdoor detection
 */
export interface OutdoorDetectionResult {
  isOutdoors: boolean;
  confidence: number;
  reasons: string[];
  explanations: Explanations;
  spaceCategory: SpaceCategory;
  debugInfo: Record<string, unknown>;
}

/**
 * Result of grass detection analysis
 */
export interface GrassDetectionResult {
  isTouchingGrass: boolean;
  confidence: number;
  reasons: string[];
  explanations: Explanations;
  debugInfo?: {
    isInPark?: boolean;
    isInBuilding?: boolean;
    placeTypes?: string[];
  };
} 