import { GeoCoordinates } from '../outdoors/types';
import { Place } from './types';

/**
 * Building and indoor place types for accurate detection
 */
export const BUILDING_TYPES = [
  // Residential
  'residential', 'home_goods_store', 'real_estate_agency', 'lodging', 
  'house', 'apartment', 'residential_area', 'sublocality_level_1', 'premise',
  'housing_complex',

  // Commercial/Retail
  'store', 'shopping_mall', 'supermarket', 'department_store',
  'grocery_or_supermarket', 'furniture_store', 'clothing_store', 'hardware_store',
  
  // Food and Dining
  'restaurant', 'cafe', 'bar', 'night_club', 'food_court', 'bakery',
  
  // Business and Services
  'bank', 'atm', 'post_office', 'courthouse', 'police', 'fire_station',
  'insurance_agency', 'accounting', 'finance', 'lawyer', 'dentist', 'doctor',
  
  // Indoor Entertainment
  'movie_theater', 'bowling_alley', 'casino', 'gym', 'fitness_center',
  'spa', 'beauty_salon', 'hair_care',
  
  // Industrial
  'factory', 'warehouse', 'industrial_park',
  
  // Transportation
  'subway_station', 'train_station', 'bus_station', 'transit_station', 'airport',
  'airport_terminal', 'gas_station',
  
  // Education
  'library', 'school', 'primary_school', 'secondary_school', 'book_store'
];

/**
 * Residential area indicator types
 */
export const RESIDENTIAL_AREA_TYPES = [
  'locality', 'sublocality', 'administrative_area_level_3', 'administrative_area_level_4',
  'neighborhood', 'political', 'premise'
];

/**
 * Building name patterns to detect buildings by name
 */
export const BUILDING_NAME_PATTERNS = [
  /apartment|house|home|condo|complex|residence|villa|estate|building/i,
  /restaurant|cafe|store|mall|shop|center|diner|hotel|lodge/i,
  /gym|fitness|studio|office|tower|plaza|court|dorm|hall/i
];

/**
 * Residential area name patterns
 */
export const RESIDENTIAL_AREA_PATTERNS = [
  /neighborhood|community|village|subdivision|district|residential|housing/i,
  /manor|court|park|garden|estate|commons|terrace|heights|vista/i
];

/**
 * Outdoor place types that should never be considered buildings
 */
export const OUTDOOR_EXEMPTION_TYPES = [
  // Parks and natural areas
  'park', 'playground', 'natural_feature', 'campground', 'rv_park', 'forest',
  
  // Sports and recreation
  'athletic_field', 'sports_complex', 'stadium', 'golf_course', 'skate_park',
  
  // Water features
  'beach', 'lake', 'river', 'ocean'
];

/**
 * Checks if a place name indicates an outdoor area that shouldn't be considered a building
 */
export function isOutdoorPlaceName(placeName: string): boolean {
  if (!placeName) return false;
  
  const lowerName = placeName.toLowerCase();
  const outdoorIndicators = [
    'park', 'playground', 'field', 'garden', 'square', 'common', 'green',
    'plaza', 'sports', 'stadium', 'recreational', 'beach', 'lake'
  ];
  
  return outdoorIndicators.some(indicator => lowerName.includes(indicator));
}

/**
 * Determines if a place is likely a building based on its types and name
 * 
 * @param place - Place to check
 * @returns True if likely a building, false otherwise
 */
export function isLikelyBuilding(place: Place): boolean {
  // Check place types for building indicators
  if (place.types && place.types.some(type => BUILDING_TYPES.includes(type))) {
    return true;
  }
  
  // Check place name for building patterns
  if (place.name) {
    const name = place.name;
    if (BUILDING_NAME_PATTERNS.some(pattern => pattern.test(name))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Determines if a place is likely a residential area
 * 
 * @param place - Place to check
 * @returns True if likely a residential area, false otherwise
 */
export function isLikelyResidentialArea(place: Place): boolean {
  // Check place types for residential area indicators
  if (place.types && place.types.some(type => RESIDENTIAL_AREA_TYPES.includes(type))) {
    return true;
  }
  
  // Check place name for residential area patterns
  if (place.name) {
    const name = place.name;
    if (RESIDENTIAL_AREA_PATTERNS.some(pattern => pattern.test(name))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculates the distance between two geographic coordinates in meters
 * 
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @returns Distance in meters
 */
export function calculateDistance(
  coord1: GeoCoordinates,
  coord2: GeoCoordinates
): number {
  // Use Haversine formula to calculate distance
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Finds the nearest building to a location
 * 
 * @param coordinates - Location to check
 * @param places - Places to check for buildings
 * @returns Distance to nearest building in meters, or undefined if none found
 */
export function findNearestBuildingDistance(
  coordinates: GeoCoordinates,
  places: Place[]
): number | undefined {
  const buildings = places.filter(isLikelyBuilding);
  
  if (buildings.length === 0) {
    return undefined;
  }
  
  let nearestDistance: number | undefined = undefined;
  
  for (const building of buildings) {
    if (building.geometry?.location) {
      const distance = calculateDistance(coordinates, building.geometry.location);
      
      if (nearestDistance === undefined || distance < nearestDistance) {
        nearestDistance = distance;
      }
    }
  }
  
  return nearestDistance;
} 