import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getOrders } from '@/lib/api';
import Colors from '@/constants/Colors';

type Order = { id: string; status: string; totalAmount: number; currency: string; createdAt?: string };

function OrderItem({ item, colors }: { item: Order, colors: any }) {
  const date = item.createdAt ? new Date(item.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.orderId, { color: colors.text }]}>Заказ #{String(item.id).slice(0, 8)}</Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>{Number(item.totalAmount).toLocaleString()} {item.currency} • {date}</Text>
      <View style={[styles.badge, { backgroundColor: colors.primary + '28' }]}>
        <Text style={[styles.badgeText, { color: colors.primary }]}>{item.status}</Text>
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const { token } = useAuth();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { data: orders = [], refetch, isRefetching } = useQuery({
    queryKey: ['orders', token],
    queryFn: () => getOrders(token!),
    enabled: !!token,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={orders as Order[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderItem item={item} colors={colors} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Заказов пока нет</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 20, paddingBottom: 32 },
  card: { borderRadius: 16, padding: 18, marginBottom: 14 },
  orderId: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 6 },
  badge: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  empty: { padding: 48, alignItems: 'center' },
  emptyText: { fontSize: 16 },
});
