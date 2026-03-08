import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, useColorScheme, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getOrders, getOnDemandOrders } from '@/lib/api';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';


type Order = { id: string; status: string; totalAmount: number; currency: string; createdAt?: string; description?: string; userAddress?: string; type?: string };

const router = useRouter();

function OrderItem({ item, colors }: { item: Order, colors: any }) {
  const date = item.createdAt ? new Date(item.createdAt).toLocaleString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const isActive = ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(item.status);
  const isCompleted = item.status === 'COMPLETED';

  const statusColor = isCompleted ? '#10B981' : isActive ? '#3B82F6' : '#EF4444';
  const statusBg = isCompleted ? '#D1FAE5' : isActive ? '#DBEAFE' : '#FEE2E2';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/order-tracking', params: { orderId: item.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeIconRow}>
          <Ionicons
            name={item.userAddress ? "car-sport-outline" : "construct-outline"}
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>

      <Text style={[styles.orderTitle, { color: colors.text }]} numberOfLines={1}>
        {item.description || `Task #${String(item.id).slice(0, 8)}`}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Earnings</Text>
          <Text style={[styles.amountValue, { color: colors.text }]}>
            {Number(item.totalAmount).toLocaleString()} {item.currency}
          </Text>
        </View>
        <View style={[styles.detailsBtn, { backgroundColor: colors.background }]}>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}


export default function OrdersScreen() {
  const { token } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { data: orders = [], refetch: refetchOrders, isRefetching: isRefetchingOrders } = useQuery({
    queryKey: ['orders', token],
    queryFn: () => getOrders(token!),
    enabled: !!token,
  });

  const { data: onDemandOrders = [], refetch: refetchOnDemand, isRefetching: isRefetchingOnDemand } = useQuery({
    queryKey: ['on-demand-orders', token],
    queryFn: () => getOnDemandOrders(token!),
    enabled: !!token,
  });

  const combinedOrders = [...orders, ...onDemandOrders].sort((a: any, b: any) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const refetch = () => {
    refetchOrders();
    refetchOnDemand();
  };

  const isRefetching = isRefetchingOrders || isRefetchingOnDemand;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={combinedOrders as Order[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: any) => {
          const isOnDemand = !!item.userAddress;
          const displayOrder = {
            ...item,
            description: isOnDemand ? `${item.type === 'MOBILE_WASH' ? 'Mobile Wash' : 'SOS Repair'}: ${item.userAddress}` : item.description,
            totalAmount: item.totalAmount || 0,
            currency: item.currency || 'UZS'
          };
          return <OrderItem item={displayOrder} colors={colors} />;
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Jobs</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Manage your active and completed services</Text>
          </View>
        }

        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
            </View>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No orders found yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 24, marginTop: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  headerSubtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  card: { borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800' },
  dateText: { fontSize: 12, fontWeight: '600' },
  orderTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  amountContainer: { gap: 2 },
  amountLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  amountValue: { fontSize: 18, fontWeight: '800' },
  detailsBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 48, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  typeIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' },
});

