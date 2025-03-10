/**
 * Type definitions for map-related functionality
 */

/**
 * Represents a map instance that can be used for Places API operations.
 * This allows for more flexibility when Google Maps API might not be loaded.
 */
export interface MapInstance {
  [key: string]: any;
}

/**
 * Represents a geographic viewport with northeast and southwest coordinates.
 */
export interface Viewport {
  northeast: { lat: number | (() => number); lng: number | (() => number) };
  southwest: { lat: number | (() => number); lng: number | (() => number) };
  getNorthEast?: () => { lat: () => number; lng: () => number };
  getSouthWest?: () => { lat: () => number; lng: () => number };
  contains?: (location: any) => boolean;
}

/**
 * Represents a place result with geometry information.
 */
export interface PlaceResult {
  place_id?: string;
  name?: string;
  types?: string[];
  geometry?: {
    location?: {
      lat: number | (() => number);
      lng: number | (() => number);
    };
    viewport?: Viewport;
  };
} 