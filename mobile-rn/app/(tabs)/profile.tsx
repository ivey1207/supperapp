import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { getMe } from '@/lib/api';
import Colors from '@/constants/Colors';

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

  const { data: user } = useQuery({
    queryKey: ['me', token],
    queryFn: () => getMe(token!),
    enabled: !!token,
  });

  const handleLogout = () => {
    logout().then(() => router.replace('/login' as any));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user?.fullName || user?.phone || 'U').charAt(0).toUpperCase()}
            </Text>
            <TouchableOpacity style={[styles.editAvatarBtn, { backgroundColor: colors.primary, borderColor: colors.background }]}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>{user?.fullName || 'John Doe'}</Text>
          <Text style={[styles.userPhone, { color: colors.textSecondary }]}>{user?.phone || '+998 90 123 45 67'}</Text>

          {user?.carModel && (
            <View style={[styles.carBadge, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <Ionicons name="car" size={14} color={colors.primary} />
              <Text style={[styles.carModelText, { color: colors.textSecondary }]}>{user.carModel}</Text>
            </View>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>12</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>350</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>4.9</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Menu Section */}
        <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
          <ProfileMenuItem
            icon="person-outline"
            label="Edit Profile"
            onPress={() => router.push('/profile-edit' as never)}
            colors={colors}
          />
          <ProfileMenuItem
            icon="wallet-outline"
            label="Wallet & Payments"
            onPress={() => router.push('/wallet' as never)}
            colors={colors}
          />
          <ProfileMenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => { }}
            colors={colors}
          />
          <ProfileMenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => router.push('/support' as never)}
            colors={colors}
          />
          <ProfileMenuItem
            icon="log-out-outline"
            label="Log Out"
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
  container: { flex: 1 },
  scrollContent: { paddingBottom: 120, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: { width: 100, height: 100, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, position: 'relative' },
  avatarText: { fontSize: 40, fontWeight: '900' },
  editAvatarBtn: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#3B82F6', width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  userName: { fontSize: 24, fontWeight: '800', marginTop: 20 },
  userPhone: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  carBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 12 },
  carModelText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  statBox: { flex: 1, padding: 16, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 },
  menuContainer: { marginHorizontal: 20, borderRadius: 32, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '700' },
  versionText: { textAlign: 'center', fontSize: 12, color: '#CBD5E1', marginTop: 24, fontWeight: '600' },
});
