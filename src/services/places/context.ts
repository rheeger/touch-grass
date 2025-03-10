import { GeoCoordinates, PlaceContext } from '../outdoors/types';
import { 
  Boundary, 
  DEFAULT_PLACE_DETECTION_OPTIONS, 
  Place, 
  PlaceDetectionOptions, 
  PlacesServiceParams 
} from './types';
import { 
  createPlacesService, 
  isGoogleMapsAvailable, 
  searchNearbyPlaces, 
  searchPlacesByKeywords 
} from './api';
import { 
  extractBoundaryFromPlace, 
  findContainingBoundaries, 
  isPointInBoundary 
} from './boundaries';
import { 
  BUILDING_TYPES, 
  findNearestBuildingDistance, 
  isLikelyResidentialArea, 
  OUTDOOR_EXEMPTION_TYPES, 
  isOutdoorPlaceName 
} from './buildings';
import Logger from '@/utils/logger';

/**
 * Natural area type indicators for outdoor detection
 */
const NATURAL_AREA_TYPES = [
  'park',
  'campground',
  'natural_feature',
  'forest',
  'trail',
  'nature_reserve',
  'golf_course',
  'stadium',
  'beach',
  'zoo',
  'rv_park',
];

/**
 * Keywords for natural area text search
 */
const NATURAL_AREA_KEYWORDS = [
  'park',
  'forest',
  'trail',
  'nature',
  'preserve',
  'conservation',
  'state park',
  'national park',
  'wildlife refuge',
  'sanctuary',
  'beach',
  'waterfront',
  'river',
  'lake'
];

/**
 * Gets the place context for a location
 * 
 * @param params - Place service parameters
 * @returns Promise resolving to the place context
 */
export async function getPlaceContext(params: PlacesServiceParams): Promise<PlaceContext> {
  const { coordinates, mapInstance, options } = params;
  
  // Merge with default options
  const detectionOptions: PlaceDetectionOptions = {
    ...DEFAULT_PLACE_DETECTION_OPTIONS,
    ...options
  };
  
  // Initialize default place context
  const defaultContext: PlaceContext = {
    coordinates,
    placeTypes: [],
    boundaries: [],
    inBoundary: false,
    isBuilding: false,
    isResidentialArea: false,
    debug: {}
  };
  
  // Check if Google Maps API is available
  if (!isGoogleMapsAvailable()) {
    Logger.error('Google Maps API not available for place context');
    return {
      ...defaultContext,
      debug: { error: 'Google Maps API not available' }
    };
  }
  
  // Check if map instance is valid
  if (!mapInstance) {
    Logger.error('Map instance not available for place context');
    return {
      ...defaultContext,
      debug: { error: 'Map instance not available' }
    };
  }
  
  try {
    // Create places service
    const placesService = createPlacesService(mapInstance);
    if (!placesService) {
      Logger.error('Failed to create Places service');
      return {
        ...defaultContext,
        debug: { error: 'Failed to create Places service' }
      };
    }
    
    // Collect outdoor place types to search for
    const searchTypes = [...NATURAL_AREA_TYPES, ...BUILDING_TYPES];
    
    // Search for nearby places
    const placesResult = await searchNearbyPlaces(
      coordinates, 
      detectionOptions.searchRadius,
      searchTypes,
      placesService
    );
    
    // Search for natural areas by keywords
    let keywordResults: Place[] = [];
    if (detectionOptions.includeKeywordSearch) {
      const keywordSearchResult = await searchPlacesByKeywords(
        coordinates,
        detectionOptions.searchRadius,
        NATURAL_AREA_KEYWORDS,
        placesService
      );
      keywordResults = keywordSearchResult.places;
    }
    
    // Combine all results
    const allPlaces = [...placesResult.places, ...keywordResults];
    
    // Process place context information
    return processPlaceContext(coordinates, allPlaces, detectionOptions);
  } catch (error) {
    Logger.error('Error getting place context', { error, coordinates });
    return {
      ...defaultContext,
      debug: { error: String(error) }
    };
  }
}

/**
 * Processes raw place data into a structured place context
 * 
 * @param coordinates - Location coordinates
 * @param places - Found places
 * @param options - Detection options
 * @returns Place context
 */
