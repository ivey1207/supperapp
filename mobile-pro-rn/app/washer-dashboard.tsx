import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/Colors';
import { useAuth } from '@/lib/auth';
import { getAvailableOrders, getActiveSpecialistOrder, acceptOrder, updateOrderStatus, updateSpecialistStatus, updateSpecialistLocation, OnDemandOrder, User } from '@/lib/api';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-specialist-location';

// Background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Background location error:', error);
        return;
    }
    if (data) {
        const { locations } = data as any;
        const location = locations[0];
        if (location) {
            try {
                const token = await AsyncStorage.getItem('app_token');
                if (token) {
                    await updateSpecialistLocation(token, location.coords.latitude, location.coords.longitude, location.coords.heading || 0);
                }
            } catch (e) {
                console.error('Failed to update background location:', e);
            }
        }
    }
});

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WasherDashboardScreen() {
    const { token, user, setUser } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const colors = Colors.light;

    const [online, setOnline] = useState(user?.online || false);
    const [availableOrders, setAvailableOrders] = useState<OnDemandOrder[]>([]);
    const [activeOrder, setActiveOrder] = useState<OnDemandOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            const active = await getActiveSpecialistOrder(token);
            setActiveOrder(active);

            if (!active) {
                const available = await getAvailableOrders(token);
                setAvailableOrders(available);
            }
        } catch (error) {
            console.error('Error fetching washer data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleToggleStatus = async () => {
        if (!token) return;
        try {
            const newStatus = !online;
            const updatedUser = await updateSpecialistStatus(token, newStatus);
            setOnline(newStatus);
            setUser(updatedUser);

            if (newStatus) {
                const { status: foreground } = await Location.requestForegroundPermissionsAsync();
                const { status: background } = await Location.requestBackgroundPermissionsAsync();

                if (foreground === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    await updateSpecialistLocation(token, loc.coords.latitude, loc.coords.longitude, loc.coords.heading || 0);

                    if (background === 'granted') {
                        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                            accuracy: Location.Accuracy.Balanced,
                            distanceInterval: 50, // 50 meters
                            deferredUpdatesInterval: 30000, // 30s
                            foregroundService: {
                                notificationTitle: 'SuperApp Specialist',
                                notificationBody: 'Your location is being used for orders',
                                notificationColor: colors.primary,
                            },
                        });
                    }
                }
                Alert.alert(t('onlineStatus'), 'You are now visible to clients and can receive orders.');
            } else {
                const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
                if (isRunning) {
                    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update status.');
        }
    };

    const handleAcceptOrder = async (orderId: string) => {
        if (!token || acceptingOrderId) return;
        setAcceptingOrderId(orderId);
        try {
            const order = await acceptOrder(token, orderId);
            setActiveOrder(order);
            fetchData();
            Alert.alert('Success', 'Order accepted! Go to the client location.');
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Failed to accept order.';
            Alert.alert('Error', msg);
            fetchData();
        } finally {
            setAcceptingOrderId(null);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!token || !activeOrder?.id) return;
        try {
            const updated = await updateOrderStatus(token, activeOrder.id, newStatus);
            setActiveOrder(newStatus === 'COMPLETED' ? null : updated);
            if (newStatus === 'COMPLETED') {
                Alert.alert('Completed', 'Great job! You are ready for the next order.');
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update order status.');
        }
    };

    const handleCallClient = () => {
        // In a real app we'd need the client's phone. 
        // For now, placeholder or uses a generic contact if available
        Alert.alert('Call Client', 'Attempting to connect to client...');
    };

    const renderOrderItem = ({ item }: { item: OnDemandOrder }) => (
        <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
                <View style={[styles.typeBadge, { backgroundColor: item.type === 'MOBILE_WASH' ? '#DBEAFE' : '#FEE2E2' }]}>
                    <Text style={[styles.typeText, { color: item.type === 'MOBILE_WASH' ? '#2563EB' : '#DC2626' }]}>
                        {item.type === 'MOBILE_WASH' ? t('wash') : t('repair')}
                    </Text>
                </View>
                <Text style={styles.timeText}>{new Date(item.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>

            <Text style={styles.addressText}>{item.userAddress}</Text>
            <Text style={styles.carText}>{item.carDetails}</Text>

            <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: acceptingOrderId === item.id ? '#94A3B8' : colors.primary }]}
                onPress={() => handleAcceptOrder(item.id!)}
                disabled={acceptingOrderId === item.id}
            >
                <Text style={styles.acceptBtnText}>
                    {acceptingOrderId === item.id ? '...' : t('acceptOrder')}
                </Text>
            </TouchableOpacity>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('workInSuperApp')}</Text>
                <TouchableOpacity onPress={handleToggleStatus} style={[styles.statusToggle, { backgroundColor: online ? '#DCFCE7' : '#F1F5F9' }]}>
                    <View style={[styles.statusDot, { backgroundColor: online ? '#22C55E' : '#94A3B8' }]} />
                    <Text style={[styles.statusText, { color: online ? '#166534' : '#64748B' }]}>
                        {online ? t('online') : t('offline')}
                    </Text>
                </TouchableOpacity>
            </View>

            {activeOrder ? (
                <View style={styles.activeContainer}>
                    <View style={styles.activeCard}>
                        <Text style={styles.sectionTitle}>{t('activeOrder') || 'ACTIVE ORDER'}</Text>
                        <View style={styles.activeHeader}>
                            <View>
                                <Text style={styles.activeStatus}>{activeOrder.status}</Text>
                                <Text style={styles.activeAddress}>{activeOrder.userAddress}</Text>
                            </View>
                            <TouchableOpacity onPress={handleCallClient} style={styles.callBtn}>
                                <Ionicons name="call" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.carInfo}>
                            <MaterialCommunityIcons name="car-wash" size={24} color={colors.primary} />
                            <Text style={styles.carDetailsText}>{activeOrder.carDetails}</Text>
                        </View>

                        <View style={styles.actionGrid}>
                            {activeOrder.status === 'ACCEPTED' && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus('EN_ROUTE')}>
                                    <Ionicons name="navigate" size={24} color={colors.primary} />
                                    <Text style={styles.actionLabel}>{t('enRoute') || 'En Route'}</Text>
                                </TouchableOpacity>
                            )}
                            {activeOrder.status === 'EN_ROUTE' && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus('ARRIVED')}>
                                    <Ionicons name="pin" size={24} color={colors.primary} />
                                    <Text style={styles.actionLabel}>{t('arrived') || 'Arrived'}</Text>
                                </TouchableOpacity>
                            )}
                            {activeOrder.status === 'ARRIVED' && (
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleUpdateStatus('STARTED')}>
                                    <Ionicons name="play" size={24} color={colors.primary} />
                                    <Text style={styles.actionLabel}>{t('startWash') || 'Start Wash'}</Text>
                                </TouchableOpacity>
                            )}
                            {activeOrder.status === 'STARTED' && (
                                <TouchableOpacity style={[styles.actionBtn, styles.completeBtn]} onPress={() => handleUpdateStatus('COMPLETED')}>
                                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                                    <Text style={[styles.actionLabel, { color: '#fff' }]}>{t('complete') || 'Complete'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.navBtn}
                        onPress={() => {
                            const url = `google.navigation:q=${activeOrder.userLat},${activeOrder.userLon}`;
                            Linking.openURL(url).catch(() => {
                                Linking.openURL(`https://maps.google.com/maps?daddr=${activeOrder.userLat},${activeOrder.userLon}`);
                            });
                        }}
                    >
                        <MaterialCommunityIcons name="navigation" size={20} color="#fff" />
                        <Text style={styles.navBtnText}>{t('openNavigator') || 'OPEN NAVIGATOR'}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={availableOrders}
                    keyExtractor={(item) => item.id!}
                    renderItem={renderOrderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
                    }
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            <Text style={styles.sectionTitle}>{t('availableOrders').toUpperCase()} ({availableOrders.length})</Text>
                            {!online && (
                                <View style={styles.offlineWarning}>
                                    <Ionicons name="warning" size={20} color="#92400E" />
                                    <Text style={styles.offlineWarningText}>{t('goOnlinePrompt') || 'Go online to see more orders'}</Text>
                                </View>
                            )}
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyText}>{t('noOrdersNearby') || 'No orders nearby'}</Text>
                            <Text style={styles.emptySubtext}>{t('newRequestsPrompt') || 'New requests will appear here'}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    statusToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: '800' },
    listContent: { padding: 20 },
    listHeader: { marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', letterSpacing: 1 },
    offlineWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12, marginTop: 12, gap: 8 },
    offlineWarningText: { fontSize: 14, color: '#92400E', fontWeight: '600' },
    orderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    typeText: { fontSize: 10, fontWeight: '800' },
    timeText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
    addressText: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    carText: { fontSize: 14, color: '#64748B', marginBottom: 16 },
    acceptBtn: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 18, fontWeight: '700', color: '#64748B', marginTop: 16 },
    emptySubtext: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
    activeContainer: { flex: 1, padding: 20 },
    activeCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
    activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 16, marginBottom: 20 },
    activeStatus: { fontSize: 12, fontWeight: '800', color: '#3B82F6', marginBottom: 4 },
    activeAddress: { fontSize: 22, fontWeight: '800', color: '#1E293B', flex: 1, marginRight: 10 },
    callBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
    carInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, marginBottom: 24 },
    carDetailsText: { fontSize: 15, fontWeight: '600', color: '#475569' },
    actionGrid: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, height: 80, backgroundColor: '#EFF6FF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8 },
    actionLabel: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    completeBtn: { backgroundColor: '#22C55E' },
    navBtn: { flexDirection: 'row', backgroundColor: '#000', height: 56, borderRadius: 16, marginTop: 20, justifyContent: 'center', alignItems: 'center', gap: 10 },
    navBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
