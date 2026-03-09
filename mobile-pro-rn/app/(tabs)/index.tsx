import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Platform, Dimensions, StatusBar, useColorScheme, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getMe, getWallet, updateSpecialistStatus, getAvailableOrders, getOrders, acceptOrder, getUnreadNotificationsCount, getFileUrl, updateSpecialistLocation } from '@/lib/api';


import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getPromotions, Promotion } from '@/lib/api';
import PromoBanner from '@/components/PromoBanner';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { token, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>('Tashkent, Uzbekistan');
  const [isOnline, setIsOnline] = useState(false);
  const { t } = useTranslation();

  const { data: user, refetch: refetchMe } = useQuery({
    queryKey: ['me', token],
    queryFn: () => getMe(token!),
    enabled: !!token,
  });

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet', token],
    queryFn: () => getWallet(token!),
    enabled: !!token,
  });

  const { data: unreadCount = { count: 0 } } = useQuery({
    queryKey: ['unreadCount', token],
    queryFn: () => getUnreadNotificationsCount(token!),
    enabled: !!token,
    refetchInterval: 30000,
  });

  const userAvatar = getFileUrl(user?.avatarUrl) || `https://ui-avatars.com/api/?name=${user?.fullName || 'U'}&background=3b82f6&color=fff`;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchMe(), refetchWallet(), refetchAvailable(), refetchOrders()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      setIsOnline(user.online || false);
      if (!(user.specialist || user.isSpecialist)) {
        Alert.alert('Access Denied', 'Only specialists can access the Pro app.', [{ text: 'OK', onPress: () => logout() }]);
      }
    }
  }, [user]);

  useEffect(() => {
    let locationSubscription: any = null;
    const startLocationUpdates = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: 30000 },
        async (location) => {
          setUserLocation(location);
          if (token && isOnline) {
            try { await updateSpecialistLocation(token, location.coords.latitude, location.coords.longitude); } catch (e) { }
          }
        }
      );
    };
    if (isOnline && token) startLocationUpdates();
    return () => locationSubscription?.remove();
  }, [isOnline, token]);

  const isSpecialistUser = !!(user?.specialist || user?.isSpecialist);

  const { data: availableOrders = [], refetch: refetchAvailable } = useQuery({
    queryKey: ['availableOrders', token, isOnline],
    queryFn: () => getAvailableOrders(token!),
    enabled: !!token && isSpecialistUser && isOnline,
    refetchInterval: 10000,
  });

  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ['orders', token],
    queryFn: () => getOrders(token!),
    enabled: !!token && isSpecialistUser,
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', token],
    queryFn: () => getPromotions(token!),
    enabled: !!token,
  });

  const toggleOnline = async () => {
    if (!token) return;
    try {
      const updated = await updateSpecialistStatus(token, !isOnline);
      setIsOnline(updated.online || false);
      if (updated.online && userLocation) {
        await updateSpecialistLocation(token, userLocation.coords.latitude, userLocation.coords.longitude);
      }
      if (!isOnline) refetchAvailable();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!token) return;
    try {
      await acceptOrder(token, orderId);
      router.push({ pathname: '/order-tracking', params: { orderId } } as any);
      refetchAvailable();
    } catch (err) {
      Alert.alert('Error', 'Could not accept order');
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#020617']} style={[styles.topSection, { paddingTop: insets.top + 10 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.profileInfo} onPress={() => router.push('/(tabs)/profile' as any)}>
            <Image source={{ uri: userAvatar }} style={styles.avatar} />
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{user?.fullName || 'Specialist'}</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              </View>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={12} color="#94A3B8" />
                <Text style={styles.locationText} numberOfLines={1}>{address}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/notifications' as any)}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {unreadCount.count > 0 && <View style={styles.dot} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.walletContainer}>
          <View>
            <Text style={styles.walletLabel}>Current Balance</Text>
            <Text style={styles.walletValue}>
              {Number(wallet?.balance || 0).toLocaleString()} <Text style={styles.currency}>UZS</Text>
            </Text>
          </View>
          <TouchableOpacity style={styles.topUpButton} onPress={() => router.push('/wallet' as any)}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.topUpGradient}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.topUpText}>Top Up</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Your Status</Text>
          <TouchableOpacity
            style={[styles.statusToggle, isOnline ? styles.statusOnline : styles.statusOffline]}
            onPress={toggleOnline}
            activeOpacity={0.9}
          >
            <View style={styles.statusLeft}>
              <View style={[styles.statusPulse, { backgroundColor: isOnline ? '#34D399' : '#94A3B8' }]} />
              <Text style={styles.statusLabel}>{isOnline ? 'Online — Accepting Orders' : 'Offline — Go Online'}</Text>
            </View>
            <View style={[styles.toggleTrack, isOnline ? { backgroundColor: 'rgba(255,255,255,0.2)' } : {}]}>
              <View style={[styles.toggleKnob, isOnline ? { transform: [{ translateX: 22 }], backgroundColor: '#fff' } : {}]} />
            </View>
          </TouchableOpacity>
        </View>

        {isOnline && (
          <View style={styles.ordersSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available Orders</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{availableOrders.length}</Text>
              </View>
            </View>

            {availableOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="airplane-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyText}>Waiting for new orders in your area...</Text>
              </View>
            ) : (
              availableOrders.map((order: any) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => handleAcceptOrder(order.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.orderTop}>
                    <View style={styles.orderTag}>
                      <Text style={styles.orderTagText}>{order.type === 'MOBILE_WASH' ? 'WASH' : 'REPAIR'}</Text>
                    </View>
                    <Text style={styles.orderDistance}>1.2 km away</Text>
                  </View>

                  <Text style={styles.orderAddress} numberOfLines={2}>{order.userAddress}</Text>

                  <View style={styles.orderInfo}>
                    <View style={styles.infoPill}>
                      <Ionicons name="car" size={14} color="#3B82F6" />
                      <Text style={styles.infoText}>{order.carDetails || 'BYD Han'}</Text>
                    </View>
                    <View style={styles.infoPill}>
                      <Ionicons name="time" size={14} color="#64748B" />
                      <Text style={styles.infoText}>ASAP</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.acceptOrderBtn} onPress={() => handleAcceptOrder(order.id)}>
                    <Text style={styles.acceptOrderBtnText}>Accept Order</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={styles.quickStats}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="checkmark-done" size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.statNumber}>{Array.isArray(orders) ? orders.filter((o: any) => o.status === 'COMPLETED').length : 0}</Text>
              <Text style={styles.statLabelSmall}>Jobs Done</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="star" size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.statNumber}>4.9</Text>
              <Text style={styles.statLabelSmall}>Rating</Text>
            </View>
          </View>
        </View>

        <PromoBanner promotions={promotions} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  topSection: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  proBadge: { backgroundColor: '#3B82F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  proBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  dot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#1E293B' },
  walletContainer: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  walletValue: { color: '#fff', fontSize: 24, fontWeight: '800' },
  currency: { fontSize: 14, color: '#3B82F6' },
  topUpButton: { borderRadius: 16, overflow: 'hidden' },
  topUpGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  topUpText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
  statusSection: { marginBottom: 24 },
  statusTitle: { fontSize: 16, fontWeight: '800', color: '#64748B', marginBottom: 12 },
  statusToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1 },
  statusOnline: { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' },
  statusOffline: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusPulse: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  toggleTrack: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#E2E8F0', padding: 2 },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
  ordersSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  countBadge: { backgroundColor: '#3B82F6', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  countText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  emptyCard: { padding: 40, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: '#E2E8F0' },
  emptyText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  orderCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, elevation: 4, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderTag: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  orderTagText: { color: '#4F46E5', fontSize: 10, fontWeight: '800' },
  orderDistance: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  orderAddress: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  orderInfo: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  infoText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  acceptOrderBtn: { backgroundColor: '#0F172A', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  acceptOrderBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  quickStats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  statLabelSmall: { fontSize: 12, fontWeight: '600', color: '#64748B' },
});


