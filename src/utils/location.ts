import Logger from './logger';

export interface LocationResult {
  lat: number;
  lng: number;
  isPrecise: boolean;
}

const LOCATION_PREFERENCE_KEY = 'location_preference_status';

export type LocationPreference = 'precise' | 'ip' | undefined;

/**
 * Get the user's stored location preference
 */
export function getLocationPreference(): LocationPreference {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem(LOCATION_PREFERENCE_KEY) as LocationPreference;
}

/**
 * Set the user's location preference
 */
export function setLocationPreference(preference: LocationPreference) {
  if (typeof window === 'undefined') return;
  if (preference) {
    localStorage.setItem(LOCATION_PREFERENCE_KEY, preference);
  } else {
    localStorage.removeItem(LOCATION_PREFERENCE_KEY);
  }
}

/**
 * Get location from IP address using ipapi.co service
 */
export async function getLocationFromIp(): Promise<LocationResult> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      throw new Error(`IP Geolocation failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.latitude || !data.longitude) {
      throw new Error('Invalid location data from IP geolocation');
    }

    return {
      lat: data.latitude,
      lng: data.longitude,
      isPrecise: false
    };
  } catch (error) {
    Logger.error('Error getting location from IP', { error });
    throw error;
  }
}

/**
 * Try to get precise location from the browser
 * @returns Promise that resolves with precise location or rejects if not available/denied
 */
export async function tryPreciseLocation(): Promise<LocationResult> {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser');
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });
  });

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    isPrecise: true
  };
}

/**
 * Get user's location, starting with IP location and then trying precise location
 * @returns Promise that resolves with the initial IP location
 */
export async function getUserLocation(): Promise<LocationResult> {
  try {
    // Always get IP location first
    const ipLocation = await getLocationFromIp();
    return ipLocation;
  } catch (error) {
    Logger.error('Failed to get IP location', { error });
    throw new Error('Could not determine location');
  }
}

/**
 * Request precise location from the browser
 */
export async function requestPreciseLocation(): Promise<LocationResult> {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser');
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });
  });

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    isPrecise: true
  };
}

/**
 * Opt out of precise location and use IP-based location instead
 */
export async function getIpBasedLocation(): Promise<LocationResult> {
  setLocationPreference('ip');
  const ipLocation = await getLocationFromIp();
  return {
    lat: ipLocation.lat,
    lng: ipLocation.lng,
    isPrecise: false
  };
} 