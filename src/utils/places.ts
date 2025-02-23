// Time utilities
import Logger from '@/utils/logger';

export function getRelativeTimeString(date: Date | string): string {
  const now = new Date();
  const inputDate = date instanceof Date ? date : new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - inputDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

// Distance calculation utilities
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000).toLocaleString()}m`;
  }
  return `${Math.round(distance).toLocaleString()}km`;
}

// Places analysis types and utilities
interface PlacesAnalysisResult {
  isInPark: boolean;
  isInBuilding: boolean;
  placeTypes: string[];
  confidence: number;
  reasons: string[];
  usedFallback?: boolean;
  parkName?: string;
  explanations: {
    positive: string[];
    negative: string[];
  };
  manualOverride?: boolean;
}

export async function analyzePlacesData(
  lat: number, 
  lng: number,
  map: google.maps.Map,
  isManualOverride: boolean = false
): Promise<PlacesAnalysisResult> {
  const service = new google.maps.places.PlacesService(map);
  
  // Initialize result
  const result: PlacesAnalysisResult = {
    isInPark: false,
    isInBuilding: false,
    placeTypes: [],
    confidence: 0,
    reasons: [],
    explanations: {
      positive: [],
      negative: []
    }
  };

  if (isManualOverride) {
    result.manualOverride = true;
    result.isInPark = true;
    result.confidence = 100;
    result.explanations.positive.push("You've overridden grass detection.");
    return result;
  }

  try {
    Logger.info('Starting places analysis', { lat, lng });
    const userLocation = new google.maps.LatLng(lat, lng);
    
    // First check for parks and green spaces
    const nearbyRequest: google.maps.places.PlaceSearchRequest = {
      location: { lat, lng },
      radius: 300,
      type: 'park' // Start with parks
    };

    const nearbyParks = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
      service.nearbySearch(nearbyRequest, async (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          Logger.info('Found parks', { count: results.length });
          // Also search for golf courses
          const golfRequest: google.maps.places.PlaceSearchRequest = {
            location: { lat, lng },
            radius: 300,
            type: 'golf_course'
          };
          
          try {
            const golfResults = await new Promise<google.maps.places.PlaceResult[]>((resolveGolf) => {
              service.nearbySearch(golfRequest, (golfPlaces, golfStatus) => {
                if (golfStatus === google.maps.places.PlacesServiceStatus.OK && golfPlaces) {
                  resolveGolf(golfPlaces);
                } else {
                  resolveGolf([]);
                }
              });
            });
            
            resolve([...results, ...golfResults]);
          } catch {
            resolve(results); // Fall back to just park results if golf search fails
          }
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          Logger.info('No parks found, checking recreational areas');
          // Try other recreational areas
          const recRequest: google.maps.places.PlaceSearchRequest = {
            location: { lat, lng },
            radius: 300,
            type: 'campground'
          };
          
          service.nearbySearch(recRequest, (recResults, recStatus) => {
            if (recStatus === google.maps.places.PlacesServiceStatus.OK && recResults) {
              resolve(recResults);
            } else {
              resolve([]);
            }
          });
        } else {
          Logger.error('Places API Error', { status });
          reject(new Error(`Places API Error: ${status}`));
        }
      });
    });

    // Check for natural areas and recreational spaces
    const grassyPlaceTypes = new Set([
      'golf_course',
      'park',
      'campground',
      'stadium',
      'amusement_park',
      'athletic_field',
      'sports_complex',
      'natural_feature'
    ]);

    // For each potential green space, get detailed geometry
    for (const place of nearbyParks) {
      if (!place.place_id) continue;

      // If it's a known grassy place type, increase confidence
      if (place.types?.some(type => grassyPlaceTypes.has(type))) {
        result.isInPark = true;
        result.confidence = 90;
        result.parkName = place.name;
        result.explanations.positive = [`You're at ${place.name || 'an outdoor recreational area'}.`];
        Logger.info('Found grassy area', { name: place.name });
        break;
      }

      const details = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        service.getDetails(
          {
            placeId: place.place_id!,
            fields: ['geometry', 'name', 'type', 'formatted_address']
          },
          (placeDetails, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
              resolve(placeDetails);
            } else {
              Logger.error('Error getting place details', { status });
              reject(new Error(`Places API Error: ${status}`));
            }
          }
        );
      });

      // Check boundaries and characteristics
      if (details.geometry) {
        let isInside = false;
        let isVeryClose = false;

        if (details.geometry.viewport) {
          isInside = details.geometry.viewport.contains(userLocation);
        }
        
        if (details.geometry.location) {
          const distance = google.maps.geometry.spherical.computeDistanceBetween(userLocation, details.geometry.location);
          isVeryClose = distance < 30; // Within 30 meters
          
          if (isInside) {
            result.isInPark = true;
            result.parkName = details.name;
            result.confidence = 90;
            // Customize message based on place type
            if (details.types?.includes('golf_course')) {
              result.explanations.positive = ["You're on a golf course."];
            } else if (details.types?.some(type => grassyPlaceTypes.has(type))) {
              result.explanations.positive = [`You're at ${details.name || 'an outdoor recreational area'}.`];
            } else {
              result.explanations.positive = [`You're in ${details.name || 'a park'}.`];
            }
            Logger.info('Inside grassy area', { name: details.name });
            break;
          } else if (isVeryClose) {
            result.explanations.negative = [`You're near ${details.name}, but not quite in a grassy area.`];
            Logger.debug('Near but not in grassy area', { name: details.name });
          }
        }
      }
    }

    // Check for buildings and urban features with a much larger radius to be sure
    const nearbyPlaces = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
      service.nearbySearch({
        location: { lat, lng },
        radius: 45, // ~45 meters/50 yards
        type: 'establishment'
      }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          Logger.error('Error checking for buildings', { status });
          reject(new Error(`Places API Error: ${status}`));
        }
      });
    });

    // Analyze the immediate surroundings
    if (nearbyPlaces.length > 0) {
      const buildingTypes = new Set<string>();
      // Buildings that definitely preclude grass
      const definiteBuildings = [
        // Residential
        'residential', 'home_goods_store', 'real_estate_agency', 'roofing_contractor',
        'lodging', 'apartment_complex', 'housing_development', 'condominium',
        'dwelling', 'house', 'apartment', 'residential_area', 'townhouse',
        
        // Parking and Transportation
        'parking', 'parking_lot', 'parking_garage', 'transit_station', 'bus_station', 
        'train_station', 'subway_station', 'taxi_stand', 'airport', 'airport_terminal',
        
        // Commercial/Retail
        'store', 'shopping_mall', 'supermarket', 'convenience_store', 'department_store',
        'clothing_store', 'electronics_store', 'furniture_store', 'hardware_store',
        'home_goods_store', 'jewelry_store', 'shoe_store', 'shopping_center',
        
        // Food and Dining
        'restaurant', 'cafe', 'bar', 'night_club', 'bakery', 'food_court',
        'meal_takeaway', 'meal_delivery',
        
        // Automotive
        'gas_station', 'car_dealer', 'car_rental', 'car_repair', 'car_wash',
        
        // Business and Services
        'bank', 'atm', 'post_office', 'local_government_office', 'courthouse',
        'police', 'fire_station', 'storage', 'moving_company', 'laundry',
        'dry_cleaning', 'insurance_agency', 'accounting', 'beauty_salon',
        'hair_care', 'spa',
        
        // Indoor Entertainment
        'movie_theater', 'bowling_alley', 'casino', 'gym', 'fitness_center',
        
        // Industrial
        'factory', 'warehouse', 'industrial_park', 'distribution_center',
        'shipping_facility', 'construction_site'
      ];

      let hasDefiniteBuilding = false;
      for (const place of nearbyPlaces) {
        if (place.types) {
          place.types.forEach(type => buildingTypes.add(type));
          
          // Check for residential areas in the place name as well
          const isResidential = place.types.some(type => definiteBuildings.includes(type)) ||
            (place.name && /apartment|house|home|residential|condo|townhouse/i.test(place.name));
          
          if (isResidential) {
            hasDefiniteBuilding = true;
            result.explanations.negative = ["You're in a built out area."];
            break;
          } else if (place.types.some(type => definiteBuildings.includes(type))) {
            hasDefiniteBuilding = true;
            result.explanations.negative = [`You're too close to ${place.name || 'a building'}.`];
            break;
          }
        }
      }
      result.placeTypes = Array.from(buildingTypes);
      result.isInBuilding = hasDefiniteBuilding;
    }

    // Satellite view analysis - Only use as supporting evidence
    if (map.getMapTypeId() === 'satellite' && map.getZoom()! >= 18) {
      if (!result.isInBuilding) {
        // Only boost confidence if we already have other evidence
        if (result.isInPark) {
          result.confidence = Math.max(result.confidence, 85);
        }
      }
    }

    // If we're in a building, override other positive signals
    if (result.isInBuilding) {
      result.isInPark = false;
      result.confidence = 0;
      return result;
    }

    // Final determination - require more evidence than just being away from buildings
    if (!result.isInBuilding && !result.explanations.positive.length) {
      // Check if we're in what appears to be wilderness (no establishments found)
      if (nearbyPlaces.length === 0 && map.getMapTypeId() === 'satellite' && map.getZoom()! >= 18) {
        result.isInPark = true;
        result.confidence = 75;
        result.explanations.positive = ["You appear to be in a remote natural area."];
      } else {
        // Default to not touching grass if we don't have strong evidence
        result.isInPark = false;
        result.confidence = 0;
        result.explanations.negative = ["We can't confirm you're in a grassy area."];
      }
    }

    Logger.info('Analysis complete', {
      isInPark: result.isInPark,
      confidence: result.confidence,
      parkName: result.parkName
    });
    
    return result;

  } catch (error) {
    Logger.error('Analysis failed', { error });
    throw error;
  }
}

