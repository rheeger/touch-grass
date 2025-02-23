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

export const CIRCLE_SVG = "M 0, 0 m -8, 0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0"; 