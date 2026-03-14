import { Linking, Platform } from 'react-native';
import polyline from 'polyline-encoded';

export interface RoutePoint {
    latitude: number;
    longitude: number;
}

/**
 * Opens Google Maps with given coordinates for navigation.
 * Priority:
 * 1. Google Maps app (deep link)
 * 2. Browser (Google Maps web)
 */
export const openGoogleNavigation = async (lat: number, lon: number, name?: string) => {
    // Google Maps navigation deep link (works on both Android and iOS)
    const googleNavUrl = Platform.select({
        android: `google.navigation:q=${lat},${lon}`,
        ios: `comgooglemaps://?daddr=${lat},${lon}&directionsmode=driving`,
        default: `https://maps.google.com/maps?daddr=${lat},${lon}`,
    });

    // Web fallback
    const webUrl = `https://maps.google.com/maps?daddr=${lat},${lon}`;

    try {
        const canOpen = await Linking.canOpenURL(googleNavUrl);
        if (canOpen) {
            await Linking.openURL(googleNavUrl);
            return;
        }

        // Fallback to Web
        await Linking.openURL(webUrl);
    } catch (error) {
        console.error('Error opening Google Maps:', error);
        // Last resort try web again
        Linking.openURL(webUrl);
    }
};

/**
 * Fetches a route from OSRM between two points
 * @param startLat Latitude of starting point
 * @param startLon Longitude of starting point
 * @param endLat Latitude of destination
 * @param endLon Longitude of destination
 */
export const fetchRoute = async (
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number
): Promise<RoutePoint[]> => {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=polyline`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes?.[0]?.geometry) {
            throw new Error('Could not fetch route');
        }

        const points = polyline.decode(data.routes[0].geometry);
        return points.map(([latitude, longitude]: [number, number]) => ({
            latitude,
            longitude,
        }));
    } catch (error) {
        console.error('Routing error:', error);
        return [];
    }
};
