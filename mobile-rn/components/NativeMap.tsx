import React from 'react';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import type { Branch } from '@/lib/api';
import { getFileUrl } from '@/lib/api';
import * as Location from 'expo-location';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Image, TouchableOpacity, Text } from 'react-native';
import { openYandexNavigation, RoutePoint } from '@/lib/navigation';

interface NativeMapProps {
    branches: Branch[];
    selectedBranchId?: string | null;
    onBranchSelect?: (branch: Branch) => void;
    routePoints?: RoutePoint[];
    onStartNavigation?: (branch: Branch) => void;
    isNavigating?: boolean;
}

const INITIAL_REGION = {
    latitude: 41.2995,
    longitude: 69.2401,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
};

const getMarkerIcon = (type: string) => {
    switch (type) {
        case 'CAR_WASH':
            return 'car-wash';
        case 'GAS_STATION':
            return 'gas-station';
        case 'SERVICE':
            return 'wrench';
        default:
            return 'map-marker';
    }
};

const getMarkerColor = (type: string) => {
    switch (type) {
        case 'CAR_WASH':
            return '#3b82f6'; // blue-500
        case 'GAS_STATION':
            return '#ef4444'; // red-500
        case 'SERVICE':
            return '#eab308'; // yellow-500
        default:
            return '#64748b'; // slate-500
    }
};

const DARK_MAP_STYLE = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#1e293b" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#94a3b8" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#0f172a" }]
    },
    {
        "featureType": "administrative",
        "elementType": "geometry",
        "stylers": [{ "color": "#334155" }]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{ "color": "#334155" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#94a3b8" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#334155" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [{ "color": "#1e293b" }]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#64748b" }]
    },
    {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [{ "color": "#1e293b" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#0f172a" }]
    }
];

export default function NativeMap({ branches, selectedBranchId, onBranchSelect, routePoints, onStartNavigation, isNavigating }: NativeMapProps) {
    const mapRef = React.useRef<MapView>(null);

    React.useEffect(() => {
        if (branches.length > 0 && mapRef.current && !isNavigating) {
            const coords = branches
                .filter(b => b.location?.coordinates && b.location.coordinates.length >= 2)
                .map(b => ({
                    latitude: b.location!.coordinates[1],
                    longitude: b.location!.coordinates[0]
                }));

            if (coords.length > 0) {
                mapRef.current.fitToCoordinates(coords, {
                    edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
                    animated: true,
                });
            }
        }
    }, [branches, isNavigating]);

    // Handle 3D Navigation Follow
    React.useEffect(() => {
        let subscription: any;
        if (isNavigating && mapRef.current) {
            (async () => {
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: 1000,
                        distanceInterval: 1,
                    },
                    (location) => {
                        if (mapRef.current) {
                            mapRef.current.animateCamera({
                                center: {
                                    latitude: location.coords.latitude,
                                    longitude: location.coords.longitude,
                                },
                                pitch: 45,
                                heading: location.coords.heading || 0,
                                altitude: 1000, // For iOS
                                zoom: 17, // For Android
                            }, { duration: 1000 });
                        }
                    }
                );
            })();
        }
        return () => {
            if (subscription) subscription.remove();
        };
    }, [isNavigating]);

    return (
        <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={INITIAL_REGION}
            provider={PROVIDER_DEFAULT}
            showsUserLocation
            showsMyLocationButton
            customMapStyle={DARK_MAP_STYLE}
        >
            {branches
                .filter((b) => b.location?.coordinates && b.location.coordinates.length >= 2)
                .map((branch) => {
                    const isSelected = selectedBranchId === branch.id;
                    return (
                        <Marker
                            key={branch.id}
                            coordinate={{
                                latitude: branch.location!.coordinates[1],
                                longitude: branch.location!.coordinates[0],
                            }}
                            onPress={() => onBranchSelect?.(branch)}
                        >
                            <View style={[
                                styles.markerContainer,
                                { borderColor: isSelected ? '#3b82f6' : 'white' },
                                isSelected && styles.selectedMarker
                            ]}>
                                <View style={styles.imageInnerContainer}>
                                    {(branch.photoUrl || (branch.images && branch.images.length > 0)) ? (
                                        <Image
                                            source={{ uri: getFileUrl(branch.photoUrl || branch.images![0]) as string }}
                                            style={styles.markerImage}
                                        />
                                    ) : (
                                        <View style={[styles.fallbackContent, { backgroundColor: getMarkerColor(branch.partnerType) }]}>
                                            <MaterialCommunityIcons
                                                name={getMarkerIcon(branch.partnerType) as any}
                                                size={isSelected ? 24 : 18}
                                                color="white"
                                            />
                                        </View>
                                    )}
                                </View>
                                {/* Pointer Tail */}
                                <View style={[styles.markerTail, { backgroundColor: isSelected ? '#3b82f6' : 'white' }]} />
                            </View>

                            {/* Callout/Quick Nav Button when selected */}
                            {isSelected && branch.location?.coordinates?.[1] && (
                                <View style={styles.quickNavWrapper}>
                                    <TouchableOpacity
                                        style={styles.quickNavBtn}
                                        onPress={() => onStartNavigation?.(branch)}
                                    >
                                        <MaterialCommunityIcons name="navigation" size={20} color="#fff" />
                                        <Text style={styles.quickNavText}>ПОЕХАЛИ</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Marker>
                    );
                })}

            {routePoints && routePoints.length > 0 && (
                <Polyline
                    coordinates={routePoints}
                    strokeColor="#3b82f6"
                    strokeWidth={5}
                    lineDashPattern={[0]}
                    geodesic={true}
                />
            )}
        </MapView>
    );
}

const styles = StyleSheet.create({
    map: { width: '100%', height: '100%' },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    imageInnerContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: 'white',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerImage: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
        resizeMode: 'cover',
    },
    fallbackContent: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerTail: {
        width: 10,
        height: 10,
        backgroundColor: 'white',
        transform: [{ rotate: '45deg' }],
        marginTop: -5,
        zIndex: -1,
    },
    selectedMarker: {
        transform: [{ scale: 1.25 }],
    },
    quickNavWrapper: {
        position: 'absolute',
        top: -65,
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    quickNavBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    quickNavText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    }
});
