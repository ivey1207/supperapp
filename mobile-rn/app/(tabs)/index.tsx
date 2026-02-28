import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Platform, Dimensions, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getBranches, getPromotions, getServices, Promotion } from '@/lib/api';
import Colors from '@/constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import QuickActions from '@/components/QuickActions';
import FilterPills from '@/components/FilterPills';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

const { width } = Dimensions.get('window');
const dark = Colors.dark;

const CATEGORIES = [
  { id: 1, name: 'Автомойка', icon: 'local-car-wash', color: '#3b82f6', image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400' },
  { id: 2, name: 'АЗС', icon: 'local-gas-station', color: '#10b981', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
  { id: 3, name: 'Тюнинг', icon: 'build', color: '#f59e0b', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400' },
  { id: 4, name: 'Шины', icon: 'settings-input-component', color: '#8b5cf6', image: 'https://images.unsplash.com/photo-1606577924006-27d39b132ae2?w=400' },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedMacId, setSelectedMacId] = useState<string | null>(null);
  const user = { fullName: 'Пользователь' };

  useEffect(() => {
    if (params.branchId) {
      setSelectedBranchId(params.branchId as string);
    }
    if (params.macId) {
      setSelectedMacId(params.macId as string);
    }
  }, [params.branchId, params.macId]);

  const { data: promotions = [], refetch: refetchPromos, isRefetching: isRefetchingPromos } = useQuery({
    queryKey: ['promotions', token, selectedBranchId],
    queryFn: () => getPromotions(token!, selectedBranchId || undefined),
    enabled: !!token,
  });

  const { data: branches = [], refetch: refetchBranches, isRefetching: isRefetchingBranches } = useQuery({
    queryKey: ['branches', token],
    queryFn: () => getBranches(token!, 'OPEN'),
    enabled: !!token,
  });

  const { data: services = [], refetch: refetchServices, isRefetching: isRefetchingServices } = useQuery({
    queryKey: ['services', token, selectedBranchId, selectedMacId],
    queryFn: () => (selectedBranchId || selectedMacId) ? getServices(token!, selectedBranchId || undefined, selectedMacId || undefined) : Promise.resolve([]),
    enabled: !!token && (!!selectedBranchId || !!selectedMacId),
  });

  const onRefresh = () => { };

  const isRefreshing = false;

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Привет, {user?.fullName?.split(' ')[0] || 'Пользователь'}</Text>
            <View style={styles.locationWrapper}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={[styles.locationText, { color: colors.text }]}>Ташкент, Узбекистан</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </View>
          </View>
          <TouchableOpacity style={[styles.profileBadge, { borderColor: colors.border }]}>
            <Image
              source={{ uri: `https://ui-avatars.com/api/?name=${user?.fullName || 'U'}&background=3b82f6&color=fff` }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={dark.primary} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Search Bar */}
          <View style={styles.searchRow}>
            <TouchableOpacity style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.9}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>Поиск услуг</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.qrButton}
              activeOpacity={0.8}
              onPress={() => router.push('/scanner')}
            >
              <Ionicons name="qr-code-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Hero Promo Banner */}
          {promotions.length > 0 && (
            <View style={styles.promoSection}>
              {/* Main Hero Banner */}
              <TouchableOpacity style={styles.heroBanner} activeOpacity={0.9}>
                <LinearGradient
                  colors={['#ef4444', '#fbbf24']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroGradient}
                >
                  <View style={styles.heroContent}>
                    <View style={styles.heroTextBlock}>
                      <Text style={styles.heroTitle}>GET 14000 SUM OFF</Text>
                      <Text style={styles.heroSubtitle}>WEMISSYOU</Text>
                    </View>
                    <Image
                      source={{ uri: promotions[0]?.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' }}
                      style={styles.heroImage}
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Secondary Promos */}
              {promotions.length > 1 && (
                <>
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>Специально для вас</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.promoList}
                  >
                    {promotions.slice(1).map((promo) => (
                      <TouchableOpacity key={promo.id} style={styles.promoCard} activeOpacity={0.9}>
                        <Image source={{ uri: promo.imageUrl || 'https://images.unsplash.com/photo-1542435503-956c469947f6?w=600' }} style={styles.promoImage} />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.85)']}
                          style={styles.promoGradient}
                        />
                        <View style={styles.promoContent}>
                          <View style={styles.promoBadge}>
                            <Text style={styles.promoBadgeText}>{promo.discountValue}</Text>
                          </View>
                          <Text style={styles.promoTitle}>{promo.title}</Text>
                          <Text style={styles.promoDesc} numberOfLines={1}>{promo.description}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <QuickActions />

          {/* Categories Horizontal Scroll */}
          <View style={styles.categoriesSection}>
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Категории</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat.id} style={styles.categoryItem} activeOpacity={0.8}>
                  <View style={[styles.categoryCircle, { backgroundColor: cat.color }]}>
                    <MaterialIcons name={cat.icon as any} size={28} color="#fff" />
                  </View>
                  <Text style={[styles.categoryName, { color: colors.textSecondary }]} numberOfLines={1}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Places Section */}
          <View style={styles.placesSection}>
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Рядом с вами</Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Все</Text>
              </TouchableOpacity>
            </View>


            {/* Filters */}
            <FilterPills />

            <View style={styles.placesList}>
              {branches.map((branch: any, idx: number) => (
                <TouchableOpacity key={branch.id} style={[styles.branchCard, { backgroundColor: colors.card }]} activeOpacity={0.9}>
                  <View style={styles.branchImageContainer}>
                    <Image
                      source={{ uri: branch.images?.[0] || CATEGORIES[idx % 4].image }}
                      style={styles.branchImage}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.7)']}
                      style={styles.branchGradient}
                    />
                    <View style={styles.branchBadgesTop}>
                      {idx % 3 === 0 && (
                        <View style={styles.discountBadgeLarge}>
                          <Text style={styles.discountBadgeText}>-50%</Text>
                        </View>
                      )}
                      <View style={styles.deliveryBadgeLarge}>
                        <Ionicons name="time" size={12} color="#fff" />
                        <Text style={styles.deliveryText}>20-30 мин</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.branchContent}>
                    <View style={styles.branchHeader}>
                      <Text style={[styles.branchName, { color: colors.text }]}>{branch.name}</Text>
                      <View style={[styles.ratingContainer, { backgroundColor: colorScheme === 'dark' ? '#334155' : '#f1f5f9' }]}>
                        <FontAwesome name="star" size={12} color="#fbbf24" />
                        <Text style={[styles.ratingText, { color: colors.text }]}>4.{8 - (idx % 3)} (200+)</Text>
                      </View>
                    </View>
                    <Text style={[styles.branchMeta, { color: colors.textSecondary }]}>
                      {idx % 2 === 0 ? '$$ • Автомойка • 1.2 км' : '$$$ • Детейлинг • 3.5 км'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0f172a' },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  greeting: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  locationWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationText: { fontSize: 16, fontWeight: '700', marginHorizontal: 4 },
  profileBadge: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1.5 },
  avatar: { width: '100%', height: '100%' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  qrButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  searchPlaceholder: { flex: 1, fontSize: 15, marginLeft: 10 },

  promoSection: { marginTop: 24 },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16
  },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  seeAll: { fontWeight: '700', fontSize: 14 },

  // Hero Banner
  heroBanner: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    height: 160,
  },
  heroGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextBlock: { flex: 1 },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 1,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1f2937',
    backgroundColor: '#fbbf24',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroImage: {
    width: 140,
    height: 140,
    borderRadius: 20,
    marginLeft: 16,
  },

  promoList: { paddingHorizontal: 20, gap: 16 },
  promoCard: { width: width * 0.85, height: 180, borderRadius: 24, overflow: 'hidden' },
  promoImage: { width: '100%', height: '100%' },
  promoGradient: { ...StyleSheet.absoluteFillObject },
  promoContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  promoBadge: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 8
  },
  promoBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  promoTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  promoDesc: { color: '#cbd5e1', fontSize: 14, marginTop: 4 },

  categoriesSection: { marginTop: 24 },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  categoryItem: {
    alignItems: 'center',
    width: 72,
  },
  categoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  categoryName: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  placesSection: { marginTop: 32 },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1e293b'
  },
  activeTab: { backgroundColor: '#3b82f6' },
  tabText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  activeTabText: { color: '#fff' },

  placesList: {
    paddingHorizontal: 20,
    gap: 20,
    paddingBottom: 40,
  },
  branchCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 4,
  },
  branchImageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  branchImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  branchGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  branchBadgesTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  discountBadgeLarge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deliveryBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  deliveryText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  branchContent: {
    padding: 16,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  branchName: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  branchMeta: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  discountBadgeText: {
    color: '#064e3b',
    fontSize: 11,
    fontWeight: '700',
  },

  // Old styles (keeping only what's necessary or removing duplicates)
  // placesList removed (duplicate)
  placeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155'
  },
  placeImage: { width: '100%', height: 200 },
  placeRating: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  // ratingText removed (duplicate)
  placeInfo: { padding: 16 },
  placeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  placeName: { fontSize: 18, fontWeight: '800', color: '#f8fafc' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  placeAddress: { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  placeMeta: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  metaDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#334155', marginHorizontal: 12 },
});
