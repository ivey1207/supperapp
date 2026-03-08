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

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { token, logout } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>('Detecting location...');
  const [isOnline, setIsOnline] = useState(false);
  const { t } = useTranslation();

  const { data: user, refetch: refetchMe, isRefetching: isRefreshingMe } = useQuery({
    queryKey: ['me', token],
    queryFn: () => getMe(token!),
    enabled: !!token,
  });

  const { data: wallet, refetch: refetchWallet, isRefetching: isRefreshingWallet } = useQuery({
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
    try {
      await Promise.all([
        refetchMe(),
        refetchWallet(),
        refetchAvailable(),
        refetchOrders(),
      ]);
    } catch (e) {
      console.error('Refresh failed:', e);
    } finally {
      setIsRefreshing(false);
    }
  };




  useEffect(() => {
    if (user) {
      setIsOnline(user.online || false);
      if (!(user.specialist || user.isSpecialist)) {
        Alert.alert(
          'Access Denied',
          'Only specialists can access the Pro app. Please use the consumer version.',
          [{ text: 'OK', onPress: () => logout() }]
        );
      }
    }
  }, [user]);

  useEffect(() => {
    let locationSubscription: any = null;

    const startLocationUpdates = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50,
          timeInterval: 30000,
        },
        async (location) => {
          setUserLocation(location);
          if (token && isOnline) {
            try {
              await updateSpecialistLocation(token, location.coords.latitude, location.coords.longitude);
            } catch (err) {
              console.error('Location update failed:', err);
            }
          }
        }
      );
    };

    if (isOnline && token) {
      startLocationUpdates();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
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
      const msg = err.response?.data?.message || t('errorStatus');
      Alert.alert('Error', msg);
    }
  };


  const handleAcceptOrder = async (orderId: string) => {
    if (!token) return;
    try {
      await acceptOrder(token, orderId);
      Alert.alert('Accepted', 'You have accepted the order. Redirecting to tracking...');
      router.push({ pathname: '/order-tracking', params: { orderId } } as any);
      refetchAvailable();
    } catch (err) {
      Alert.alert('Error', 'Could not accept order');
    }
  };

  // Cleanup: Remove all consumer-only methods and logic (Stories, Branches, Map push logic)


  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfoRow}>
            <TouchableOpacity style={[styles.profileBadge, { borderColor: colors.border }]} onPress={() => router.push('/(tabs)/profile' as any)}>
              <Image
                source={{ uri: userAvatar }}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <View style={styles.greetingRow}>
              <Text style={styles.userNameHeader}>{user?.fullName || 'Specialist'}</Text>
              <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerLocationRow}>
            <Ionicons name="location-sharp" size={14} color={colors.primary} />
            <Text style={[styles.locationTextHeader, { color: colors.textSecondary }]} numberOfLines={1}>
              {address}
            </Text>
          </View>
        </View>




        <View style={styles.headerRight}>
          {wallet && (
            <TouchableOpacity
              style={styles.balancePill}
              activeOpacity={0.8}
              onPress={() => router.push('/wallet' as any)}
            >
              <LinearGradient
                colors={['#FF5F6D', '#FFC371', '#8E2DE2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.balanceGradient}
              >
                <Text style={styles.balanceText}>{wallet.balance.toLocaleString()}</Text>
                <View style={styles.plusIconCircle}>
                  <Ionicons name="add" size={14} color="#3B82F6" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.push('/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {unreadCount.count > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800', textAlign: 'center' }}>
                  {unreadCount.count > 9 ? '9+' : unreadCount.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>



      {/* Specialist Main Bar */}
      <View style={styles.specialistBar}>
        <LinearGradient
          colors={isOnline ? ['#10B981', '#059669'] : ['#475569', '#334155']}
          style={styles.specialistGradient}
        >
          <View style={styles.specialistInfo}>
            <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#fff' : '#94A3B8' }]} />
            <Text style={styles.specialistStatusText}>
              {isOnline ? t('onlineStatus') : t('offlineStatus')}
            </Text>
          </View>
          <TouchableOpacity style={styles.onlineSwitch} onPress={toggleOnline} activeOpacity={0.8}>
            <View style={[styles.switchTrack, { backgroundColor: isOnline ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]}>
              <View style={[styles.switchKnob, isOnline ? { transform: [{ translateX: 22 }], backgroundColor: '#fff' } : { transform: [{ translateX: 2 }], backgroundColor: '#94A3B8' }]} />
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Active Orders List */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('availableOrders')} ({availableOrders.length})
            </Text>
            {isOnline && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>

          <View style={styles.ordersList}>
            {availableOrders.length === 0 ? (
              <View style={styles.emptyOrders}>
                <Ionicons name="cafe-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {isOnline ? t('noOrdersYet') : t('goOnlineToSeeOrders')}
                </Text>
              </View>
            ) : (
              availableOrders.map((order: any) => (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleAcceptOrder(order.id)}
                >
                  <View style={styles.orderHeader}>
                    <View style={[styles.orderTypeBadge, { backgroundColor: order.type === 'MOBILE_WASH' ? '#10B981' : '#F43F5E' }]}>
                      <Text style={styles.orderTypeText}>{order.type === 'MOBILE_WASH' ? t('wash') : t('repair')}</Text>
                    </View>
                    <Text style={[styles.orderTime, { color: colors.textSecondary }]}>1.2 km away</Text>
                  </View>
                  <Text style={[styles.orderAddress, { color: colors.text }]} numberOfLines={2}>{order.userAddress}</Text>
                  <View style={styles.orderCarRow}>
                    <Ionicons name="car-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.orderCar, { color: colors.textSecondary }]}>{order.carDetails}</Text>
                  </View>
                  <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptOrder(order.id)}>
                    <Text style={styles.acceptButtonText}>{t('acceptOrder')}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statItem, { backgroundColor: colors.card }]}>
            <View style={styles.statIconCircle}>
              <Ionicons name="wallet-outline" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.statVal, { color: colors.text }]}>
              {Number(wallet?.balance || 0).toLocaleString()} {wallet?.currency || 'UZS'}
            </Text>
            <Text style={[styles.statLab, { color: colors.textSecondary }]}>Current Balance</Text>
          </View>
          <View style={[styles.statItem, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconCircle, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-done" size={16} color="#10B981" />
            </View>
            <Text style={[styles.statVal, { color: colors.text }]}>
              {Array.isArray(orders) ? orders.filter((o: any) => o.status === 'COMPLETED').length : 0}
            </Text>
            <Text style={[styles.statLab, { color: colors.textSecondary }]}>Jobs Completed</Text>
          </View>

        </View>

      </ScrollView>
    </View>

  
    </View >
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  storiesContainer: { marginTop: 24, marginBottom: 12 },
  storiesScroll: { paddingHorizontal: 20, gap: 12 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  userInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userTextContainer: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '700',
  },
  profileBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  avatar: { width: '100%', height: '100%' },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },

  categoriesSection: {
    marginTop: 24,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },


  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  categoryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  recommendedSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  recommendedCard: {
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
  },
  recommendedImage: {
    width: '100%',
    height: '100%',
  },
  recommendedGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  recommendedContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  recommendedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  recommendedTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },

  placesSection: {
    marginTop: 32,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '700',
  },
  placesList: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 40,
  },

  // Preserved old styles if needed for sub-components
  categoryItem: { alignItems: 'center', width: 72 },
  categoryCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8, elevation: 5 },
  categoryName: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  featuredServicesRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 24,
  },
  featuredServiceCard: {
    flex: 1,
    height: 140,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  serviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 'auto',
  },
  featuredServiceTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  featuredServiceSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  addStoryBtn: {
    alignItems: 'center',
    marginRight: 12,
    width: 76,
  },
  yourStoryWrapper: {
    width: 72,
    height: 72,
    position: 'relative',
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yourStoryAvatarFrame: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    padding: 2,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  yourStoryAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
  },
  addBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#3b82f6',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  addStoryText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  balancePill: {
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
    height: '100%',
    gap: 8,
  },
  balanceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  plusIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  userNameHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  headerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationTextHeader: {
    fontSize: 12,
    fontWeight: '600',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 24,
  },
  statItem: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLab: {
    fontSize: 12,
    fontWeight: '600',
  },
});