function processPlaceContext(
  coordinates: GeoCoordinates,
  places: Place[],
  options: PlaceDetectionOptions
): PlaceContext {
  // Collect all place types
  const placeTypes = collectPlaceTypes(places);
  
  // Extract and check boundaries
  const allBoundaries: Boundary[] = [];
  const boundaryPlaces: Array<{ boundary: Boundary; place: Place; distance: number }> = [];
  
  for (const place of places) {
    const boundary = extractBoundaryFromPlace(place);
    if (boundary) {
      allBoundaries.push(boundary);
      
      if (isPointInBoundary(coordinates, boundary)) {
        boundaryPlaces.push({
          boundary,
          place,
          distance: 0 // Will be calculated later
        });
      }
    }
  }
  
  // Find containing boundaries with distance information
  const containingBoundaries = findContainingBoundaries(coordinates, places);
  
  // Check if the location is inside any boundary
  const inBoundary = containingBoundaries.length > 0;
  
  // Find nearest building distance
  const nearestBuildingDistance = findNearestBuildingDistance(coordinates, places);
  
  // Get all place types for this location
  const allPlaceTypes = collectPlaceTypes(places);
  
  // Check if any exempt outdoor types (playground, park, etc.) are present
  const hasExemptOutdoorType = allPlaceTypes.some(type => 
    OUTDOOR_EXEMPTION_TYPES.includes(type)
  );
  
  // Check if the name indicates an outdoor area like a playground
  const hasOutdoorName = places.some(place => 
    place.name && isOutdoorPlaceName(place.name)
  );
  
  // Check if inside a park or green space boundary
  const isInParkBoundary = containingBoundaries.some(boundary => 
    boundary.place.types?.some(type => 
      ['park', 'campground', 'natural_feature', 'playground'].includes(type)
    )
  );
  
  // Log detailed information for debugging
  if (hasExemptOutdoorType || hasOutdoorName || isInParkBoundary) {
    Logger.debug('Location identified as outdoor area - ignoring building detection', {
      hasExemptOutdoorTypes: hasExemptOutdoorType,
      exemptTypes: allPlaceTypes.filter(type => OUTDOOR_EXEMPTION_TYPES.includes(type)),
      hasOutdoorName,
      isInParkBoundary,
      boundaryTypes: containingBoundaries.map(b => b.place.types).flat().filter(Boolean),
      placeNames: places.map(p => p.name).filter(Boolean),
      coordinates
    });
  }
  
  // Log building detection info when in park boundaries for debugging
  if (isInParkBoundary && nearestBuildingDistance !== undefined) {
    Logger.debug('Building detected near park boundary', {
      nearestBuildingDistance,
      buildingProximityRadius: options.buildingProximityRadius,
      isDisregardingBuildings: true,
      coordinates
    });
  }
  
  // Check if in a building - exclude if it's a known outdoor area or inside a park boundary
  const isInBuilding = !hasExemptOutdoorType && !hasOutdoorName && !isInParkBoundary && 
                       nearestBuildingDistance !== undefined && 
                       nearestBuildingDistance < options.buildingProximityRadius / 2;
  
  // Check if in a residential area
  const isResidentialArea = places.some(isLikelyResidentialArea);
  
  // Get primary place information (if inside a boundary)
  let placeName: string | undefined;
  let distanceToEdge: number | undefined;
  
  if (containingBoundaries.length > 0) {
    // Use the innermost boundary as primary context
    const primaryBoundary = containingBoundaries[0];
    placeName = primaryBoundary.place.name;
    distanceToEdge = primaryBoundary.distance;
  }
  
  // Create final context
  const context: PlaceContext = {
    coordinates,
    placeTypes,
    placeName,
    boundaries: allBoundaries,
    inBoundary,
    isBuilding: isInBuilding,
    isResidentialArea,
    nearestBuildingDistance,
    distanceToEdge,
    debug: {
      placeCount: places.length,
      boundaryCount: allBoundaries.length,
      containingBoundaryCount: containingBoundaries.length,
      primaryPlace: placeName,
      allPlaceNames: places.map(p => p.name).filter(Boolean)
    }
  };
  
  Logger.info('Place context processed', {
    placeTypesCount: placeTypes.length,
    inBoundary,
    isBuilding: isInBuilding,
    isResidentialArea,
    nearestBuildingDistance
  });
  
  return context;
}

/**
 * Collects all unique place types from places
 */
function collectPlaceTypes(places: Place[]): string[] {
  const typeSet = new Set<string>();
  
  for (const place of places) {
    if (place.types) {
      for (const type of place.types) {
        typeSet.add(type);
      }
    }
  }
  
  return Array.from(typeSet);
} 