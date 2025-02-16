declare module '@/app/page' {
  import { ComponentType } from 'react';
  
  export interface HomePageProps {
    simulateError?: boolean;
  }
  
  const HomePage: ComponentType<HomePageProps>;
  export default HomePage;
}

declare module '@/utils/grassDetection' {
  export interface GrassDetectionResult {
    isTouchingGrass: boolean;
    confidence: number;
    reasons: string[];
    explanations: {
      positive: string[];
      negative: string[];
    };
    debugInfo?: {
      isInPark?: boolean;
      isInBuilding?: boolean;
      placeTypes?: string[];
    };
  }
  
  export function analyzeGrass(
    lat: number,
    lng: number,
    map: google.maps.Map,
    isManualOverride: boolean
  ): Promise<GrassDetectionResult>;
}

declare module '@/utils/attestationHelpers'; 