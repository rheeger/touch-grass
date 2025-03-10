import Logger from '@/utils/logger';
import { MapInstance } from '@/types/maps';
import { GeoCoordinates } from '../outdoors/types';
import { Place, PlaceSearchResult, PlaceSearchType } from './types';

/**
 * Checks if Google Maps API is available
 * 
 * @returns Boolean indicating if Google Maps API is available
 */
export function isGoogleMapsAvailable(): boolean {
  return typeof window !== 'undefined' && 
         !!window.google && 
         !!window.google.maps;
}

/**
 * Creates a Google Maps Places Service instance
 * 
 * @param mapInstance - Google Maps instance
 * @returns Places service or null if unavailable
 */
export function createPlacesService(mapInstance: MapInstance): google.maps.places.PlacesService | null {
  if (!isGoogleMapsAvailable() || !mapInstance) {
    Logger.error('Google Maps API or map instance not available');
    return null;
  }
  
  try {
    return new google.maps.places.PlacesService(mapInstance as google.maps.Map);
  } catch (error) {
    Logger.error('Error creating Places service', { error });
    return null;
  }
}

/**
 * Searches for places near a location
 * 
 * @param coordinates - Location coordinates
 * @param radius - Search radius in meters
 * @param types - Place types to search for
 * @param placesService - Google Places Service instance
 * @returns Promise resolving to search results
 */
export async function searchNearbyPlaces(
  coordinates: GeoCoordinates,
  radius: number,
  types: string[],
  placesService: google.maps.places.PlacesService
): Promise<PlaceSearchResult> {
  if (!placesService) {
    Logger.error('Places service not available for nearby search');
    return { places: [], searchType: PlaceSearchType.NEARBY };
  }
  
  try {
    // Search for each type separately
    const allResults: google.maps.places.PlaceResult[] = [];
    
    // Create a promise for each place type search
    const searchPromises = types.map(type => 
      new Promise<google.maps.places.PlaceResult[]>((resolve) => {
        const request: google.maps.places.PlaceSearchRequest = {
          location: coordinates as google.maps.LatLngLiteral,
          radius,
          type: type
        };
        
        placesService.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
          } else {
            Logger.warn(`Place search failed for type: ${type}`, { status });
            resolve([]);
          }
        });
      })
    );
    
    // Wait for all searches to complete
    const resultsArrays = await Promise.all(searchPromises);
    
    // Combine all results, removing duplicates
    const uniqueIds = new Set<string>();
    
    for (const results of resultsArrays) {
      for (const place of results) {
        if (place.place_id && !uniqueIds.has(place.place_id)) {
          allResults.push(place);
          uniqueIds.add(place.place_id);
        }
      }
    }
    
    Logger.info('Nearby place search completed', { 
      count: allResults.length,
      location: coordinates,
      radius
    });
    
    // Transform to simplified Place objects
    const places = allResults.map(transformGooglePlace);
    
    return {
      places,
      searchType: PlaceSearchType.NEARBY
    };
  } catch (error) {
    Logger.error('Error in nearby place search', { error, coordinates, radius });
    return { places: [], searchType: PlaceSearchType.NEARBY };
  }
}

/**
 * Searches for places by keywords
 * 
 * @param coordinates - Location coordinates
 * @param radius - Search radius in meters
 * @param keywords - Keywords to search for
 * @param placesService - Google Places Service instance
 * @returns Promise resolving to search results
 */
export async function searchPlacesByKeywords(
  coordinates: GeoCoordinates,
  radius: number,
  keywords: string[],
  placesService: google.maps.places.PlacesService
): Promise<PlaceSearchResult> {
  if (!placesService) {
    Logger.error('Places service not available for keyword search');
    return { places: [], searchType: PlaceSearchType.TEXT };
  }
  
  try {
    // Search for each keyword separately
    const allResults: google.maps.places.PlaceResult[] = [];
    
    // Create a promise for each keyword search
    const searchPromises = keywords.map(keyword => 
      new Promise<google.maps.places.PlaceResult[]>((resolve) => {
        placesService.textSearch({
          location: coordinates as google.maps.LatLngLiteral,
          radius,
          query: keyword
        }, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
          } else {
            Logger.warn(`Keyword search failed for: ${keyword}`, { status });
            resolve([]);
          }
        });
      })
    );
    
    // Wait for all searches to complete
    const resultsArrays = await Promise.all(searchPromises);
    
    // Combine all results, removing duplicates
    const uniqueIds = new Set<string>();
    
    for (const results of resultsArrays) {
      for (const place of results) {
        if (place.place_id && !uniqueIds.has(place.place_id)) {
          allResults.push(place);
          uniqueIds.add(place.place_id);
        }
      }
    }
    
    Logger.info('Keyword place search completed', {
      count: allResults.length,
      location: coordinates,
      radius
    });
    
    // Transform to simplified Place objects
    const places = allResults.map(transformGooglePlace);
    
    return {
      places,
      searchType: PlaceSearchType.TEXT
    };
  } catch (error) {
    Logger.error('Error in keyword place search', { error, coordinates });
    return { places: [], searchType: PlaceSearchType.TEXT };
  }
}

/**
 * Gets details for a specific place
 * 
 * @param placeId - Google Place ID
 * @param placesService - Google Places Service instance
 * @returns Promise resolving to place details
 */
export async function getPlaceDetails(
  placeId: string,
  placesService: google.maps.places.PlacesService
): Promise<Place | null> {
  if (!placesService) {
    Logger.error('Places service not available for place details');
    return null;
  }
  
  try {
    const placeDetails = await new Promise<google.maps.places.PlaceResult | null>((resolve, reject) => {
      placesService.getDetails(
        {
          placeId,
          fields: ['geometry', 'name', 'types', 'vicinity']
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            resolve(place);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve(null);
          } else {
            Logger.error(`Error getting place details for ID ${placeId}`, { status });
            reject(new Error(`Places API Error: ${status}`));
          }
        }
      );
    });
    
    if (!placeDetails) {
      return null;
    }
    
    return transformGooglePlace(placeDetails);
  } catch (error) {
    Logger.error('Error getting place details', { error, placeId });
    return null;
  }
}

/**
 * Transforms a Google Place result into our simplified Place interface
 */
function transformGooglePlace(place: google.maps.places.PlaceResult): Place {
  const simplifiedPlace: Place = {
    place_id: place.place_id || '',
    name: place.name,
    types: place.types,
    vicinity: place.vicinity
  };
  
  if (place.geometry) {
    const geometry: Place['geometry'] = {};
    
    if (place.geometry.location) {
      geometry.location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
    }
    
    if (place.geometry.viewport) {
      geometry.viewport = {
        northeast: {
          lat: place.geometry.viewport.getNorthEast().lat(),
          lng: place.geometry.viewport.getNorthEast().lng()
        },
        southwest: {
          lat: place.geometry.viewport.getSouthWest().lat(),
          lng: place.geometry.viewport.getSouthWest().lng()
        }
      };
    }
    
    simplifiedPlace.geometry = geometry;
  }
  
  return simplifiedPlace;
} 