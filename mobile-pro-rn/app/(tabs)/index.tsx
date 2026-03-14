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
import { useRouter } from 'expo-router';
import MapView from 'react-native-maps';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getPromotions } from '@/lib/api';

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
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not accept order');
    }
  };

  const sheetRef = React.useRef<BottomSheet>(null);
  const snapPoints = React.useMemo(() => ['15%', '45%', '85%'], []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.mainContainer}>
        <StatusBar barStyle="light-content" />

        {/* Map Background */}
        <MapView
          style={StyleSheet.absoluteFill}
          showsUserLocation={true}
          showsMyLocationButton={false}
          customMapStyle={darkMapStyle}
        />

        {/* Floating Header Cards */}
        <SafeAreaView style={styles.floatingHeader}>
          <View style={styles.topCardsRow}>
            <View style={styles.floatingCard}>
              <View style={styles.priorityCircle}>
                <Ionicons name="flash" size={14} color="#fff" />
              </View>
              <View>
                <Text style={styles.cardLabel}>Priority</Text>
                <Text style={styles.cardValue}>+30</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.floatingCard}
              onPress={() => router.push('/wallet' as any)}
            >
              <View style={[styles.priorityCircle, { backgroundColor: '#10B981' }]}>
                <Ionicons name="wallet" size={14} color="#fff" />
              </View>
              <View>
                <Text style={styles.cardLabel}>0 trips</Text>
                <Text style={styles.cardValue}>UZS {Number(wallet?.balance || 0).toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlBtn}>
            <Ionicons name="locate" size={24} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* Bottom Sheet */}
        <BottomSheet
          ref={sheetRef}
          index={1}
          snapPoints={snapPoints}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.sheetIndicator}
        >
          <BottomSheetView style={styles.sheetContent}>
            {/* Status Section inside Sheet */}
            <View style={styles.sheetHeader}>
              <View style={styles.goalCard}>
                <View style={styles.goalContent}>
                  <Text style={styles.goalTitle}>No active goals now</Text>
                  <Text style={styles.goalSub}>Learn how to get a new goal</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </View>

              <TouchableOpacity
                style={[styles.onlineBtn, isOnline ? styles.onlineBtnActive : {}]}
                onPress={toggleOnline}
                activeOpacity={0.8}
              >
                <View style={styles.onlineBtnContent}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineBtnText}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                  <Text style={styles.onlineSubText}>
                    {isOnline ? 'Accepting Orders' : 'Go online'}
                  </Text>
                </View>
                <View style={styles.slideArrow}>
                  <Ionicons name="arrow-forward" size={24} color={isOnline ? '#3B82F6' : '#fff'} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Orders Section */}
            {isOnline && (
              <ScrollView style={styles.ordersList} showsVerticalScrollIndicator={false}>
                <Text style={styles.ordersHeader}>Available Orders ({availableOrders.length})</Text>
                {availableOrders.map((order: any) => (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.orderCardSmall}
                    onPress={() => handleAcceptOrder(order.id)}
                  >
                    <View style={styles.orderLeft}>
                      <Text style={styles.orderPrice}>{Number(order.totalPrice || 25000).toLocaleString()} <Text style={{ fontSize: 12 }}>UZS</Text></Text>
                      <Text style={styles.orderAddrSmall}>{order.userAddress}</Text>
                    </View>
                    <View style={styles.orderRight}>
                      <Text style={styles.orderDistSmall}>1.2 km</Text>
                      <Ionicons name="chevron-forward" size={18} color="#3B82F6" />
                    </View>
                  </TouchableOpacity>
                ))}
                {availableOrders.length === 0 && (
                  <View style={styles.emptyOrders}>
                    <Ionicons name="search-outline" size={32} color="#475569" />
                    <Text style={styles.emptyOrdersText}>Searching for orders near you...</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </BottomSheetView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0F172A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F172A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748B' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0F172A' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
];

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, pointerEvents: 'box-none' },
  topCardsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 10, gap: 10 },
  floatingCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  priorityCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  cardLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  cardValue: { color: '#F8FAFC', fontSize: 15, fontWeight: '800' },

  mapControls: { position: 'absolute', right: 16, top: '40%', gap: 10 },
  mapControlBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },

  sheetBackground: { backgroundColor: '#020617' },
  sheetIndicator: { backgroundColor: '#1E293B' },
  sheetContent: { flex: 1, paddingHorizontal: 20 },
  sheetHeader: { gap: 16, paddingVertical: 10 },

  goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#1E293B' },
  goalContent: { flex: 1 },
  goalTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  goalSub: { color: '#94A3B8', fontSize: 13, fontWeight: '500', marginTop: 2 },

  onlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0F172A', padding: 4, borderRadius: 30, borderWidth: 1, borderColor: '#1E293B' },
  onlineBtnActive: { backgroundColor: '#1E293B' },
  onlineBtnContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }, // Will be success green when active
  onlineBtnText: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  onlineSubText: { color: '#64748B', fontSize: 12, fontWeight: '500', marginLeft: 8 },
  slideArrow: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },

  ordersList: { marginTop: 20 },
  ordersHeader: { color: '#94A3B8', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12 },
  orderCardSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F172A', padding: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B' },
  orderLeft: { flex: 1 },
  orderPrice: { color: '#F8FAFC', fontSize: 18, fontWeight: '800' },
  orderAddrSmall: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  orderRight: { alignItems: 'flex-end', gap: 6 },
  orderDistSmall: { color: '#3B82F6', fontSize: 12, fontWeight: '700' },

  emptyOrders: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyOrdersText: { color: '#475569', fontSize: 15, fontWeight: '600', marginTop: 12, textAlign: 'center' },
});



