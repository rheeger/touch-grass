import { MapInstance } from '@/types/maps';
import { GeoCoordinates } from '../outdoors/types';
import { PlaceContext } from '../outdoors/types';
import { getPlaceContext as getContextFromParams } from './context';
import { DEFAULT_PLACE_DETECTION_OPTIONS, PlaceDetectionOptions } from './types';
import { calculateDistance } from './buildings';
import Logger from '@/utils/logger';

/**
 * Map of US state names to their abbreviations
 */
const US_STATES: Record<string, string> = {
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY',
  'district of columbia': 'DC'
};

/**
 * Convert state name to abbreviation if possible
 */
function getStateAbbreviation(stateName: string): string {
  const lowerState = stateName.toLowerCase();
  
  // If it's already an abbreviation (2 uppercase letters), return it
  if (/^[A-Z]{2}$/.test(stateName)) {
    return stateName;
  }
  
  // Check if we have this state in our mapping
  if (US_STATES[lowerState]) {
    return US_STATES[lowerState];
  }
  
  // Special case for state names with "County" suffix
  const withoutCounty = lowerState.replace(/\s+county$/, '');
  if (US_STATES[withoutCounty]) {
    return US_STATES[withoutCounty];
  }
  
  // Return original if we can't convert it
  return stateName;
}

/**
 * Gets place context information for a location
 * 
 * @param coordinates - Location coordinates
 * @param mapInstance - Google Maps instance
 * @param options - Optional detection options
 * @returns Promise resolving to place context
 */
export async function getPlaceContext(
  coordinates: GeoCoordinates,
  mapInstance: MapInstance,
  options?: Partial<PlaceDetectionOptions>
): Promise<PlaceContext> {
  return getContextFromParams({
    coordinates,
    mapInstance,
    options
  });
}

/**
 * Formatted location interface for human-readable locations
 */
export interface FormattedLocation {
  placeName?: string;
  city?: string;
  state?: string;
  country?: string;
  fullAddress: string;
  url?: string;  // Google Maps URL for the location
}

/**
 * Gets a human-readable location from coordinates
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @param mapInstance - Google Maps instance (unused but kept for API compatibility)
 * @returns Promise resolving to formatted location
 */
