import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { getOnDemandOrders, getMe, updateOrderStatus, uploadImage } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { NativeMap, NativeMapHandle } from '@/components/NativeMap';

export default function OrderTrackingScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const { token } = useAuth();
    const router = useRouter();
    const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
    const colors = Colors[scheme];
    const navRef = useRef<NativeMapHandle>(null);
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
                const price = 50000;
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

    const startNav = () => {
        if (order?.userLat && order?.userLon && navRef.current) {
            navRef.current.startNavigation(order.userLat, order.userLon, 'Client Location');
        } else {
            Alert.alert('Error', 'Cannot start navigation: Missing coordinates');
        }
    };

    if (!order) {
        return (
            <View style={[styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const isEnRoute = order.status === 'EN_ROUTE';

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
                <NativeMap 
                    ref={navRef}
                    onArrival={(isFinal) => {
                        if (isFinal) handleStatusUpdate('ARRIVED');
                    }}
                />

                {/* Status Overlay */}
                <View style={[styles.overlay, { backgroundColor: colors.card }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.overlayTitle, { color: colors.text }]}>
                                {isEnRoute ? 'Master is on the way!' : 'Waiting for appointment...'}
                            </Text>
                            <Text style={[styles.overlaySub, { color: colors.textSecondary }]}>
                                {order.userAddress}
                            </Text>
                        </View>
                        {isSpecialist && isEnRoute && (
                            <TouchableOpacity 
                                style={[styles.navLauncher, { backgroundColor: colors.primary }]}
                                onPress={startNav}
                            >
                                <MaterialCommunityIcons name="navigation" size={24} color="#fff" />
                                <Text style={styles.navLauncherText}>NAV</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Specialist Actions */}
                    {isSpecialist && (
                        <View style={styles.actionRow}>
                            {order.status === 'ASSIGNED' && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusUpdate('EN_ROUTE')}>
                                    <Text style={styles.actionBtnText}>En Route</Text>
                                </TouchableOpacity>
                            )}
                            {order.status === 'EN_ROUTE' && (
                                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => handleStatusUpdate('ARRIVED')}>
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
    navLauncher: {
        width: 60,
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    navLauncherText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        marginTop: -4,
    },
});
