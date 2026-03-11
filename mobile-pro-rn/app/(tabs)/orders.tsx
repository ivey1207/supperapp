import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, useColorScheme, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getOrders, getOnDemandOrders } from '@/lib/api';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';


type Order = { id: string; status: string; totalAmount: number; currency: string; createdAt?: string; description?: string; userAddress?: string; type?: string };

const router = useRouter();

function OrderItem({ item }: { item: Order }) {
  const date = item.createdAt ? new Date(item.createdAt).toLocaleString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const isActive = ['PENDING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(item.status);
  const isCompleted = item.status === 'COMPLETED';

  const statusColor = isCompleted ? '#10B981' : isActive ? '#3B82F6' : '#EF4444';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/order-tracking', params: { orderId: item.id } } as any)}
    >
      <View style={styles.cardTop}>
        <View style={styles.dateWrapper}>
          <Text style={styles.dateText}>{date}</Text>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
        <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
      </View>

      <Text style={styles.orderTitle} numberOfLines={2}>
        {item.description || `Task #${String(item.id).slice(0, 8)}`}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Earnings</Text>
          <Text style={styles.amountValue}>
            {Number(item.totalAmount || 0).toLocaleString()} <Text style={styles.currency}>UZS</Text>
          </Text>
        </View>
        <View style={styles.detailsIcon}>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
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
          return <OrderItem item={displayOrder} />;
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor="#3B82F6"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Money</Text>
            <Text style={styles.headerSubtitle}>Weekly earnings and history</Text>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total this week</Text>
              <Text style={styles.summaryValue}>UZS 1,250,000</Text>
              <View style={styles.summaryFooter}>
                <View style={styles.summaryStat}>
                  <Text style={styles.statVal}>42</Text>
                  <Text style={styles.statLab}>Orders</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryStat}>
                  <Text style={styles.statVal}>+30</Text>
                  <Text style={styles.statLab}>Points</Text>
                </View>
              </View>
            </View>
          </View>
        }

        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={64} color="#1E293B" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  list: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 20 },
  header: { marginBottom: 32 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 15, fontWeight: '500', color: '#64748B', marginTop: 4 },

  summaryCard: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  summaryValue: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },
  summaryFooter: { flexDirection: 'row', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', alignItems: 'center' },
  summaryStat: { flex: 1, alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLab: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  card: { backgroundColor: '#0F172A', borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#1E293B' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dateWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  orderTitle: { fontSize: 17, fontWeight: '700', color: '#F8FAFC', marginBottom: 20 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1E293B' },
  amountBox: { gap: 4 },
  amountLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase' },
  amountValue: { fontSize: 20, fontWeight: '900', color: '#F8FAFC' },
  currency: { fontSize: 14, color: '#3B82F6' },
  detailsIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#475569', marginTop: 16 },
});

