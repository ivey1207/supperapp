import React from 'react';
import YaMap, { Marker, Polyline, Animation, ClusteredYamap } from 'react-native-yamap';
// import { ClusteredYamap } from './CustomClusteredYamap';
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

const INITIAL_POINT = {
    lat: 41.2995,
    lon: 69.2401,
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
        // Ensure audio session is correct for voice (prevents silent mode issues)
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

        // Add a tiny delay to ensure stop completes and audio session is ready
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

const formatDistanceVoice = (meters: number): string => {
    if (meters >= 1000) {
        const km = Math.round(meters / 100) / 10;
        const lastDigit = Math.floor(km) % 10;
        const lastTwoDigits = Math.floor(km) % 100;

        let unit = 'километров';
        if (lastTwoDigits < 10 || lastTwoDigits > 20) {
            if (lastDigit === 1) unit = 'километр';
            else if (lastDigit >= 2 && lastDigit <= 4) unit = 'километра';
        }
        return `${km} ${unit}`;
    }
    const rounded = Math.round(meters / 50) * 50; // Round to 50 for realistic feel
    if (rounded < 50) return 'совсем скоро';
    return `${rounded} метров`;
};

const formatDistanceHUD = (meters: number): string => {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)} км`;
    }
    return `${Math.round(meters)} м`;
};

const formatETA = (distMeters: number): string => {
    // ~40 km/h avg city speed
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
    // 40km/h = 666 meters per minute
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
    const mapRef = React.useRef<YaMap>(null);
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

            // Get initial lock faster
            try {
                const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setUserLoc(initial.coords);
            } catch (e) {
                console.log('Fast fix failed, waiting for watch...');
            }

            // Start watching
            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 1000,
                    distanceInterval: 1,
                },
                (location) => {
                    console.log('Location Update:', location.coords.latitude, location.coords.longitude);
                    setUserLoc(location.coords);

                    // Auto-center on first fix if not already navigating
                    if (!hasCenteredOnUser && !isNavigating && mapRef.current) {
                        mapRef.current.setCenter({
                            lat: location.coords.latitude,
                            lon: location.coords.longitude
                        }, 15);
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
            mapRef.current.setCenter({
                lat: userLoc.latitude,
                lon: userLoc.longitude
            }, 16, 0, 0, 600, Animation.SMOOTH);
        }
    };

    React.useEffect(() => {
        if (branches.length > 0 && mapRef.current && !isNavigating) {
            const points = branches
                .filter(b => b.location?.coordinates && b.location.coordinates.length >= 2)
                .map(b => ({
                    lat: b.location!.coordinates[1],
                    lon: b.location!.coordinates[0]
                }));

            if (points.length > 0) {
                mapRef.current.fitMarkers(points);
            }
        }
    }, [branches, isNavigating]);

    // Fetch Yandex native route & maneuvers when navigation starts
    React.useEffect(() => {
        if (isNavigating && mapRef.current && routePoints && routePoints.length > 0) {
            const start = { lat: userLoc?.latitude || INITIAL_POINT.lat, lon: userLoc?.longitude || INITIAL_POINT.lon };
            const end = { lat: routePoints[routePoints.length - 1].latitude, lon: routePoints[routePoints.length - 1].longitude };

            // Calculate total route distance
            let totalDist = 0;
            for (let i = 1; i < routePoints.length; i++) {
                totalDist += calculateDistance(
                    { lat: routePoints[i - 1].latitude, lon: routePoints[i - 1].longitude },
                    { lat: routePoints[i].latitude, lon: routePoints[i].longitude }
                );
            }
            setTotalRouteDist(totalDist);
            setDistToDestination(totalDist);
            navStartTimeRef.current = new Date();

            // Zoom into nav mode
            if (mapRef.current) {
                mapRef.current.setCenter(start, 17, 0, 45, 1000, Animation.SMOOTH);
            }

            // Fit the route
            if (mapRef.current) {
                mapRef.current.fitMarkers([start, end]);
                // If we want to fit all points of the polyline:
                // mapRef.current.fitMarkers(routePoints.map(p => ({ lat: p.latitude, lon: p.longitude })));
            }

            // Welcome announcement — Alisa style
            const distText = formatDistanceVoice(totalDist);
            const etaText = formatETA(totalDist);

            // Delay for stability
            setTimeout(() => {
                speakAlisa(`Маршрут построен. ${distText}, примерно ${etaText}. Поехали!`);
            }, 500);

            // @ts-ignore
            mapRef.current.findDrivingRoutes([start, end], (event: any) => {
                console.log('Voice Nav Event:', JSON.stringify(event));
                if (event && event.status === 'success' && event.routes && event.routes.length > 0) {
                    const route = event.routes[0];
                    const allManeuvers: Maneuver[] = route.maneuvers || route.sections?.[0]?.maneuvers || [];

                    if (allManeuvers.length > 0) {
                        setManeuvers(allManeuvers);
                        setNextManeuverIdx(0);
                        setLastSpokenDist(null);
                        console.log(`Voice Nav Success: ${allManeuvers.length} maneuvers`);
                    } else {
                        // Fallback maneuvers if MapKit is stingy
                        console.log('No maneuvers from MapKit, trying sections...');
                        const fallbackManeuvers = route.sections?.flatMap((s: any) => s.maneuvers || []) || [];
                        setManeuvers(fallbackManeuvers);
                    }
                }
            });
        } else if (!isNavigating) {
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
        if (routePoints && routePoints.length > 1) { // Changed to length > 1
            const dest = routePoints[routePoints.length - 1];
            const destDist = calculateDistance(
                { lat: userLoc.latitude, lon: userLoc.longitude },
                { lat: dest.latitude, lon: dest.longitude }
            );

            // Only update if it's a realistic distance (OSRM might return 0 if stale)
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

        // Progressive distance announcements like Yandex Navigator
        if (dist < 30) {
            // At the maneuver point
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
            <ClusteredYamap
                ref={mapRef as any}
                style={styles.map}
                initialRegion={{
                    lat: INITIAL_POINT.lat,
                    lon: INITIAL_POINT.lon,
                    zoom: 12,
                }}
                showUserPosition={!isNavigating}
                nightMode={scheme === 'dark'}
                clusterColor="#3B82F6"
                clusteredMarkers={
                    branches
                        .filter((b) => b.location?.coordinates && b.location.coordinates.length >= 2)
                        .map((branch) => ({
                            point: { lat: branch.location!.coordinates[1], lon: branch.location!.coordinates[0] },
                            data: branch
                        }))
                }
                renderMarker={(info: any) => {
                    const branch = info.data as Branch;
                    const isSelected = selectedBranchId === branch.id;
                    return (
                        <Marker
                            key={branch.id}
                            point={info.point}
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
                                {/* Pointer Tail */}
                                <View style={[styles.markerTail, { borderTopColor: isSelected ? '#3B82F6' : 'white' }]} />

                                {/* Quick Nav Button when selected */}
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
                }}
            >
                {isNavigating && userLoc && (
                    <Marker
                        point={{ lat: userLoc.latitude, lon: userLoc.longitude }}
                        scale={1.4}
                        anchor={{ x: 0.5, y: 0.5 }}
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
                {routePoints && routePoints.length > 0 && (
                    <Polyline
                        key={`route-main-${routePoints.length}-${selectedBranchId || 'none'}`}
                        points={routePoints.map(p => ({ lat: p.latitude, lon: p.longitude }))}
                        strokeColor="#10B981"
                        strokeWidth={12}
                        outlineColor="#FFFFFF"
                        outlineWidth={2}
                        zIndex={200}
                    />
                )}
            </ClusteredYamap>

            {isNavigating && (
                <>
                    {/* Top Guidance HUD */}
                    <View style={styles.yandexGuidance}>
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
                    <View style={styles.yandexBottomBar}>
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
                            const newState = !isTrafficVisible;
                            setIsTrafficVisible(newState);
                            mapRef.current?.setTrafficVisible(newState);
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
    yandexGuidance: {
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
    yandexBottomBar: {
        position: 'absolute',
        bottom: 120, // Moved MUCH higher to clear system buttons AND tab bar
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
    yandexExternalBtn: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    yandexExternalText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#000',
    }
});
