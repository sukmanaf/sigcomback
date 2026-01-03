/**
 * Map Configuration
 * Change these values to adjust initial map center for different project/city
 */

export const mapConfig = {
    // Initial center coordinates (Pasuruan)
    center: {
        lat: parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LAT || '-7.61'),
        lng: parseFloat(process.env.NEXT_PUBLIC_MAP_CENTER_LNG || '112.9075'),
    },
    // Initial zoom level
    initialZoom: parseInt(process.env.NEXT_PUBLIC_MAP_INITIAL_ZOOM || '14'),
    // Maximum zoom level
    maxZoom: 21,
};

// For client-side usage
export const getMapCenter = (): [number, number] => [
    mapConfig.center.lat,
    mapConfig.center.lng,
];

export const getInitialZoom = (): number => mapConfig.initialZoom;
