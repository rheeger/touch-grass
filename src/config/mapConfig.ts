export const mapContainerStyle = {
  width: '100vw',
  height: '100vh',
  position: 'fixed',
  top: 0,
  left: 0,
} as const;

export const MAP_ZOOM = 16;
export const MAP_OFFSET = 0.003;

export const getMapCenter = (lat: number, lng: number) => ({
  lat: lat - MAP_OFFSET,
  lng: lng,
});

export const MARKER_STYLES = `
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.9; }
    100% { transform: scale(1); opacity: 1; }
  }
  .pulsating-dot {
    position: absolute;
    width: 16px;
    height: 16px;
    background-color: #3B82F6;
    border: 2px solid white;
    border-radius: 50%;
    animation: pulse 2s infinite;
    transform: translate(-50%, -50%);
  }
`;

export const mapOptions = {
  mapTypeId: 'hybrid',
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  clickableIcons: false,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy',
  minZoom: 3,
  maxZoom: 28,
} as const;

export const libraries: ("places" | "geometry")[] = ["places", "geometry"];

// Basic pin shape without center dot
export const PIN_SVG = "M 0,0 C -2,-10 -10,-15 -10,-20 A 10,10 0 1,1 10,-20 C 10,-15 2,-10 0,0 z";

// Check mark path for green pins - adjusted for better vertical proportions
export const CHECK_SVG = "M -4,-20 L -1,-15 L 4,-24";

// X mark path for red pins - adjusted for better vertical proportions
export const X_SVG = "M -3.5,-24 L 3.5,-16 M -3.5,-16 L 3.5,-24";

// Large glow circle for production version markers
export const GLOW_CIRCLE_SVG = "M 0,0 m -20,0 a 20,20 0 1,0 40,0 a 20,20 0 1,0 -40,0";

export const CIRCLE_SVG = "M 0, 0 m -8, 0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0"; 