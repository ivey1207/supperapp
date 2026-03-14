import React from 'react';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import type { Branch } from '@/lib/api';
import { getFileUrl } from '@/lib/api';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Image, TouchableOpacity, Text, useColorScheme } from 'react-native';
import { RoutePoint } from '@/lib/navigation';
import Colors from '@/constants/Colors';

interface NativeMapProps {
    branches: Branch[];
    selectedBranchId?: string | null;
    onBranchSelect?: (branch: Branch) => void;
    routePoints?: RoutePoint[];
    onStartNavigation?: (branch: Branch) => void;
    onStopNavigation?: () => void;
    isNavigating?: boolean;
}

interface Maneuver {
    lat: number;
    lon: number;
    type: string;
}

const INITIAL_REGION = {
    latitude: 41.2995,
    longitude: 69.2401,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
};

const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#0F172A' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0F172A' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#64748B' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0F172A' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
];

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

const MANEUVER_VOICES: Record<string, string> = {
    'LEFT': 'поверните налево',
    'RIGHT': 'поверните направо',
    'SLIGHT_LEFT': 'держитесь левее',
    'SLIGHT_RIGHT': 'держитесь правее',
    'SHARP_LEFT': 'резко поверните налево',
    'SHARP_RIGHT': 'резко поверните направо',
    'TURN_BACK': 'развернитесь',
    'UTURN': 'развернитесь',
    'ENTER_ROUNDABOUT': 'въезжайте на кольцо',
    'LEAVE_ROUNDABOUT': 'съезжайте с кольца',
    'DESTINATION': 'вы прибыли в пункт назначения',
    'FINISH': 'вы прибыли в пункт назначения',
    'FORWARD': 'продолжайте движение прямо',
    'STAY_LEFT': 'держитесь левее',
    'STAY_RIGHT': 'держитесь правее',
    'WAYPOINT': 'вы проехали промежуточную точку',
};

const MANEUVER_ICONS: Record<string, string> = {
    'LEFT': 'arrow-left-bold',
    'RIGHT': 'arrow-right-bold',
    'SLIGHT_LEFT': 'arrow-top-left-bold-outline',
    'SLIGHT_RIGHT': 'arrow-top-right-bold-outline',
    'SHARP_LEFT': 'arrow-bottom-left-bold',
    'SHARP_RIGHT': 'arrow-bottom-right-bold',
    'TURN_BACK': 'arrow-u-down-left-bold',
    'UTURN': 'arrow-u-down-left-bold',
    'ENTER_ROUNDABOUT': 'rotate-right',
    'LEAVE_ROUNDABOUT': 'arrow-top-right-bold-outline',
    'DESTINATION': 'map-marker-check',
    'FINISH': 'map-marker-check',
    'FORWARD': 'arrow-up-bold',
    'STAY_LEFT': 'arrow-top-left-bold-outline',
    'STAY_RIGHT': 'arrow-top-right-bold-outline',
    'WAYPOINT': 'flag-checkered',
};

import { Audio } from 'expo-av';

// Alisa-like voice settings
const speakAlisa = async (text: string) => {
    console.log('Alisa attempt:', text);
    try {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false
        });

        const isSpeaking = await Speech.isSpeakingAsync();
        if (isSpeaking) {
            await Speech.stop();
        }

        setTimeout(() => {
            Speech.speak(text, {
                language: 'ru-RU',
                pitch: 1.05,
                rate: 0.95,
                onStart: () => console.log('Speech started:', text),
                onDone: () => console.log('Speech done'),
                onError: (err) => console.log('Speech error:', err),
            });
        }, 100);
    } catch (e) {
        console.error('Alisa speech failed:', e);
    }
};

const formatDistanceHUD = (meters: number): string => {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)} км`;
    }
    return `${Math.round(meters)} м`;
};

const formatETA = (distMeters: number): string => {
    const minutes = Math.ceil(distMeters / (40000 / 60));
    if (minutes < 1) return '< 1 мин';
    if (minutes >= 60) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h} ч ${m} мин`;
    }
    return `${minutes} мин`;
};

const getArrivalTime = (distMeters: number): string => {
    const now = new Date();
    const minutes = Math.max(1, Math.ceil(distMeters / 666));
    now.setMinutes(now.getMinutes() + minutes);
    return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
};

