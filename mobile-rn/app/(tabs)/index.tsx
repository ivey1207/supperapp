import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Platform, Dimensions, StatusBar, useColorScheme, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getBranches, getPromotions, getServices, Promotion, getFileUrl, getUserStories, createUserStory, uploadImage } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import QuickActions from '@/components/QuickActions';
import FilterPills from '@/components/FilterPills';
import BranchCard from '@/components/BranchCard';
import StoryCircle from '@/components/StoryCircle';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getMe, getWallet, updateSpecialistStatus } from '@/lib/api';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const dark = Colors.dark;

const CATEGORIES = [
  { id: 1, name: 'Автомойка', partnerType: 'CAR_WASH', icon: 'local-car-wash', color: '#3b82f6', image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400' },
  { id: 2, name: 'АЗС', partnerType: 'GAS_STATION', icon: 'local-gas-station', color: '#10b981', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
  { id: 3, name: 'Тюнинг', partnerType: 'SERVICE', icon: 'build', color: '#f59e0b', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400' },
  { id: 4, name: 'Шины', partnerType: 'TIRES', icon: 'settings-input-component', color: '#8b5cf6', image: 'https://images.unsplash.com/photo-1606577924006-27d39b132ae2?w=400' },
];

const MOCK_STORIES = [
  { id: 's1', title: 'Счастливые', imageUrl: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=200' },
  { id: 's2', title: 'Новая точка', imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=200' },
  { id: 's3', title: 'Розыгрыш', imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200' },
];

const MOCK_PROMOS: any[] = [
  {
    id: 'm1',
    title: 'Комплекс (Комбо)',
    description: 'Мойка Люкс + покрытие воском со скидкой 40.000 UZS',
    discountValue: '-40 000 UZS',
    imageUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600'
  },
  {
    id: 'm2',
    title: '5% Кешбэк на АЗС',
    description: 'Оплати через SuperApp на АЗС Mustang и получи кешбэк на баланс!',
    discountValue: '5% Cashback',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600'
  },
  {
    id: 'm3',
    title: 'Сезонное предложение',
    description: 'Пора переобуваться! Скидки на шиномонтаж до 1 декабря.',
    discountValue: 'Шиномонтаж',
    imageUrl: 'https://images.unsplash.com/photo-1606577924006-27d39b132ae2?w=600'
  }
];

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedMacId, setSelectedMacId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>('Detecting location...');
  const [seenStories, setSeenStories] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me', token],
    queryFn: () => getMe(token!),
    enabled: !!token,
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet', token],
    queryFn: () => getWallet(token!),
    enabled: !!token,
  });

  useEffect(() => {
    if (user) {
      setIsOnline(user.isOnline || false);
    }
  }, [user]);

  const toggleOnline = async () => {
    if (!token) return;
    try {
      const updated = await updateSpecialistStatus(token, !isOnline);
      setIsOnline(updated.isOnline || false);
    } catch (err) {
      console.error('Failed to toggle status:', err);
      Alert.alert('Ошибка', 'Не удалось изменить статус');
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('seen_stories').then(val => {
      if (val) setSeenStories(JSON.parse(val));
    });
  }, []);

  useEffect(() => {
    if (params.branchId) {
      setSelectedBranchId(params.branchId as string);
    }
    if (params.macId) {
      setSelectedMacId(params.macId as string);
    }
  }, [params.branchId, params.macId]);

  // Request location for sorting
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('Location disabled');
        return;
      }
      try {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);

        // Reverse geocode
        const rev = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        if (rev && rev.length > 0) {
          const addr = rev[0];
          setAddress(`${addr.city || addr.region || ''}, ${addr.street || addr.name || ''}`);
        }
      } catch (e) {
        console.log('Error getting location on home:', e);
        setAddress('Tashkent');
      }
    })();
  }, []);

  const { data: promotions = [], refetch: refetchPromos, isRefetching: isRefetchingPromos } = useQuery({
    queryKey: ['promotions', token, selectedBranchId],
    queryFn: () => getPromotions(token!, selectedBranchId || undefined),
    enabled: !!token,
  });

  const { data: userStories = [], refetch: refetchUserStories } = useQuery({
    queryKey: ['userStories', token],
    queryFn: () => getUserStories(token!),
    enabled: !!token,
  });

  const displayPromos = promotions.length > 0 ? promotions : MOCK_PROMOS;

  const combinedStories = [
    ...promotions.map(p => ({ ...p, type: 'PROMO', displayName: p.title })),
    ...userStories.map(s => ({ ...s, type: 'USER', displayName: s.userName }))
  ];

  // SORTING: Unseen first, then Promos, then User stories
  const finalStories = (combinedStories.length > 0 ? combinedStories : MOCK_STORIES.map(s => ({ ...s, type: 'MOCK', displayName: s.title })))
    .sort((a: any, b: any) => {
      const aSeen = seenStories.includes(a.id);
      const bSeen = seenStories.includes(b.id);
      if (aSeen && !bSeen) return 1;
      if (!aSeen && bSeen) return -1;
      if (a.type === 'PROMO' && b.type !== 'PROMO') return -1;
      if (a.type !== 'PROMO' && b.type === 'PROMO') return 1;
      return 0;
    });

  // IG Style: Filter out self stories from main tray and show them on the "Your Story" bubble
  const otherStories = finalStories.filter((s: any) => s.type !== 'USER' || s.userId !== user?.id);
  const myStories = userStories.filter((s: any) => s.userId === user?.id);
  const hasMyStories = myStories.length > 0;
  const allMyStoriesSeen = hasMyStories && myStories.every((s: any) => seenStories.includes(s.id));

  const markStorySeen = async (id: string) => {
    if (seenStories.includes(id)) return;
    const newSeen = [...seenStories, id];
    setSeenStories(newSeen);
    await AsyncStorage.setItem('seen_stories', JSON.stringify(newSeen));
  };

  const userAvatar = getFileUrl(user?.avatarUrl) || `https://ui-avatars.com/api/?name=${user?.fullName || 'U'}&background=3b82f6&color=fff`;

  const [selectedStoryUri, setSelectedStoryUri] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPostingStory, setIsPostingStory] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // Support video too
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedStoryUri(result.assets[0].uri);
      setIsModalVisible(true);
    }
  };

  const postStory = async () => {
    if (!selectedStoryUri) return;
    setIsPostingStory(true);
    try {
      const { url } = await uploadImage(token!, selectedStoryUri);
      await createUserStory(token!, url);
      Alert.alert('Success', 'Your story has been posted!');
      closeStoryModal();
      refetchUserStories();
    } catch (err) {
      console.error('Story post error:', err);
      Alert.alert('Error', 'Failed to upload story');
    } finally {
      setIsPostingStory(false);
    }
  };

  const closeStoryModal = () => {
    setIsModalVisible(false);
    setShowGrid(false);
    // keep image rendered while slide animation completes to prevent unmounting crash on Android
    setTimeout(() => setSelectedStoryUri(null), 400);
  };

  const { data: branches = [], refetch: refetchBranches, isRefetching: isRefetchingBranches } = useQuery({
    queryKey: ['branches', token, activeFilter, userLocation?.coords.latitude, userLocation?.coords.longitude],
    queryFn: () => getBranches(
      token!,
      'OPEN',
      activeFilter,
      undefined,
      userLocation?.coords.latitude,
      userLocation?.coords.longitude
    ),
    enabled: !!token,
  });

  const { data: services = [], refetch: refetchServices, isRefetching: isRefetchingServices } = useQuery({
    queryKey: ['services', token, selectedBranchId, selectedMacId],
    queryFn: () => (selectedBranchId || selectedMacId) ? getServices(token!, selectedBranchId || undefined, selectedMacId || undefined) : Promise.resolve([]),
    enabled: !!token && (!!selectedBranchId || !!selectedMacId),
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchPromos(),
      refetchUserStories(),
      refetchBranches()
    ]);
    setIsRefreshing(false);
  };

  const handleComingSoon = () => Alert.alert('В разработке', 'Этот раздел скоро появится!');

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
            <View style={styles.userTextContainer}>
              <Text style={styles.locationLabel}>{user?.fullName?.toUpperCase() || 'SUPER APP'}</Text>
              <TouchableOpacity style={styles.locationWrapper} onPress={() => router.push('/(tabs)/map' as any)}>
                <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>{address}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerRight}>
            {wallet && (
              <TouchableOpacity style={styles.balancePill} activeOpacity={0.8} onPress={handleComingSoon}>
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

            <TouchableOpacity style={[styles.notificationButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]} onPress={handleComingSoon}>
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              <View style={[styles.notificationBadge, { backgroundColor: colors.primary }]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Specialist Bar */}
        {user?.isSpecialist && (
          <View style={styles.specialistBar}>
            <LinearGradient
              colors={isOnline ? ['#10B981', '#059669'] : ['#475569', '#334155']}
              style={styles.specialistGradient}
            >
              <View style={styles.specialistInfo}>
                <MaterialCommunityIcons name="star-circle" size={20} color="#fff" />
                <Text style={styles.specialistStatusText}>
                  {isOnline ? 'ВЫ В СЕТИ — ПРИНИМАЙТЕ ЗАКАЗЫ' : 'ВЫ ОФФЛАЙН'}
                </Text>
              </View>
              <TouchableOpacity style={styles.onlineSwitch} onPress={toggleOnline}>
                <View style={[styles.switchKnob, isOnline ? { alignSelf: 'flex-end', backgroundColor: '#fff' } : { alignSelf: 'flex-start', backgroundColor: '#94A3B8' }]} />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Search Bar */}
          <View style={styles.searchRow}>
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <Ionicons name="search-outline" size={20} color={colors.primary} />
              <TextInput
                style={[styles.searchPlaceholder, { color: colors.text }]}
                placeholder="Search for gas, washes, or services"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity style={[styles.filterBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="options-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Categories */}
          <View style={styles.categoriesSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
              {CATEGORIES.map((cat, index) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    index === 0 ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    router.push({ pathname: '/(tabs)/map', params: { partnerType: cat.partnerType } } as any);
                  }}
                >
                  <MaterialIcons name={cat.icon as any} size={20} color={index === 0 ? '#fff' : colors.primary} />
                  <Text style={[styles.categoryBtnText, { color: index === 0 ? '#fff' : colors.text }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Prominent On-Demand Services */}
          <View style={styles.featuredServicesRow}>
            <TouchableOpacity
              style={[styles.featuredServiceCard, { backgroundColor: '#10B981' }]}
              onPress={() => router.push({ pathname: '/on-demand-request', params: { type: 'MOBILE_WASH' } } as any)}
            >
              <LinearGradient colors={['rgba(255,255,255,0.2)', 'transparent']} style={styles.cardGlow} />
              <View style={styles.serviceIconCircle}>
                <MaterialCommunityIcons name="car-wash" size={28} color="#10B981" />
              </View>
              <Text style={styles.featuredServiceTitle}>Мойка Домой</Text>
              <Text style={styles.featuredServiceSub}>Выезд на место</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.featuredServiceCard, { backgroundColor: '#F43F5E' }]}
              onPress={() => router.push({ pathname: '/on-demand-request', params: { type: 'EMERGENCY_SERVICE' } } as any)}
            >
              <LinearGradient colors={['rgba(255,255,255,0.2)', 'transparent']} style={styles.cardGlow} />
              <View style={styles.serviceIconCircle}>
                <MaterialCommunityIcons name="wrench" size={28} color="#F43F5E" />
              </View>
              <Text style={styles.featuredServiceTitle}>Вызов мастера</Text>
              <Text style={styles.featuredServiceSub}>Поломка в пути</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Promo Banner (Recommended) */}
          <View style={styles.recommendedSection}>
            <TouchableOpacity style={styles.recommendedCard} activeOpacity={0.9} onPress={() => router.push('/(tabs)/map' as any)}>
              <Image
                source={{ uri: getFileUrl(displayPromos[0]?.imageUrl) || 'https://images.unsplash.com/photo-1542435503-956c469947f6?w=800' }}
                style={styles.recommendedImage}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.recommendedGradient}
              />
              <View style={styles.recommendedContent}>
                <View style={[styles.recommendedBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                </View>
                <Text style={styles.recommendedTitle}>{displayPromos[0]?.title || 'Cheapest fuel nearby'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Stories Section (Integrated as bubble list if needed, but mockup doesn't show them explicitly as top priority) */}
          {/* Preserving stories since user said "stories ... vsyo doyediogo ostav" (leave as is) */}
          <View style={styles.storiesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
              {/* Your Story / Add Story - Instagram Style */}
              <TouchableOpacity
                style={styles.addStoryBtn}
                onPress={() => {
                  if (hasMyStories) {
                    // Mark as seen on open
                    myStories.forEach((s: any) => markStorySeen(s.id));
                    router.push({
                      pathname: '/story-view',
                      params: {
                        stories: JSON.stringify(myStories),
                        initialIndex: '0'
                      }
                    } as any);
                  } else {
                    pickImage();
                  }
                }}
              >
                <View style={[styles.yourStoryWrapper, { width: 72, height: 72 }]}>
                  {hasMyStories && (
                    <LinearGradient
                      colors={allMyStoriesSeen ? ['#334155', '#334155'] : ['#833ab4', '#fd1d1d', '#fcb045']}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 36 }}
                    />
                  )}
                  <View style={[styles.yourStoryAvatarFrame, {
                    borderColor: colors.background,
                    borderWidth: hasMyStories ? 2 : 0,
                    backgroundColor: colors.background,
                  }]}>
                    <View style={{ width: 62, height: 62, borderRadius: 31, overflow: 'hidden' }}>
                      <Image source={{ uri: userAvatar }} style={styles.yourStoryAvatar} />
                    </View>
                  </View>
                  {!hasMyStories && (
                    <View style={[styles.addBadge, { borderColor: colors.background }]}>
                      <Ionicons name="add" size={14} color="#fff" />
                    </View>
                  )}
                </View>
                <Text style={[styles.addStoryText, { color: colors.textSecondary }]}>Your story</Text>
              </TouchableOpacity>

              {otherStories.map((item: any) => (
                <StoryCircle
                  key={item.id}
                  item={{
                    id: item.id,
                    name: item.displayName || item.title || item.userName,
                    image: item.type === 'USER' && item.userAvatarUrl
                      ? getFileUrl(item.userAvatarUrl)!
                      : (getFileUrl(item.imageUrl) || 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=200'),
                    seen: seenStories.includes(item.id),
                    type: item.type
                  }}
                  onPress={() => {
                    markStorySeen(item.id);
                    router.push({
                      pathname: '/story-view',
                      params: {
                        stories: JSON.stringify(otherStories),
                        initialIndex: otherStories.indexOf(item).toString()
                      }
                    } as any);
                  }}
                />
              ))}
            </ScrollView>
          </View>

          {/* Quick Actions */}
          <QuickActions />

          {/* Places Section */}
          <View style={styles.placesSection}>
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Nearby</Text>
              <TouchableOpacity onPress={handleComingSoon}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>

            <FilterPills activeFilter={activeFilter} onChangeFilter={setActiveFilter} />

            <View style={styles.placesList}>
              {branches.map((branch: any, idx: number) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  index={idx}
                  onPress={() => router.push(`/branch/${branch.id}` as any)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Floating Action Button for quick story upload */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={pickImage}
        activeOpacity={0.8}
      >
        <Ionicons name="camera" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} transparent={false} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1, position: 'relative' }}>
              <Image
                source={{ uri: selectedStoryUri || undefined }}
                style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
              />

              {/* Grid Overlay */}
              {showGrid && (
                <View style={{ ...StyleSheet.absoluteFillObject, pointerEvents: 'none' }}>
                  <View style={{ position: 'absolute', top: '33.3%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                  <View style={{ position: 'absolute', top: '66.6%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                  <View style={{ position: 'absolute', left: '33.3%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                  <View style={{ position: 'absolute', left: '66.6%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                </View>
              )}
            </View>

            {/* Header Overlay */}
            <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={closeStoryModal}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => setShowGrid(!showGrid)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="grid-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="crop-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="text" size={20} color="#fff" />
                  </View>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="happy-outline" size={24} color="#fff" />
                  </View>
                </View>
              </View>
            </SafeAreaView>

            {/* Filters/Modes Bar (Bottom-middle) */}
            <View style={{ position: 'absolute', bottom: 120, left: 0, right: 0 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: width / 2 - 25, gap: 15 }}>
                {['Normal', 'Retro', 'B&W', 'Vibrant', 'Warm', 'Cold'].map((filter, i) => (
                  <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                    <View style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      borderWidth: i === 0 ? 3 : 1,
                      borderColor: i === 0 ? '#3b82f6' : '#fff',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      overflow: 'hidden'
                    }}>
                      <Image source={{ uri: selectedStoryUri || undefined }} style={{ width: '100%', height: '100%', opacity: 0.6 }} blurRadius={i * 2} />
                    </View>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{filter}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Footer Overlay */}
            <SafeAreaView style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              <View style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 40 : 20 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 25,
                    gap: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)'
                  }}
                  onPress={postStory}
                  disabled={isPostingStory}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#fff' }}>
                    <Image source={{ uri: userAvatar }} style={{ width: '100%', height: '100%' }} />
                  </View>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Your story</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#fff',
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 25,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onPress={postStory}
                  disabled={isPostingStory}
                >
                  {isPostingStory ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <>
                      <Text style={{ color: '#000', fontSize: 14, fontWeight: '700' }}>Share</Text>
                      <Ionicons name="send" size={16} color="#000" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </View>
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
    gap: 10,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userTextContainer: {
    justifyContent: 'center',
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#fff',
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
  specialistBar: {
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  specialistGradient: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  specialistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  specialistStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  onlineSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 3,
    justifyContent: 'center',
  },
  switchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
