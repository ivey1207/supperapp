import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, ActivityIndicator, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import Colors from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/lib/api';

export default function DeliveryScreen() {
    const scheme = useColorScheme() ?? 'light';
    const colors = Colors[scheme];
    const { token } = useAuth();
    const router = useRouter();

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['myOrders', token],
        queryFn: async () => {
            const { data } = await api.get('/api/v1/app/on-demand/my-orders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return data as any[];
        },
        enabled: !!token,
    });

    const deliveryOrders = orders.filter(o => o.type === 'DELIVERY' || o.type === 'MOBILE_WASH');

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Track Delivery</Text>
                    <View style={{ width: 40 }} />
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {deliveryOrders.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="truck-delivery-outline" size={80} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active deliveries</Text>
                        <TouchableOpacity
                            style={[styles.orderBtn, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/on-demand-request?type=DELIVERY' as any)}
                        >
                            <Text style={styles.orderBtnText}>Order a Delivery</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    deliveryOrders.map((order) => (
                        <TouchableOpacity
                            key={order.id}
                            style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => router.push(`/order/${order.id}` as any)}
                        >
                            <View style={styles.orderHeader}>
                                <View style={[styles.statusBadge, { backgroundColor: order.status === 'COMPLETED' ? '#10B98120' : '#3B82F620' }]}>
                                    <Text style={[styles.statusText, { color: order.status === 'COMPLETED' ? '#10B981' : '#3B82F6' }]}>
                                        {order.status}
                                    </Text>
                                </View>
                                <Text style={[styles.orderId, { color: colors.textSecondary }]}>#{order.id.slice(0, 8)}</Text>
                            </View>

                            <View style={styles.locationRow}>
                                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                                <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>{order.userAddress}</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.footerRow}>
                                <View style={styles.contractorInfo}>
                                    <Ionicons name="person-circle-outline" size={24} color={colors.textSecondary} />
                                    <Text style={[styles.contractorText, { color: colors.text }]}>
                                        {order.contractorId ? 'Driver Assigned' : 'Finding Driver...'}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    scrollContent: { padding: 16 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 16 },
    emptyText: { fontSize: 18, fontWeight: '700' },
    orderBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginTop: 8 },
    orderBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    orderCard: { padding: 16, borderRadius: 24, marginBottom: 16, borderWidth: 1 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '800' },
    orderId: { fontSize: 12, fontWeight: '600' },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    addressText: { fontSize: 15, fontWeight: '700', flex: 1 },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 12, opacity: 0.3 },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    contractorInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    contractorText: { fontSize: 14, fontWeight: '600' },
});
