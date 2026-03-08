import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, Alert } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import YaMap, { Marker, Polyline } from 'react-native-yamap';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { getOnDemandOrders, getMe, updateOrderStatus, uploadImage } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

export default function OrderTrackingScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { token } = useAuth();
    const router = useRouter();
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];
    const mapRef = useRef<YaMap>(null);
    const [completionPhoto, setCompletionPhoto] = useState<string | null>(null);

    const { data: user } = useQuery({
        queryKey: ['me', token],
        queryFn: () => getMe(token!),
        enabled: !!token,
    });

    const isSpecialist = !!(user?.specialist || user?.isSpecialist);

    // Poll for order updates every 5 seconds
    const { data: orders = [], refetch } = useQuery({
        queryKey: ['on-demand-orders', token],
        queryFn: () => getOnDemandOrders(token!),
        enabled: !!token,
        refetchInterval: 5000,
    });

    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setCompletionPhoto(result.assets[0].uri);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!token || !orderId) return;

        try {
            if (newStatus === 'COMPLETED') {
                if (!completionPhoto) {
                    Alert.alert('Photo Required', 'Please take a photo of the completed work.');
                    return;
                }
                const uploaded = await uploadImage(token, completionPhoto);
                // For simplicity, we assume a fixed price for now, or get it from order if present
                const price = 50000; // 50,000 UZS
                await updateOrderStatus(token, orderId, newStatus, price, uploaded.url);
            } else {
                await updateOrderStatus(token, orderId, newStatus);
            }


            refetch();
            if (newStatus === 'COMPLETED') {
                Alert.alert('Success', 'Job completed and photo uploaded!');
                router.back();
            }
        } catch (err) {
            console.error('Status update failed:', err);
            Alert.alert('Error', 'Failed to update job status.');
        }
    };



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
                    {/* Specialist Actions */}
                    {isSpecialist && (
                        <View style={styles.actionRow}>
                            {order.status === 'ASSIGNED' && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusUpdate('EN_ROUTE')}>
                                    <Text style={styles.actionBtnText}>En Route</Text>
                                </TouchableOpacity>
                            )}
                            {order.status === 'EN_ROUTE' && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusUpdate('ARRIVED')}>
                                    <Text style={styles.actionBtnText}>I have arrived</Text>
                                </TouchableOpacity>
                            )}
                            {order.status === 'ARRIVED' && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusUpdate('IN_PROGRESS')}>
                                    <Text style={styles.actionBtnText}>Start Working</Text>
                                </TouchableOpacity>
                            )}
                            {order.status === 'IN_PROGRESS' && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: completionPhoto ? '#10B981' : '#F59E0B' }]}
                                    onPress={completionPhoto ? () => handleStatusUpdate('COMPLETED') : pickImage}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name={completionPhoto ? "checkmark-circle" : "camera"} size={20} color="#fff" />
                                        <Text style={styles.actionBtnText}>
                                            {completionPhoto ? 'Finish Job' : 'Take Completion Photo'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
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
    warningText: { fontSize: 11, color: '#F59E0B', marginTop: 8, fontWeight: '600' },
    actionRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

