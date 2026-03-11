import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { getOnDemandOrders } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import MapboxMap from '@/components/MapboxMap';

export default function OrderTrackingScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { token } = useAuth();
    const router = useRouter();
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];

    // Poll for order updates every 5 seconds
    const { data: orders = [], refetch } = useQuery({
        queryKey: ['on-demand-orders', token],
        queryFn: () => getOnDemandOrders(token!),
        enabled: !!token,
        refetchInterval: 5000,
    });

    const order = orders.find((o: any) => o.id === orderId);

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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView style={styles.headerSafe}>
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
            </SafeAreaView>

            <View style={styles.mapContainer}>
                <MapboxMap 
                    userLocation={order.userLat ? { latitude: order.userLat, longitude: order.userLon } : undefined}
                    providerLocation={hasProviderLoc ? { 
                        latitude: order.providerLat!, 
                        longitude: order.providerLon!, 
                        heading: order.providerHeading // Assuming backend will provide this
                    } : undefined}
                />

                {/* Status Overlay */}
                <View style={[styles.overlay, { backgroundColor: colors.card }]}>
                    <View style={styles.statusInfo}>
                        <View style={styles.statusTextContainer}>
                            <Text style={[styles.overlayTitle, { color: colors.text }]}>
                                {isEnRoute ? 'Master is on the way!' : 'Waiting for appointment...'}
                            </Text>
                            <Text style={[styles.overlaySub, { color: colors.textSecondary }]}>
                                {order.userAddress}
                            </Text>
                        </View>
                        {isEnRoute && hasProviderLoc && (
                            <View style={styles.etaBadge}>
                                <Text style={styles.etaTime}>~8 мин</Text>
                                <Text style={styles.etaLabel}>Прибытие</Text>
                            </View>
                        )}
                    </View>
                    
                    {!hasProviderLoc && isEnRoute && (
                        <Text style={styles.warningText}>Waiting for real-time location...</Text>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerSafe: { 
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerInfo: { marginLeft: 12 },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    headerStatus: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    mapContainer: { flex: 1 },
    overlay: { position: 'absolute', bottom: 40, left: 20, right: 20, padding: 20, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 10 },
    statusInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusTextContainer: { flex: 1 },
    overlayTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    overlaySub: { fontSize: 13, fontWeight: '500' },
    etaBadge: { 
        backgroundColor: '#3B82F6', 
        paddingHorizontal: 16, 
        paddingVertical: 10, 
        borderRadius: 16, 
        alignItems: 'center' 
    },
    etaTime: { color: '#fff', fontSize: 16, fontWeight: '900' },
    etaLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    warningText: { fontSize: 11, color: '#F59E0B', marginTop: 8, fontWeight: '600' }
});
