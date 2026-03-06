import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import YaMap, { Marker, Polyline } from 'react-native-yamap';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { getOnDemandOrders } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export default function OrderTrackingScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { token } = useAuth();
    const router = useRouter();
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];
    const mapRef = useRef<YaMap>(null);

    // Poll for order updates every 5 seconds
    const { data: orders = [], refetch } = useQuery({
        queryKey: ['on-demand-orders', token],
        queryFn: () => getOnDemandOrders(token!),
        enabled: !!token,
        refetchInterval: 5000,
    });

    const order = orders.find((o: any) => o.id === orderId);

    useEffect(() => {
        if (order && mapRef.current) {
            const points = [];
            if (order.userLat && order.userLon) {
                points.push({ lat: order.userLat, lon: order.userLon });
            }
            if (order.providerLat && order.providerLon) {
                points.push({ lat: order.providerLat, lon: order.providerLon });
            }

            if (points.length === 2) {
                mapRef.current.fitMarkers(points);
            } else if (points.length === 1) {
                mapRef.current.setCenter(points[0], 15);
            }
        }
    }, [order?.providerLat, order?.providerLon]);

    if (!order) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const isEnRoute = order.status === 'EN_ROUTE';
    const hasProviderLoc = order.providerLat && order.providerLon;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {order.type === 'MOBILE_WASH' ? 'Mobile Wash Tracking' : 'Master Tracking'}
                    </Text>
                    <Text style={[styles.headerStatus, { color: colors.primary }]}>{order.status}</Text>
                </View>
            </View>

            <View style={styles.mapContainer}>
                <YaMap
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                        lat: order.userLat,
                        lon: order.userLon,
                        zoom: 14
                    }}
                    nightMode={scheme === 'dark'}
                >
                    {/* User Location */}
                    <Marker
                        point={{ lat: order.userLat, lon: order.userLon }}
                        scale={1.2}
                    >
                        <View style={styles.userMarker}>
                            <Ionicons name="person" size={20} color="#fff" />
                        </View>
                    </Marker>

                    {/* Provider Location */}
                    {hasProviderLoc && (
                        <Marker
                            point={{ lat: order.providerLat!, lon: order.providerLon! }}
                            scale={1.5}
                        >
                            <View style={[styles.providerMarker, { backgroundColor: colors.primary }]}>
                                <MaterialCommunityIcons
                                    name={order.type === 'MOBILE_WASH' ? "car-wash" : "wrench"}
                                    size={24}
                                    color="#fff"
                                />
                            </View>
                        </Marker>
                    )}
                </YaMap>

                {/* Status Overlay */}
                <View style={[styles.overlay, { backgroundColor: colors.card }]}>
                    <Text style={[styles.overlayTitle, { color: colors.text }]}>
                        {isEnRoute ? 'Master is on the way!' : 'Waiting for appointment...'}
                    </Text>
                    <Text style={[styles.overlaySub, { color: colors.textSecondary }]}>
                        {order.userAddress}
                    </Text>
                    {!hasProviderLoc && isEnRoute && (
                        <Text style={styles.warningText}>Waiting for real-time location...</Text>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    headerStatus: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    mapContainer: { flex: 1 },
    map: { flex: 1 },
    userMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    providerMarker: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
    overlay: { position: 'absolute', bottom: 40, left: 20, right: 20, padding: 20, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 10 },
    overlayTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    overlaySub: { fontSize: 13, fontWeight: '500' },
    warningText: { fontSize: 11, color: '#F59E0B', marginTop: 8, fontWeight: '600' }
});