export async function getFormattedLocationFromService(
  lat: number,
  lng: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mapInstance: MapInstance
): Promise<FormattedLocation> {
  try {
    // Create a geocoder instance
    const geocoder = new google.maps.Geocoder();
    const latLng = { lat, lng };
    
    // Get geocoder results
    const response = await new Promise<google.maps.GeocoderResponse>((resolve, reject) => {
      geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK) {
          resolve({ results } as google.maps.GeocoderResponse);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
    
    // Get all results sorted by most specific (least types) to most general
    const sortedResults = [...response.results].sort(
      (a, b) => (a.types?.length || 0) - (b.types?.length || 0)
    );
    
    // Log all results to see what we're working with
    Logger.debug('Geocoder results', { 
      count: response.results.length,
      results: response.results.map(r => ({
        types: r.types,
        formatted_address: r.formatted_address,
        address_components: r.address_components?.map(c => ({
          types: c.types,
          long_name: c.long_name,
          short_name: c.short_name
        }))
      }))
    });
    
    // The most detailed result
    const address = response.results[0];
    if (!address) {
      throw new Error('No address found');
    }
    
    // Extract components
    let placeName = '';
    let neighborhood = '';
    let city = '';
    let state = '';
    let country = '';
    
    // First check if we have a place result
    // Check for specific place types we're interested in
    const placeTypeOrder = [
      'point_of_interest',
      'establishment',
      'park',
      'natural_feature',
      'premise',
      'transit_station',
      'stadium',
      'landmark'
    ];
    
    // Find the first result that matches any of our priority place types
    let placeResult = null;
    for (const placeType of placeTypeOrder) {
      placeResult = sortedResults.find(result => result.types?.includes(placeType));
      if (placeResult) break;
    }
    
    // Extract place name from place result if available
    if (placeResult) {
      // For place results, take the first part of the formatted address (usually the place name)
      placeName = placeResult.formatted_address.split(',')[0];
      
      // Some places might have their name in a component instead
      if (!placeName && placeResult.address_components?.length > 0) {
        const placeComponent = placeResult.address_components.find(comp => 
          comp.types.some(type => placeTypeOrder.includes(type))
        );
        if (placeComponent) {
          placeName = placeComponent.long_name;
        }
      }
      
      // Check if this is a residential address
      const isResidential = isResidentialAddress(
        placeResult.address_components || [], 
        placeResult.types || []
      );
      
      // If it's residential, remove the house number for privacy
      if (isResidential && placeName) {
        placeName = privacySafeAddress(placeName);
        Logger.debug('Privacy protection applied to residential address', { 
          original: placeResult.formatted_address.split(',')[0],
          sanitized: placeName
        });
      }
    }
    
    // If no place found from place result, extract from address components
    if (!placeName) {
      // Check for street address components
      let streetNumber = '';
      let route = '';
      
      address.address_components?.forEach(component => {
        if (component.types.includes('street_number')) {
          streetNumber = component.long_name;
        } else if (component.types.includes('route')) {
          route = component.long_name;
        } else if (component.types.includes('point_of_interest') || 
            component.types.includes('establishment') ||
            component.types.includes('premise')) {
          placeName = component.long_name;
        } else if (component.types.includes('neighborhood')) {
          neighborhood = component.long_name;
        }
      });
      
      // If we found a street address
      if (!placeName && route) {
        // Check if this appears to be a residential address
        const isResidential = isResidentialAddress(
          address.address_components || [], 
          address.types || []
        );
        
        if (isResidential) {
          // For residential addresses, only show the street name for privacy
          placeName = route;
          Logger.debug('Privacy protection applied to residential street address', { route });
        } else if (streetNumber) {
          // For non-residential, we can show the full address
          placeName = `${streetNumber} ${route}`;
        } else {
          placeName = route;
        }
      }
    }
    
    // Always extract city, state, country from all results
    // Search through all results to find these components
    for (const result of response.results) {
      result.address_components?.forEach(component => {
        // Look for city
        if (!city && (
          component.types.includes('locality') || 
          component.types.includes('sublocality') ||
          component.types.includes('postal_town')
        )) {
          city = component.long_name;
        }
        
        // Look for state/province - preferring the abbreviation (short_name)
        if (!state && component.types.includes('administrative_area_level_1')) {
          // Use short_name if available, otherwise try to convert long_name to abbreviation
          state = component.short_name || getStateAbbreviation(component.long_name);
        }
        
        // Don't use county as state, but use it as fallback if no state is found
        if (!state && component.types.includes('administrative_area_level_2') && 
            !component.long_name.toLowerCase().includes('county')) {
          state = component.short_name || getStateAbbreviation(component.long_name);
        }
        
        // Look for country
        if (!country && component.types.includes('country')) {
          country = component.long_name;
        }
        
        // Look for neighborhood if not found yet
        if (!neighborhood && component.types.includes('neighborhood')) {
          neighborhood = component.long_name;
        }
      });
      
      // If we found city and state and country, no need to check more results
      if (city && state && country) break;
    }
    
    // Prioritize more specific location names
    if (!placeName) {
      if (neighborhood) {
        placeName = `${neighborhood}`;
      } else if (city) {
        placeName = `${city}`;
      } else if (state) {
        placeName = `${state}`;
      } else if (country) {
        placeName = `${country}`;
      } else {
        // If nothing else is available, use coordinates
        placeName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    }
    
    // If we still don't have city, state, country, try to extract from formatted address
    const addressParts = address.formatted_address.split(',').map(p => p.trim());
    
    // If address has multiple parts, the last one is usually the country
    // The second to last is usually the state/postal code
    // And parts before that might include the city
    if (addressParts.length > 2 && !country) {
      country = addressParts[addressParts.length - 1];
    }
    
    if (addressParts.length > 3 && !city) {
      // Usually city is in the second or third position from the end
      // Try to extract it, avoiding postal codes which often contain numbers
      const possibleCity = addressParts[addressParts.length - 3];
      if (possibleCity && !/\d/.test(possibleCity)) {
        city = possibleCity;
      }
    }
    
    if (addressParts.length > 2 && !state) {
      // State is usually in the second-to-last position or part of it
      const statePart = addressParts[addressParts.length - 2];
      
      // Try to extract state abbreviation - typically a 2-letter code
      const stateAbbrevMatch = statePart.match(/\b([A-Z]{2})\b/);
      if (stateAbbrevMatch && stateAbbrevMatch[1]) {
        state = stateAbbrevMatch[1];
      } else {
        // If no abbreviation found, extract alphabetic part, avoiding 'County'
        const stateMatch = statePart.match(/([A-Za-z]+)/g);
        if (stateMatch && stateMatch.length > 0) {
          // Filter out 'County' if present
          const stateWords = stateMatch.filter(word => 
            !word.toLowerCase().includes('county')
          );
          if (stateWords.length > 0) {
            // Try to convert state name to abbreviation
            state = getStateAbbreviation(stateWords[0]);
          }
        }
      }
    }
    
    // Create Google Maps URL
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    
    // Make a final attempt to convert state to abbreviation if it's not already
    if (state && state.length > 2) {
      state = getStateAbbreviation(state);
    }
    
    // Final privacy check - if placeName looks like a street address with a number
    // and we think it might be residential, remove the number
    if (placeName && /^\d+\s+[A-Za-z]/.test(placeName)) {
      // Do a final check for residential address
      const isResidential = isResidentialAddress(
        address.address_components || [], 
        address.types || []
      );
      
      // If it's potentially residential, apply privacy filter
      if (isResidential) {
        placeName = privacySafeAddress(placeName);
        Logger.debug('Final privacy protection applied', { sanitized: placeName });
      }
    }
    
    // Log the final formatted location
    Logger.debug('Formatted location', { placeName, city, state, country, url });
    
    return {
      placeName,
      city,
      state,
      country,
      fullAddress: address.formatted_address || `${lat}, ${lng}`,
      url
    };
  } catch (error) {
    // Log the error
    Logger.error('Error getting formatted location', { error, lat, lng });
    
    // Always return something, even in case of error
    return {
      placeName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city: '',
      state: '',
      country: '',
      fullAddress: `${lat}, ${lng}`,
      url: `https://www.google.com/maps?q=${lat},${lng}`
    };
  }
}

/**
 * Re-export types and constants
 */
export { DEFAULT_PLACE_DETECTION_OPTIONS };
export type { PlaceDetectionOptions };

// Export the calculateDistance function
export { calculateDistance };

/**
 * Helper function to format distances in a human-readable way
 * @param distance - Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000).toLocaleString()}m`;
  }
  return `${Math.round(distance).toLocaleString()}km`;
}

// Re-export additional utilities if needed
export * from './boundaries';
export * from './buildings';

/**
 * Checks if an address appears to be residential based on address components and place types
 */
function isResidentialAddress(addressComponents: google.maps.GeocoderAddressComponent[], placeTypes: string[]): boolean {
  // Check place types that indicate residential areas
  const residentialTypes = [
    'premise',
    'subpremise',
    'street_address',
    'residential',
    'house',
    'home',
    'apartment'
  ];
  
  // If any of these types is found, it's likely residential
  if (placeTypes && placeTypes.some(type => residentialTypes.includes(type))) {
    return true;
  }
  
  // Check if address has a street number but no point_of_interest
  const hasStreetNumber = addressComponents.some(comp => comp.types.includes('street_number'));
  const hasPointOfInterest = addressComponents.some(comp => comp.types.includes('point_of_interest') || 
                                                           comp.types.includes('establishment'));
  
  // If it has a street number but is not a point of interest, it's likely residential
  if (hasStreetNumber && !hasPointOfInterest) {
    return true;
  }
  
  return false;
}

/**
 * Removes house/building number from an address for privacy
 */
function privacySafeAddress(address: string): string {
  // Remove leading numbers (like "123 Main St" → "Main St")
  // This regex matches numbers at the start of the string followed by whitespace
  return address.replace(/^\d+\s+/, '');
} 