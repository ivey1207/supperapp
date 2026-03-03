import { Linking, Platform } from 'react-native';
import polyline from 'polyline-encoded';

export interface RoutePoint {
    latitude: number;
    longitude: number;
}

/**
 * Opens Yandex Maps or Yandex Navigator with given coordinates.
 * Priority: 
 * 1. Yandex Navigator (app)
 * 2. Yandex Maps (app)
 * 3. Browser (Yandex Maps web)
 */
export const openYandexNavigation = async (lat: number, lon: number, name?: string) => {
    // Yandex Navigator: yandexnavi://build_route_on_map?lat_to=...&lon_to=...
    const navigatorUrl = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lon}`;

    // Yandex Maps: yandexmaps://maps.yandex.ru/?rtext=~lat,lon
    const mapsUrl = `yandexmaps://maps.yandex.ru/?rtext=~${lat},${lon}&rtt=mt`; // rtt=mt for public transport, omit or use 'auto'

    // Web Fallback
    const webUrl = `https://yandex.uz/maps/?rtext=~${lat},${lon}&rtt=auto`;

    try {
        const canOpenNavigator = await Linking.canOpenURL(navigatorUrl);
        if (canOpenNavigator) {
            await Linking.openURL(navigatorUrl);
            return;
        }

        const canOpenMaps = await Linking.canOpenURL(mapsUrl);
        if (canOpenMaps) {
            await Linking.openURL(mapsUrl);
            return;
        }

        // Fallback to Web
        await Linking.openURL(webUrl);
    } catch (error) {
        console.error('Error opening Yandex Maps:', error);
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
        const url = `http://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=polyline`;
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
