import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme, Platform, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getMe, getFileUrl, uploadImage, updateProfile } from '@/lib/api';
import Colors from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

function ProfileMenuItem({ icon, label, onPress, colors, isLast = false, isDestructive = false }: any) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: colors.card, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: isDestructive ? '#FEE2E2' : colors.background }]}>
        <Ionicons name={icon} size={20} color={isDestructive ? '#EF4444' : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: isDestructive ? '#EF4444' : colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { token, logout } = useAuth();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const changeLanguage = async (newLang: string) => {
    await i18n.changeLanguage(newLang);
    await AsyncStorage.setItem('app_lang', newLang);
  };

  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ['me', token],
    queryFn: () => getMe(token!),
    enabled: !!token,
  });

  const [buster, setBuster] = React.useState(Date.now());

  const mutation = useMutation({
    mutationFn: (newAvatarUrl: string) => updateProfile(token!, { avatarUrl: newAvatarUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setBuster(Date.now());
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        const { url } = await uploadImage(token!, result.assets[0].uri);
        mutation.mutate(url);
      } catch (error) {
        console.error('Failed to upload avatar:', error);
        alert('Failed to upload image');
      }
    }
  };

  const handleLogout = () => {
    logout().then(() => router.replace('/login' as any));
  };

  const rawAvatar = getFileUrl(user?.avatarUrl);
  const userAvatar = rawAvatar ? `${rawAvatar}${rawAvatar.includes('?') ? '&' : '?'}t=${buster}` : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage}>
            <View style={styles.avatarMain}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitial}>
                  {(user?.fullName || 'U').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <View style={styles.nameSection}>
            <Text style={styles.userName}>{user?.fullName || 'Specialist'}</Text>
            <TouchableOpacity style={styles.inviteBtn}>
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.inviteBtnText}>Invite a friend</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KPI Grid (Pro Style) */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>5.0</Text>
            <Text style={styles.kpiLabel}>Rating</Text>
            <Ionicons name="star" size={24} color="#F59E0B" style={styles.kpiIcon} />
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>—</Text>
            <Text style={styles.kpiLabel}>Level</Text>
            <Ionicons name="ribbon" size={24} color="#3B82F6" style={styles.kpiIcon} />
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>+30</Text>
            <Text style={styles.kpiLabel}>Priority</Text>
            <View style={styles.priorityPoint}>
              <Ionicons name="flash" size={14} color="#000" />
            </View>
          </View>
        </View>


        {/* Stats Section */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>12</Text>
            <Text style={styles.statLabel}>{t('orders')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>350</Text>
            <Text style={styles.statLabel}>{t('points')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>4.9</Text>
            <Text style={styles.statLabel}>{t('rating')}</Text>
          </View>
        </View>

        {/* Language Picker */}
        <View style={styles.languageContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LANGUAGE / TILL</Text>
          <View style={styles.langRow}>
            {(['uz', 'ru', 'en', 'tr']).map((l) => (
              <TouchableOpacity
                key={l}
                style={[
                  styles.langBtn,
                  { backgroundColor: lang === l ? colors.primary : colors.card, borderColor: colors.border }
                ]}
                onPress={() => changeLanguage(l)}
              >
                <Text style={[styles.langText, { color: lang === l ? '#fff' : colors.text }]}>
                  {l === 'uz' ? 'O\'zbek' : l === 'ru' ? 'Русский' : l === 'en' ? 'English' : 'Türkçe'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuWrapper}>
          <ProfileMenuItem
            icon="car-outline"
            label="My vehicles"
            onPress={() => { }}
            colors={colors}
          />
          <ProfileMenuItem
            icon="construct-outline"
            label="Troubleshooting"
            onPress={() => { }}
            colors={colors}
          />
          <ProfileMenuItem
            icon="camera-outline"
            label="Photo check"
            onPress={() => { }}
            colors={colors}
          />
          <ProfileMenuItem
            icon="options-outline"
            label="Settings"
            onPress={() => { }}
            colors={colors}
          />
          <ProfileMenuItem
            icon="log-out-outline"
            label={t('logout')}
            onPress={handleLogout}
            colors={colors}
            isLast={true}
            isDestructive={true}
          />
        </View>

        <Text style={styles.versionText}>Version 1.0.4 (2024)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContent: { paddingBottom: 120, paddingTop: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 20
  },
  avatarWrapper: { position: 'relative' },
  avatarMain: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { color: '#F8FAFC', fontSize: 24, fontWeight: '800' },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1E293B',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#020617'
  },
  nameSection: { flex: 1, gap: 8 },
  userName: { fontSize: 28, fontWeight: '800', color: '#F8FAFC' },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  inviteBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  kpiGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 32
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    minHeight: 120,
    justifyContent: 'center'
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#F8FAFC' },
  kpiLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 4 },
  kpiIcon: { position: 'absolute', bottom: 12, right: 12, opacity: 0.8 },
  priorityPoint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FACC15',
    justifyContent: 'center',
    alignItems: 'center'
  },

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  statBox: { flex: 1, padding: 16, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 },

  menuWrapper: { flex: 1, gap: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuLabel: { flex: 1, fontSize: 17, fontWeight: '600' },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#334155',
    marginTop: 40,
    fontWeight: '600'
  },
  languageContainer: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '800', marginBottom: 10, letterSpacing: 1 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  langText: { fontSize: 14, fontWeight: '700' },
});
