// Re-export getRelativeTimeString from its dedicated utility file
export { getRelativeTimeString } from './relativeTime';

// Re-export other utility functions
export { 
  getUserLocation, 
  requestPreciseLocation, 
  getLocationFromIp, 
  getLocationPreference,
  setLocationPreference
} from './location';
export { default as Logger } from './logger'; 