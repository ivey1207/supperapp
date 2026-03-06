import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Platform, Dimensions, StatusBar, useColorScheme, Alert, TextInput, Modal, ActivityIndicator } from 'react-native';
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
import { useEffect } from 'react';
import { getMe } from '@/lib/api';
import * as Location from 'expo-location';

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
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

  const { data: user } = useQuery({
    queryKey: ['me', token],
    queryFn: () => getMe(token!),
    enabled: !!token,
  });

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
      if (status !== 'granted') return;
      try {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
      } catch (e) {
        console.log('Error getting location on home:', e);
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
  const finalStories = combinedStories.length > 0 ? combinedStories : MOCK_STORIES.map(s => ({ ...s, type: 'MOCK', displayName: s.title }));

  const [selectedStoryUri, setSelectedStoryUri] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPostingStory, setIsPostingStory] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  const onRefresh = () => { };
  const isRefreshing = false;

  const handleComingSoon = () => Alert.alert('В разработке', 'Этот раздел скоро появится!');

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfoRow}>
            <TouchableOpacity style={[styles.profileBadge, { borderColor: colors.border }]} onPress={() => router.push('/(tabs)/profile' as any)}>
              <Image
                source={{ uri: `https://ui-avatars.com/api/?name=${user?.fullName || 'U'}&background=3b82f6&color=fff` }}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <View style={styles.userTextContainer}>
              <Text style={styles.locationLabel}>LOCATION</Text>
              <TouchableOpacity style={styles.locationWrapper} onPress={handleComingSoon}>
                <Text style={[styles.locationText, { color: colors.text }]}>Downtown, SF</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={[styles.notificationButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]} onPress={handleComingSoon}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            <View style={[styles.notificationBadge, { backgroundColor: colors.primary }]} />
          </TouchableOpacity>
        </View>

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
            <TouchableOpacity style={styles.recommendedCard} activeOpacity={0.9} onPress={handleComingSoon}>
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
              {/* Add Story Button - More Prominent Style */}
              <TouchableOpacity style={styles.addStoryBtn} onPress={pickImage}>
                <LinearGradient
                  colors={['#3b82f6', '#8b5cf6', '#f43f5e']}
                  style={styles.addStoryGradient}
                >
                  <View style={[styles.addStoryInner, { backgroundColor: colors.background }]}>
                    <Ionicons name="add" size={32} color={colors.primary} />
                  </View>
                </LinearGradient>
                <Text style={[styles.addStoryText, { color: colors.textSecondary }]}>Add Story</Text>
              </TouchableOpacity>

              {finalStories.map((item: any) => (
                <StoryCircle
                  key={item.id}
                  item={{
                    id: item.id,
                    name: item.displayName || item.title,
                    image: getFileUrl(item.imageUrl) || 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=200'
                  }}
                  onPress={() => {
                    router.push({
                      pathname: '/story-view',
                      params: {
                        stories: JSON.stringify(finalStories),
                        initialIndex: finalStories.indexOf(item).toString()
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

      {/* Story Preview Modal */}
      <Modal visible={isModalVisible} transparent={false} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' }}>
              <TouchableOpacity onPress={closeStoryModal}>
                <Ionicons name="close" size={30} color="#fff" />
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>New Story</Text>
              <View style={{ width: 30 }} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Image source={{ uri: selectedStoryUri || undefined }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
            </View>
            <View style={{ padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 }}>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                onPress={postStory}
                disabled={isPostingStory}
              >
                {isPostingStory ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>Publish Story</Text>
                    <Ionicons name="send" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  storiesContainer: { marginTop: 24, marginBottom: 12 },
  storiesScroll: { paddingHorizontal: 20, gap: 12 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12
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
    gap: 8,
    marginRight: 8,
  },
  addStoryGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStoryInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
