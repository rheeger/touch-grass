import { GeoCoordinates } from '../outdoors/types';
import { MapInstance } from '@/types/maps';

/**
 * Represents geographic boundaries with northeast and southwest coordinates.
 */
export interface Boundary {
  northeast: GeoCoordinates;
  southwest: GeoCoordinates;
  isFallbackBoundary?: boolean;
  isTrueBoundary?: boolean;
}

/**
 * Simplified representation of a Google Maps place
 */
export interface Place {
  place_id: string;
  name?: string;
  types?: string[];
  geometry?: {
    location?: GeoCoordinates;
    viewport?: {
      northeast: GeoCoordinates;
      southwest: GeoCoordinates;
    };
  };
  vicinity?: string;
}

/**
 * Options for place detection
 */
export interface PlaceDetectionOptions {
  searchRadius: number;
  buildingProximityRadius: number;
  includeKeywordSearch: boolean;
}

/**
 * Default options for place detection
 */
export const DEFAULT_PLACE_DETECTION_OPTIONS: PlaceDetectionOptions = {
  searchRadius: 250, // meters
  buildingProximityRadius: 100, // meters
  includeKeywordSearch: true
};

/**
 * Types of place searches
 */
export enum PlaceSearchType {
  NEARBY = 'NEARBY',
  TEXT = 'TEXT',
  DETAIL = 'DETAIL'
}

/**
 * Result of a place search
 */
export interface PlaceSearchResult {
  places: Place[];
  searchType: PlaceSearchType;
}

/**
 * Parameters for the places service
 */
export interface PlacesServiceParams {
  coordinates: GeoCoordinates;
  mapInstance: MapInstance;
  options?: Partial<PlaceDetectionOptions>;
} 