// Location formatting utilities
export interface FormattedLocation {
  placeName?: string;
  city?: string;
  state?: string;
  country?: string;
  fullAddress: string;
  url?: string;  // Google Maps URL for the location
}

export async function getHumanReadableLocation(
  lat: number,
  lng: number,
  map: google.maps.Map
): Promise<FormattedLocation> {
  const geocoder = new google.maps.Geocoder();
  
  try {
    // First check if we can get a grass analysis result
    const grassAnalysis = await analyzePlacesData(lat, lng, map);
    
    const response = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        }
      );
    });

    if (!response.length) {
      return {
        fullAddress: "Unknown location",
        url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      };
    }

    const result = response[0];
    const components = result.address_components;
    const formattedLocation: FormattedLocation = {
      fullAddress: result.formatted_address,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.formatted_address)}`
    };

    // If we have a valid grass result with high confidence, use that for the place name
    if (grassAnalysis.isInPark && grassAnalysis.confidence >= 75) {
      formattedLocation.placeName = grassAnalysis.parkName || "Natural Area";
      if (grassAnalysis.parkName) {
        formattedLocation.url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(grassAnalysis.parkName)}`;
      }
      
      // Extract other components for context
      for (const component of components) {
        if (component.types.includes('locality')) {
          formattedLocation.city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          formattedLocation.state = component.long_name;
        }
        if (component.types.includes('country')) {
          formattedLocation.country = component.long_name;
        }
      }
      
      return formattedLocation;
    }

    // Check if location is residential
    const isResidential = result.types.some(type => 
      ['premise', 'subpremise', 'street_address', 'route', 'residential'].includes(type)
    );

    // Extract relevant components
    let foundNeighborhood = false;
    for (const component of components) {
      // For residential addresses, prioritize neighborhood
      if (isResidential && component.types.includes('neighborhood')) {
        formattedLocation.placeName = component.long_name;
        foundNeighborhood = true;
      }
      // For non-residential, use point of interest or establishment
      else if (!isResidential && 
        (component.types.includes('point_of_interest') || 
         component.types.includes('establishment'))) {
        formattedLocation.placeName = component.long_name;
      }
      // Get city
      if (component.types.includes('locality')) {
        formattedLocation.city = component.long_name;
      }
      // Get state/province
      if (component.types.includes('administrative_area_level_1')) {
        formattedLocation.state = component.long_name;
      }
      // Get country
      if (component.types.includes('country')) {
        formattedLocation.country = component.long_name;
      }
    }

    // If residential but no neighborhood found, try to get sublocality or other area names
    if (isResidential && !foundNeighborhood) {
      for (const component of components) {
        if (!formattedLocation.placeName) {
          if (component.types.includes('sublocality')) {
            formattedLocation.placeName = component.long_name;
          } else if (component.types.includes('administrative_area_level_2')) {
            formattedLocation.placeName = component.long_name;
          }
        }
      }
    }

    // If still no place name for non-residential location, try nearby places
    if (!isResidential && !formattedLocation.placeName) {
      const service = new google.maps.places.PlacesService(map);
      try {
        const nearbyPlaces = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
          service.nearbySearch({
            location: { lat, lng },
            radius: 10, // Look for very nearby places
            type: 'point_of_interest' // Focus on public places
          }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              resolve([]);
            } else {
              reject(new Error(`Places API Error: ${status}`));
            }
          });
        });

        // Only use nearby place if it's not residential
        if (nearbyPlaces.length > 0 && 
            !nearbyPlaces[0].types?.some(type => 
              ['premise', 'subpremise', 'street_address', 'route', 'residential'].includes(type)
            )) {
          formattedLocation.placeName = nearbyPlaces[0].name || undefined;
        }
      } catch (error) {
        Logger.error('Error fetching nearby places', { error });
      }
    }

    return formattedLocation;
  } catch (error) {
    Logger.error('Error getting human readable location', { error });
    return {
      fullAddress: "Location unavailable",
      url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    };
  }
} 