function calculateDistance(p1: { lat: number, lon: number }, p2: { lat: number, lon: number }) {
    const R = 6371e3;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lon - p1.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function NativeMap({ branches, selectedBranchId, onBranchSelect, routePoints, onStartNavigation, onStopNavigation, isNavigating }: NativeMapProps) {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];
    const mapRef = React.useRef<MapView>(null);
    const [userLoc, setUserLoc] = React.useState<Location.LocationObjectCoords | null>(null);
    const [hasCenteredOnUser, setHasCenteredOnUser] = React.useState(false);
    const [isTrafficVisible, setIsTrafficVisible] = React.useState(true);
    const [maneuvers, setManeuvers] = React.useState<Maneuver[]>([]);
    const [nextManeuverIdx, setNextManeuverIdx] = React.useState(0);
    const [lastSpokenDist, setLastSpokenDist] = React.useState<number | null>(null);
    const [totalRouteDist, setTotalRouteDist] = React.useState(0);
    const [distToNextManeuver, setDistToNextManeuver] = React.useState(0);
    const [distToDestination, setDistToDestination] = React.useState(0);
    const navStartTimeRef = React.useRef<Date | null>(null);

    // Continuous High Accuracy Location Tracking
    React.useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            try {
                const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setUserLoc(initial.coords);
            } catch (e) {
                console.log('Fast fix failed, waiting for watch...');
            }

            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 1000,
                    distanceInterval: 1,
                },
                (location) => {
                    console.log('Location Update:', location.coords.latitude, location.coords.longitude);
                    setUserLoc(location.coords);

                    if (!hasCenteredOnUser && !isNavigating && mapRef.current) {
                        mapRef.current.animateToRegion({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }, 600);
                        setHasCenteredOnUser(true);
                    }
                }
            );
        })();

        return () => {
            if (subscription) subscription.remove();
        };
    }, [hasCenteredOnUser, isNavigating]);

    const jumpToUserLocation = () => {
        if (userLoc && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: userLoc.latitude,
                longitude: userLoc.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 600);
        }
    };

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
                    edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
                    animated: true,
                });
            }
        }
    }, [branches, isNavigating]);

    // Start navigation — use OSRM route (routePoints already contains the route)
    React.useEffect(() => {
        if (isNavigating && mapRef.current && routePoints && routePoints.length > 0) {
            const start = userLoc
                ? { latitude: userLoc.latitude, longitude: userLoc.longitude }
                : { latitude: INITIAL_REGION.latitude, longitude: INITIAL_REGION.longitude };

            // Zoom into nav mode
            mapRef.current.animateToRegion({
                latitude: start.latitude,
                longitude: start.longitude,
                latitudeDelta: 0.003,
                longitudeDelta: 0.003,
            }, 1000);

            // Welcome announcement — Alisa style
            setTimeout(() => {
                speakAlisa(`Маршрут построен. Поехали!`);
            }, 500);

            // Calculate total distance from route points
            let totalDist = 0;
            for (let i = 1; i < routePoints.length; i++) {
                totalDist += calculateDistance(
                    { lat: routePoints[i - 1].latitude, lon: routePoints[i - 1].longitude },
                    { lat: routePoints[i].latitude, lon: routePoints[i].longitude }
                );
            }
            setTotalRouteDist(totalDist);
            setDistToDestination(totalDist);
        }
    }, [isNavigating, selectedBranchId]);

    // Continuous camera follow during navigation
    React.useEffect(() => {
        if (isNavigating && userLoc && mapRef.current) {
            mapRef.current.animateCamera({
                center: {
                    latitude: userLoc.latitude,
                    longitude: userLoc.longitude,
                },
                pitch: 45,
                heading: userLoc.heading || 0,
                zoom: 18,
            }, { duration: 800 });
        }
    }, [userLoc?.latitude, userLoc?.longitude, userLoc?.heading, isNavigating]);

    // Cleanup when navigation stops
    React.useEffect(() => {
        if (!isNavigating) {
            Speech.stop();
            setManeuvers([]);
            setNextManeuverIdx(0);
            setTotalRouteDist(0);
            setDistToDestination(0);
            navStartTimeRef.current = null;
        }
    }, [isNavigating]);

    // Voice Guidance Loop — Alisa style with progressive distance alerts
    React.useEffect(() => {
        if (!isNavigating || !userLoc) return;

        // Update distance to destination
        if (routePoints && routePoints.length > 1) {
            const dest = routePoints[routePoints.length - 1];
            const destDist = calculateDistance(
                { lat: userLoc.latitude, lon: userLoc.longitude },
                { lat: dest.latitude, lon: dest.longitude }
            );

            if (destDist > 5) {
                setDistToDestination(destDist);
            }

            // Arrival detection
            if (destDist > 0 && destDist < 30) {
                speakAlisa('Вы прибыли в пункт назначения. Хорошего дня!');
                setManeuvers([]);
                return;
            }
        }

        if (maneuvers.length === 0 || nextManeuverIdx >= maneuvers.length) return;

        const maneuver = maneuvers[nextManeuverIdx];
        const dist = calculateDistance(
            { lat: userLoc.latitude, lon: userLoc.longitude },
            { lat: maneuver.lat, lon: maneuver.lon }
        );

        setDistToNextManeuver(dist);

        const instruction = MANEUVER_VOICES[maneuver.type] || 'продолжайте движение';

        const announceOnce = (text: string, threshold: number) => {
            if (lastSpokenDist !== threshold) {
                speakAlisa(text);
                setLastSpokenDist(threshold);
            }
        };

        // Progressive distance announcements like Navigator
        if (dist < 30) {
            const capitalInstruction = instruction.charAt(0).toUpperCase() + instruction.slice(1);
            announceOnce(capitalInstruction, 30);
            setNextManeuverIdx(prev => prev + 1);
            setLastSpokenDist(null);
        } else if (dist < 100 && dist > 60) {
            announceOnce(`Через сто метров ${instruction}`, 100);
        } else if (dist < 300 && dist > 250) {
            announceOnce(`Через триста метров ${instruction}`, 300);
        } else if (dist < 500 && dist > 450) {
            announceOnce(`Через пятьсот метров ${instruction}`, 500);
        } else if (dist < 800 && dist > 750) {
            announceOnce(`Через восемьсот метров ${instruction}`, 800);
        } else if (dist >= 2000 && dist < 2100 && lastSpokenDist !== 2000) {
            announceOnce(`Через два километра ${instruction}`, 2000);
        }

    }, [userLoc, isNavigating, maneuvers, nextManeuverIdx, lastSpokenDist, routePoints]);

    return (
        <View style={styles.outerContainer}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={INITIAL_REGION}
                showsUserLocation={!isNavigating}
                showsMyLocationButton={false}
                showsTraffic={isTrafficVisible}
                customMapStyle={scheme === 'dark' ? darkMapStyle : undefined}
            >
                {/* Branch markers when not navigating */}
                {!isNavigating && branches
                    .filter((b) => b.location?.coordinates && b.location.coordinates.length >= 2)
                    .map((branch) => {
                        const isSelected = selectedBranchId === branch.id;
                        return (
                            <Marker
                                key={branch.id}
                                coordinate={{
                                    latitude: branch.location!.coordinates[1],
                                    longitude: branch.location!.coordinates[0]
                                }}
                                onPress={() => onBranchSelect?.(branch)}
                            >
                                <View style={styles.markerWrapper}>
                                    <View style={[
                                        styles.markerContainer,
                                        { backgroundColor: isSelected ? '#3B82F6' : 'white' },
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
                                                        size={isSelected ? 20 : 16}
                                                        color="white"
                                                    />
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <View style={[styles.markerTail, { borderTopColor: isSelected ? '#3B82F6' : 'white' }]} />
                                    {isSelected && (
                                        <View style={styles.quickNavWrapper}>
                                            <TouchableOpacity
                                                style={styles.quickNavBtn}
                                                onPress={() => onStartNavigation?.(branch)}
                                            >
                                                <Text style={styles.quickNavText}>GO</Text>
                                                <MaterialCommunityIcons name="chevron-right" size={16} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </Marker>
                        );
                    })}

                {/* Destination marker when navigating */}
                {isNavigating && branches.find(b => b.id === selectedBranchId) && (() => {
                    const b = branches.find(b => b.id === selectedBranchId)!;
                    return (
                        <Marker
                            coordinate={{
                                latitude: b.location!.coordinates[1],
                                longitude: b.location!.coordinates[0]
                            }}
                            zIndex={300}
                        >
                            <View style={[styles.markerContainer, { backgroundColor: '#EF4444' }]}>
                                <MaterialCommunityIcons name="flag-checkered" size={24} color="white" />
                            </View>
                        </Marker>
                    );
                })()}

                {/* User position arrow when navigating */}
                {isNavigating && userLoc && (
                    <Marker
                        coordinate={{ latitude: userLoc.latitude, longitude: userLoc.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat={true}
                        zIndex={500}
                    >
                        <View style={styles.arrowMarker}>
                            <MaterialCommunityIcons
                                name="navigation"
                                size={50}
                                color="#3B82F6"
                                style={{ transform: [{ rotate: `${userLoc.heading || 0}deg` }] }}
                            />
                        </View>
                    </Marker>
                )}

                {/* Route polyline */}
                {routePoints && routePoints.length > 0 && (
                    <Polyline
                        coordinates={routePoints.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
                        strokeColor="#10B981"
                        strokeWidth={6}
                        zIndex={200}
                    />
                )}
            </MapView>

            {isNavigating && (
                <>
                    {/* Top Guidance HUD */}
                    <View style={styles.guidanceHUD}>
                        <View style={styles.guidanceIconWrapper}>
                            <MaterialCommunityIcons
                                name={((maneuvers.length > 0 && nextManeuverIdx < maneuvers.length
                                    ? MANEUVER_ICONS[maneuvers[nextManeuverIdx].type]
                                    : 'arrow-up-bold') || 'arrow-up-bold') as any}
                                size={32}
                                color="#fff"
                            />
                        </View>
                        <View style={styles.guidanceTextWrapper}>
                            <Text style={styles.guidanceDist}>
                                {(maneuvers.length > 0 && nextManeuverIdx < maneuvers.length && distToNextManeuver > 10)
                                    ? formatDistanceHUD(distToNextManeuver)
                                    : (distToDestination > 10 ? formatDistanceHUD(distToDestination) : '...')}
                            </Text>
                            <Text style={styles.guidanceStreet} numberOfLines={1}>
                                {maneuvers.length > 0 && nextManeuverIdx < maneuvers.length
                                    ? (MANEUVER_VOICES[maneuvers[nextManeuverIdx].type] || 'Продолжайте движение').toUpperCase()
                                    : 'Прямо к цели'.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    {/* Bottom Navigation HUD */}
                    <View style={styles.bottomBar}>
                        <View style={styles.bottomStats}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>
                                    {formatDistanceHUD(distToDestination)}
                                </Text>
                                <Text style={styles.statLabel}>Distance</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>
                                    {getArrivalTime(distToDestination)}
                                </Text>
                                <Text style={styles.statLabel}>Arrival</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>
                                    {formatETA(distToDestination)}
                                </Text>
                                <Text style={styles.statLabel}>Time</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.closeNavBtn}
                            onPress={() => {
                                onStopNavigation?.();
                            }}
                        >
                            <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {!isNavigating && (
                <View style={styles.floatingControls}>
                    <TouchableOpacity
                        style={styles.mapControlBtn}
                        onPress={() => {
                            setIsTrafficVisible(prev => !prev);
                        }}
                    >
                        <MaterialCommunityIcons
                            name={isTrafficVisible ? "traffic-light" : "traffic-light-outline"}
                            size={24}
                            color={isTrafficVisible ? "#10B981" : "#64748B"}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.mapControlBtn}
                        onPress={jumpToUserLocation}
                    >
                        <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#3B82F6" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    map: { width: '100%', height: '100%' },
    markerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        padding: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
    },
    imageInnerContainer: {
        flex: 1,
        borderRadius: 21,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    fallbackContent: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerTail: {
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'white',
        marginTop: -1,
    },
    selectedMarker: {
        transform: [{ scale: 1.15 }],
    },
    quickNavWrapper: {
        position: 'absolute',
        top: -45,
        backgroundColor: '#3B82F6',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 10,
    },
    quickNavBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    quickNavText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
    },
    outerContainer: { flex: 1 },
    arrowMarker: {
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guidanceHUD: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: '#3B82F6',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    guidanceIconWrapper: {
        width: 56,
        height: 56,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guidanceTextWrapper: { flex: 1, gap: 2 },
    guidanceDist: { fontSize: 26, fontWeight: '900', color: '#fff', lineHeight: 28 },
    guidanceStreet: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
    bottomBar: {
        position: 'absolute',
        bottom: 120,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 10,
    },
    bottomStats: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    statItem: { alignItems: 'center', gap: 2 },
    statValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
    statLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
    statDivider: { width: 1, height: 24, backgroundColor: '#F1F5F9' },
    closeNavBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    floatingControls: {
        position: 'absolute',
        bottom: 110,
        right: 20,
        gap: 12,
    },
    mapControlBtn: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
});
